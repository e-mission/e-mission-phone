import { Form } from 'enketo-core';
import { transform } from 'enketo-transformer/web';
import { XMLParser } from 'fast-xml-parser';
import i18next from 'i18next';
import MessageFormat from '@messageformat/core';
import { logDebug, logInfo } from '../../plugin/logger';
import { getConfig } from '../../config/dynamicConfig';
import { DateTime } from 'luxon';
import { fetchUrlCached } from '../../services/commHelper';
import { getUnifiedDataForInterval } from '../../services/unifiedDataLoader';
import { AppConfig, EnketoSurveyConfig } from '../../types/appConfigTypes';
import { CompositeTrip, ConfirmedPlace, TimelineEntry } from '../../types/diaryTypes';

export type PrefillFields = { [key: string]: string };

export type SurveyOptions = {
  undismissable?: boolean;
  timelineEntry?: any;
  prefilledSurveyResponse?: string;
  prefillFields?: PrefillFields;
  dataKey?: string;
};

type EnketoResponseData = {
  label: string; //display label (this value is use for displaying on the button)
  ts: string; //the timestamp at which the survey was filled out (in seconds)
  fmt_time: string; //the formatted timestamp at which the survey was filled out
  name: string; //survey name
  version: string; //survey version
  xmlResponse: string; //survey response as XML string
  jsonDocResponse: string; //survey response as JSON object
};

type EnketoResponse = {
  data: EnketoResponseData; //survey response data
  metadata: any;
};

const LABEL_FUNCTIONS = {
  UseLabelTemplate: async (xmlDoc: XMLDocument, name: string) => {
    let appConfig = await getConfig();
    const configSurveys = appConfig.survey_info.surveys;

    const config = configSurveys[name]; // config for this survey
    const lang = i18next.language;
    const labelTemplate = config.labelTemplate?.[lang];

    if (!labelTemplate) return 'Answered'; // no template given in config
    if (!config.labelVars) return labelTemplate; // if no vars given, nothing to interpolate,
    // so we return the unaltered template

    // gather vars that will be interpolated into the template according to the survey config
    const labelVars = {};
    for (let lblVar in config.labelVars) {
      const fieldName = config.labelVars[lblVar].key;
      let fieldStr: string | null = _getAnswerByTagName(xmlDoc, fieldName);
      if (fieldStr == '<null>') fieldStr = null;
      if (config.labelVars[lblVar].type == 'length') {
        const fieldMatches = fieldStr?.split(' ');
        labelVars[lblVar] = fieldMatches?.length || 0;
      } else {
        throw new Error(`labelVar type ${config.labelVars[lblVar].type} is not supported!`);
      }
    }

    // use MessageFormat interpolate the label template with the label vars
    const mf = new MessageFormat(lang);
    const label = mf.compile(labelTemplate)(labelVars);
    return label.replace(/^[ ,]+|[ ,]+$/g, ''); // trim leading and trailing spaces and commas
  },
};

/**
 * _getAnswerByTagName look up how a question was answered, given the survey response
 *   and the tag name of the question
 * @param {XMLDocument} xmlDoc survey response as XML object
 * @param {string} tagName tag name of the question
 * @returns {string} answer string. If not found, return "\<null\>"
 */
function _getAnswerByTagName(xmlDoc: XMLDocument, tagName: string) {
  const vals = xmlDoc.getElementsByTagName(tagName);
  const val = vals.length ? vals[0].innerHTML : null;
  if (!val) return '<null>';
  return val;
}

/** @type {EnketoSurveyConfig} _config */
let _config: EnketoSurveyConfig;

/**
 * filterByNameAndVersion filter the survey responses by survey name and their version.
 * The version for filtering is specified in enketo survey `compatibleWith` config.
 * The survey version of the response must be greater than or equal to `compatibleWith` to be included.
 * @param {string} name survey name (defined in enketo survey config)
 * @param {EnketoResponse[]} responses An array of previously recorded responses to Enketo surveys
 *  (presumably having been retrieved from unifiedDataLoader)
 * @return {Promise<EnketoResponse[]>} filtered survey responses
 */
export function filterByNameAndVersion(name: string, responses: EnketoResponse[]) {
  return getConfig().then((config) =>
    responses.filter(
      (r) =>
        r.data.name === name && r.data.version >= config.survey_info.surveys[name].compatibleWith,
    ),
  );
}

