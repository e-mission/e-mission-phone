import { getAngularService } from "../../angular-react-helper";
import { Form } from 'enketo-core';
import { XMLParser } from 'fast-xml-parser';
import i18next from 'i18next';
import { logDebug } from "../../plugin/logger";

export type PrefillFields = {[key: string]: string};

export type SurveyOptions = {
  undismissable?: boolean;
  timelineEntry?: any;
  prefilledSurveyResponse?: string;
  prefillFields?: PrefillFields;
  dataKey?: string;
};

/**
 * @param xmlModel the blank XML model to be prefilled
 * @param prefillFields an object with keys that are the XML tag names and values that are the values to be prefilled
 * @returns serialized XML of the prefilled model response
 */
function getXmlWithPrefills(xmlModel: string, prefillFields: PrefillFields) {
  if (!prefillFields) return null;
  const xmlParser = new window.DOMParser();
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
export function getInstanceStr(xmlModel: string, opts: SurveyOptions): string|null {
  if (!xmlModel) return null;
  if (opts.prefilledSurveyResponse)
    return opts.prefilledSurveyResponse;
  if (opts.prefillFields) 
    return getXmlWithPrefills(xmlModel, opts.prefillFields);
  return null;
}

/**
 * @param surveyName the name of the survey (e.g. "TimeUseSurvey")
 * @param enketoForm the Form object from enketo-core that contains this survey
 * @param appConfig the dynamic config file for the app
 * @param opts object with SurveyOptions like 'timelineEntry' or 'dataKey'
 * @returns Promise of the saved result, or an Error if there was a problem
 */
export function saveResponse(surveyName: string, enketoForm: Form, appConfig, opts: SurveyOptions) {
  const EnketoSurveyAnswer = getAngularService('EnketoSurveyAnswer');
  const xmlParser = new window.DOMParser();
  const xmlResponse = enketoForm.getDataStr();
  const xmlDoc = xmlParser.parseFromString(xmlResponse, 'text/xml');
  const xml2js = new XMLParser({ignoreAttributes: false, attributeNamePrefix: 'attr'});
  const jsonDocResponse = xml2js.parse(xmlResponse);
  return EnketoSurveyAnswer.resolveLabel(surveyName, xmlDoc).then(rsLabel => {
    const data: any = {
      label: rsLabel,
      name: surveyName,
      version: appConfig.survey_info.surveys[surveyName].version,
      xmlResponse,
      jsonDocResponse,
    };
    if (opts.timelineEntry) {
      let timestamps = EnketoSurveyAnswer.resolveTimestamps(xmlDoc, opts.timelineEntry);
      if (timestamps === undefined) {
        // timestamps were resolved, but they are invalid
        return new Error(i18next.t('survey.enketo-timestamps-invalid')); //"Timestamps are invalid. Please ensure that the start time is before the end time.");
      }
      // if timestamps were not resolved from the survey, we will use the trip or place timestamps
      timestamps ||= opts.timelineEntry;
      data.start_ts = timestamps.start_ts || timestamps.enter_ts;
      data.end_ts = timestamps.end_ts || timestamps.exit_ts;
      // UUID generated using this method https://stackoverflow.com/a/66332305
      data.match_id = URL.createObjectURL(new Blob([])).slice(-36);
    } else {
      const now = Date.now();
      data.ts = now/1000; // convert to seconds to be consistent with the server
      data.fmt_time = new Date(now);
    }
    // use dataKey passed into opts if available, otherwise get it from the config
    const dataKey = opts.dataKey || appConfig.survey_info.surveys[surveyName].dataKey;
    return window['cordova'].plugins.BEMUserCache
      .putMessage(dataKey, data)
      .then(() => data);
  }).then(data => data);
}

const _getMostRecent = (answers) => {
  answers.sort((a, b) => a.metadata.write_ts < b.metadata.write_ts);
  console.log("first answer is ", answers[0], " last answer is ", answers[answers.length-1]);
  return answers[0];
}

/*
  * We retrieve all the records every time instead of caching because of the
  * usage pattern. We assume that the demographic survey is edited fairly
  * rarely, so loading it every time will likely do a bunch of unnecessary work.
  * Loading it on demand seems like the way to go. If we choose to experiment
  * with incremental updates, we may want to revisit this.
*/
export function loadPreviousResponseForSurvey(dataKey: string) {
  const UnifiedDataLoader = getAngularService('UnifiedDataLoader');
  const tq = window['cordova'].plugins.BEMUserCache.getAllTimeQuery();
  logDebug("loadPreviousResponseForSurvey: dataKey = " + dataKey + "; tq = " + tq);
  return UnifiedDataLoader.getUnifiedMessagesForInterval(dataKey, tq)
      .then(answers => _getMostRecent(answers))
}