/**
 * resolve a label for the survey response
 * @param {string} name survey name
 * @param {XMLDocument} xmlDoc survey response as XML object
 * @returns {Promise<string>} label string Promise
 */
export async function resolveLabel(name: string, xmlDoc: XMLDocument) {
  // Some studies may want a custom label function for their survey.
  // Those can be added in LABEL_FUNCTIONS with the survey name as the key.
  // Otherwise, UseLabelTemplate will create a label using the template in the config
  if (LABEL_FUNCTIONS[name]) return await LABEL_FUNCTIONS[name](xmlDoc);
  return await LABEL_FUNCTIONS.UseLabelTemplate(xmlDoc, name);
}

/**
 * @param xmlModel the blank XML model to be prefilled
 * @param prefillFields an object with keys that are the XML tag names and values that are the values to be prefilled
 * @returns serialized XML of the prefilled model response
 */
function getXmlWithPrefills(xmlModel: string, prefillFields: PrefillFields) {
  if (!prefillFields) return null;
  const xmlParser = new DOMParser();
  const xmlDoc = xmlParser.parseFromString(xmlModel, 'text/xml');

  for (const [tagName, value] of Object.entries(prefillFields)) {
    const vals = xmlDoc.getElementsByTagName(tagName);
    vals[0].innerHTML = value;
  }
  const instance = xmlDoc.getElementsByTagName('instance')[0].children[0];
  return new XMLSerializer().serializeToString(instance);
}

/**
 * @param xmlModel the blank XML model response for the survey
 * @param opts object with options like 'prefilledSurveyResponse' or 'prefillFields'
 * @returns XML string of an existing or prefilled model response, or null if no response is available
 */
export function getInstanceStr(xmlModel: string, opts?: SurveyOptions): string | null {
  if (!xmlModel) return null;
  if (opts?.prefilledSurveyResponse) return opts.prefilledSurveyResponse;
  if (opts?.prefillFields) return getXmlWithPrefills(xmlModel, opts.prefillFields);
  return null;
}

/**
 * resolve timestamps label from the survey response
 * @param {XMLDocument} xmlDoc survey response as XML object
 * @param {object} timelineEntry trip or place object
 * @returns {object} object with `start_ts` and `end_ts`
 *    - null if no timestamps are resolved
 *    - undefined if the timestamps are invalid
 */
export function resolveTimestamps(xmlDoc: XMLDocument, timelineEntry: TimelineEntry) {
  // check for Date and Time fields
  const startDate = xmlDoc.getElementsByTagName('Start_date')?.[0]?.innerHTML;
  let startTime = xmlDoc.getElementsByTagName('Start_time')?.[0]?.innerHTML;
  const endDate = xmlDoc.getElementsByTagName('End_date')?.[0]?.innerHTML;
  let endTime = xmlDoc.getElementsByTagName('End_time')?.[0]?.innerHTML;

  // if any of the fields are missing, return null
  if (!startDate || !startTime || !endDate || !endTime) return null;

  const timezone =
    (timelineEntry as CompositeTrip).start_local_dt?.timezone ||
    (timelineEntry as ConfirmedPlace).enter_local_dt?.timezone ||
    (timelineEntry as CompositeTrip).end_local_dt?.timezone ||
    (timelineEntry as ConfirmedPlace).exit_local_dt?.timezone;
  // split by + or - to get time without offset
  startTime = startTime.split(/\-|\+/)[0];
  endTime = endTime.split(/\-|\+/)[0];

  let additionStartTs = DateTime.fromISO(startDate + 'T' + startTime, {
    zone: timezone,
  }).toSeconds();
  let additionEndTs = DateTime.fromISO(endDate + 'T' + endTime, { zone: timezone }).toSeconds();

  if (additionStartTs > additionEndTs) {
    return undefined; // if the start time is after the end time, this is an invalid response
  }

  /* Enketo survey time inputs are only precise to the minute, while trips/places are precise to
    the millisecond. To avoid precision issues, we will check if the start/end timestamps from
    the survey response are within the same minute as the start/end or enter/exit timestamps.
    If so, we will use the exact trip/place timestamps */
  const entryStartTs =
    (timelineEntry as CompositeTrip).start_ts || (timelineEntry as ConfirmedPlace).enter_ts;
  const entryEndTs =
    (timelineEntry as CompositeTrip).end_ts || (timelineEntry as ConfirmedPlace).exit_ts;
  if (additionStartTs - (additionStartTs % 60) == entryStartTs - (entryStartTs % 60))
    additionStartTs = entryStartTs;
  if (additionEndTs - (additionEndTs % 60) == entryEndTs - (entryEndTs % 60))
    additionEndTs = entryEndTs;

  // return unix timestamps in seconds
  return {
    start_ts: additionStartTs,
    end_ts: additionEndTs,
  };
}

/**
 * @param surveyName the name of the survey (e.g. "TimeUseSurvey")
 * @param enketoForm the Form object from enketo-core that contains this survey
 * @param appConfig the dynamic config file for the app
 * @param opts object with SurveyOptions like 'timelineEntry' or 'dataKey'
 * @returns Promise of the saved result, or an Error if there was a problem
 */
export function saveResponse(
  surveyName: string,
  enketoForm: Form,
  appConfig: AppConfig,
  opts?: SurveyOptions,
) {
  const xmlParser = new window.DOMParser();
  const xmlResponse = enketoForm.getDataStr();
  const xmlDoc = xmlParser.parseFromString(xmlResponse, 'text/xml');
  const xml2js = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: 'attr' });
  const jsonDocResponse = xml2js.parse(xmlResponse);
  return resolveLabel(surveyName, xmlDoc)
    .then((rsLabel) => {
      const data: any = {
        label: rsLabel,
        name: surveyName,
        version: appConfig.survey_info.surveys[surveyName].version,
        xmlResponse,
        jsonDocResponse,
      };
      if (opts?.timelineEntry) {
        let timestamps = resolveTimestamps(xmlDoc, opts.timelineEntry);
        if (timestamps === undefined) {
          // timestamps were resolved, but they are invalid
          return new Error(i18next.t('survey.enketo-timestamps-invalid')); //"Timestamps are invalid. Please ensure that the start time is before the end time.");
        }
        // if timestamps were not resolved from the survey, we will use the trip or place timestamps
        data.start_ts = timestamps?.start_ts || opts.timelineEntry.enter_ts;
        data.end_ts = timestamps?.end_ts || opts.timelineEntry.exit_ts;
        // UUID generated using this method https://stackoverflow.com/a/66332305
        data.match_id = URL.createObjectURL(new Blob([])).slice(-36);
      } else {
        const now = Date.now();
        data.ts = now / 1000; // convert to seconds to be consistent with the server
        data.fmt_time = new Date(now);
      }
      // use dataKey passed into opts if available, otherwise get it from the config
      const dataKey = opts?.dataKey || appConfig.survey_info.surveys[surveyName].dataKey;
      return window['cordova'].plugins.BEMUserCache.putMessage(dataKey, data).then(() => data);
    })
    .then((data) => data);
}

const _getMostRecent = (responses) => {
  responses.sort((a, b) => a.metadata.write_ts < b.metadata.write_ts);
  logDebug(`_getMostRecent: first response is ${responses[0]}; 
                            last response is ${responses.slice(-1)[0]}`);
  return responses[0];
};

/*
 * We retrieve all the records every time instead of caching because of the
 * usage pattern. We assume that the demographic survey is edited fairly
 * rarely, so loading it every time will likely do a bunch of unnecessary work.
 * Loading it on demand seems like the way to go. If we choose to experiment
 * with incremental updates, we may want to revisit this.
 */
export function loadPreviousResponseForSurvey(dataKey: string) {
  const tq = window['cordova'].plugins.BEMUserCache.getAllTimeQuery();
  logDebug('loadPreviousResponseForSurvey: dataKey = ' + dataKey + '; tq = ' + tq);
  const getMethod = window['cordova'].plugins.BEMUserCache.getSensorDataForInterval;
  return getUnifiedDataForInterval(dataKey, tq, getMethod).then((responses) =>
    _getMostRecent(responses),
  );
}

export async function fetchSurvey(url: string) {
  const responseText = await fetchUrlCached(url);
  try {
    return JSON.parse(responseText);
  } catch (e) {
    logDebug(`${e.name}: Survey was not in JSON format. Attempting to transform XML -> JSON...`);
    return await transform({ xform: responseText });
  }
}
