import {
  getInstanceStr,
  filterByNameAndVersion,
  resolveTimestamps,
  resolveLabel,
  _lazyLoadConfig,
  loadPreviousResponseForSurvey,
  saveResponse,
} from '../js/survey/enketo/enketoHelper';
import { mockBEMUserCache } from '../__mocks__/cordovaMocks';
import { mockLogger } from '../__mocks__/globalMocks';

import initializedI18next from '../js/i18nextInit';
window['i18next'] = initializedI18next;

mockBEMUserCache();
mockLogger();

global.URL = require('url').URL;
global.Blob = require('node:buffer').Blob;

it('gets the survey config', async () => {
  //this is aimed at testing my mock of the config
  //mocked getDocument for the case of getting the config
  let config = await _lazyLoadConfig();
  let mockSurveys = {
    TimeUseSurvey: {
      compatibleWith: 1,
      formPath:
        'https://raw.githubusercontent.com/sebastianbarry/nrel-openpath-deploy-configs/surveys-info-and-surveys-data/survey-resources/data-json/time-use-survey-form-v9.json',
      labelTemplate: {
        en: '{ erea, plural, =0 {} other {# Employment/Education, } }{ da, plural, =0 {} other {# Domestic, } }',
        es: '{ erea, plural, =0 {} other {# Empleo/Educación, } }{ da, plural, =0 {} other {# Actividades domesticas, }}',
      },
      labelVars: {
        da: { key: 'Domestic_activities', type: 'length' },
        erea: { key: 'Employment_related_a_Education_activities', type: 'length' },
      },
      version: 9,
    },
  };
  expect(config).toMatchObject(mockSurveys);
});

it('gets the model response, if avaliable, or returns null', () => {
  const xmlModel =
    '<model xmlns:odk="http://www.opendatakit.org/xforms" odk:xforms-version="1.0.0"><instance><aDxjD5f5KAghquhAvsormy xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" id="time_use_survey_form_v9_1"><start/><end/><group_hg4zz25><Start_date/><Start_time/><End_date/><End_time/><Activity_Type/><Personal_Care_activities/><Employment_related_a_Education_activities/><Domestic_activities/><Recreation_and_leisure/><Voluntary_work_and_care_activities/><Other/></group_hg4zz25><meta><instanceID/></meta></aDxjD5f5KAghquhAvsormy></instance></model>';
  const filled =
    '<aDxjD5f5KAghquhAvsormy xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" id="time_use_survey_form_v9_1"><start/><end/><group_hg4zz25><Start_date>2016-07-25</Start_date><Start_time>17:24:32.928-06:00</Start_time><End_date>2016-07-25</End_date><End_time>17:30:31.000-06:00</End_time><Activity_Type/><Personal_Care_activities/><Employment_related_a_Education_activities/><Domestic_activities/><Recreation_and_leisure/><Voluntary_work_and_care_activities/><Other/></group_hg4zz25><meta><instanceID/></meta></aDxjD5f5KAghquhAvsormy>';
  const opts = { prefilledSurveyResponse: filled };
  const opts2 = {
    prefillFields: {
      Start_date: '2016-07-25',
      Start_time: '17:24:32.928-06:00',
      End_date: '2016-07-25',
      End_time: '17:30:31.000-06:00',
    },
  };

  //if no xmlModel, returns null
  expect(getInstanceStr(null, opts)).toBe(null);
  //if there is a prefilled survey, return it
  expect(getInstanceStr(xmlModel, opts)).toBe(filled);
  //if there is a model and fields, return prefilled
  expect(getInstanceStr(xmlModel, opts2)).toBe(filled);
  //if none of those things, also return null
  expect(getInstanceStr(xmlModel, {})).toBe(null);
});

//resolve timestamps
it('resolves the timestamps', () => {
  const xmlParser = new window.DOMParser();
  const timelineEntry = {
    end_local_dt: { timezone: 'America/Los_Angeles' },
    start_ts: 1469492672.928242,
    end_ts: 1469493031,
  };

  //missing data returns null
  const missingData =
    '<tag> <Start_date>2016-08-28</Start_date> <End_date>2016-07-25</End_date> <End_time>17:30:31.000-06:00</End_time> </tag>';
  const missDataDoc = xmlParser.parseFromString(missingData, 'text/html');
  expect(resolveTimestamps(missDataDoc, timelineEntry)).toBeNull();
  //bad time returns undefined
  const badTimes =
    '<tag> <Start_date>2016-08-28</Start_date> <End_date>2016-07-25</End_date> <Start_time>17:32:32.928-06:00</Start_time> <End_time>17:30:31.000-06:00</End_time> </tag>';
  const badTimeDoc = xmlParser.parseFromString(badTimes, 'text/xml');
  expect(resolveTimestamps(badTimeDoc, timelineEntry)).toBeUndefined();
  //if within a minute, timelineEntry timestamps
  const timeEntry =
    '<tag> <Start_date>2016-07-25</Start_date> <End_date>2016-07-25</End_date> <Start_time>17:24:32.928-06:00</Start_time> <End_time>17:30:31.000-06:00</End_time> </tag>';
  const xmlDoc1 = xmlParser.parseFromString(timeEntry, 'text/xml');
  expect(resolveTimestamps(xmlDoc1, timelineEntry)).toMatchObject({
    start_ts: 1469492672.928242,
    end_ts: 1469493031,
  });
  // else survey timestamps
  const timeSurvey =
    '<tag> <Start_date>2016-07-25</Start_date> <End_date>2016-07-25</End_date> <Start_time>17:22:33.928-06:00</Start_time> <End_time>17:33:33.000-06:00</End_time> </tag>';
  const xmlDoc2 = xmlParser.parseFromString(timeSurvey, 'text/xml');
  expect(resolveTimestamps(xmlDoc2, timelineEntry)).toMatchObject({
    start_ts: 1469492553.928,
    end_ts: 1469493213,
  });
});

//resolve label
it('resolves the label', async () => {
  const xmlParser = new window.DOMParser();
  const xmlString = '<tag> <Domestic_activities> option_1 </Domestic_activities> </tag>';
  const xmlDoc = xmlParser.parseFromString(xmlString, 'text/html');
  const xmlString2 =
    '<tag> <Domestic_activities> option_1 </Domestic_activities> <Employment_related_a_Education_activities> option_3 </Employment_related_a_Education_activities> </tag>';
  const xmlDoc2 = xmlParser.parseFromString(xmlString2, 'text/xml');

  //if no template, returns "Answered" TODO: find a way to engineer this case
  //if no labelVars, returns template TODO: find a way to engineer this case
  //have a custom survey label function TODO: we currently don't have custome label functions, but should test when we do
  //no custom function, fallback to UseLabelTemplate (standard case)
  expect(await resolveLabel('TimeUseSurvey', xmlDoc)).toBe('3 Domestic');
  expect(await resolveLabel('TimeUseSurvey', xmlDoc2)).toBe('3 Employment/Education, 3 Domestic');
});

/**
 * @param surveyName the name of the survey (e.g. "TimeUseSurvey")
 * @param enketoForm the Form object from enketo-core that contains this survey
 * @param appConfig the dynamic config file for the app
 * @param opts object with SurveyOptions like 'timelineEntry' or 'dataKey'
 * @returns Promise of the saved result, or an Error if there was a problem
 */
//   export function saveResponse(surveyName: string, enketoForm: Form, appConfig, opts: SurveyOptions) {
it('gets the saved result or throws an error', () => {
  const surveyName = 'TimeUseSurvey';
  const form = {
    getDataStr: () => {
      return '<aDxjD5f5KAghquhAvsormy xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" id="time_use_survey_form_v9_1"><start>2023-10-13T15:05:48.890-06:00</start><end>2023-10-13T15:05:48.892-06:00</end><group_hg4zz25><Start_date>2016-07-25</Start_date><Start_time>17:24:32.928-06:00</Start_time><End_date>2016-07-25</End_date><End_time>17:30:31.000-06:00</End_time><Activity_Type>personal_care_activities</Activity_Type><Personal_Care_activities>doing_sport</Personal_Care_activities><Employment_related_a_Education_activities/><Domestic_activities/><Recreation_and_leisure/><Voluntary_work_and_care_activities/><Other/></group_hg4zz25><meta><instanceID>uuid:dc16c287-08b2-4435-95aa-e4d7838b4225</instanceID><deprecatedID/></meta></aDxjD5f5KAghquhAvsormy>';
    },
  };
  const badForm = {
    getDataStr: () => {
      return '<aDxjD5f5KAghquhAvsormy xmlns:jr="http://openrosa.org/javarosa" xmlns:orx="http://openrosa.org/xforms" id="time_use_survey_form_v9_1"><start>2023-10-13T15:05:48.890-06:00</start><end>2023-10-13T15:05:48.892-06:00</end><group_hg4zz25><Start_date>2016-08-25</Start_date><Start_time>17:24:32.928-06:00</Start_time><End_date>2016-07-25</End_date><End_time>17:30:31.000-06:00</End_time><Activity_Type>personal_care_activities</Activity_Type><Personal_Care_activities>doing_sport</Personal_Care_activities><Employment_related_a_Education_activities/><Domestic_activities/><Recreation_and_leisure/><Voluntary_work_and_care_activities/><Other/></group_hg4zz25><meta><instanceID>uuid:dc16c287-08b2-4435-95aa-e4d7838b4225</instanceID><deprecatedID/></meta></aDxjD5f5KAghquhAvsormy>';
    },
  };
  const config = {
    survey_info: {
      surveys: {
        TimeUseSurvey: {
          compatibleWith: 1,
          formPath:
            'https://raw.githubusercontent.com/sebastianbarry/nrel-openpath-deploy-configs/surveys-info-and-surveys-data/survey-resources/data-json/time-use-survey-form-v9.json',
          labelTemplate: {
            en: '{ erea, plural, =0 {} other {# Employment/Education, } }{ da, plural, =0 {} other {# Domestic, } }',
            es: '{ erea, plural, =0 {} other {# Empleo/Educación, } }{ da, plural, =0 {} other {# Actividades domesticas, }}',
          },
          labelVars: {
            da: { key: 'Domestic_activities', type: 'length' },
            erea: { key: 'Employment_related_a_Education_activities', type: 'length' },
          },
          version: 9,
        },
      },
    },
  };
  const opts = {
    timelineEntry: {
      end_local_dt: { timezone: 'America/Los_Angeles' },
      start_ts: 1469492672.928242,
      end_ts: 1469493031,
    },
  };

  console.log(config);
  expect(saveResponse(surveyName, form, config, opts)).resolves.toMatchObject({
    label: '1 Personal Care',
    name: 'TimeUseSurvey',
  });
  expect(saveResponse(surveyName, badForm, config, opts)).resolves.toMatchObject({
    message:
      'The times you entered are invalid. Please ensure that the start time is before the end time.',
  });
});

/*
 * We retrieve all the records every time instead of caching because of the
 * usage pattern. We assume that the demographic survey is edited fairly
 * rarely, so loading it every time will likely do a bunch of unnecessary work.
 * Loading it on demand seems like the way to go. If we choose to experiment
 * with incremental updates, we may want to revisit this.
 */
it('loads the previous response to a given survey', () => {
  expect(loadPreviousResponseForSurvey('manual/demographic_survey')).resolves.toMatchObject({
    data: 'completed',
    time: '01/01/2001',
  });
});

/**
 * filterByNameAndVersion filter the survey responses by survey name and their version.
 * The version for filtering is specified in enketo survey `compatibleWith` config.
 * The stored survey response version must be greater than or equal to `compatibleWith` to be included.
 */
it('filters the survey responses by their name and version', () => {
  //no response -> no filtered responses
  expect(filterByNameAndVersion('TimeUseSurvey', [])).resolves.toStrictEqual([]);

  const response = [
    {
      data: {
        label: 'Activity', //display label (this value is use for displaying on the button)
        ts: '100000000', //the timestamp at which the survey was filled out (in seconds)
        fmt_time: '12:36', //the formatted timestamp at which the survey was filled out
        name: 'TimeUseSurvey', //survey name
        version: '1', //survey version
        xmlResponse: '<this is my xml>', //survey response XML string
        jsonDocResponse: 'this is my json object', //survey response JSON object
      },
      metadata: {},
    },
  ];

  //one response -> that response
  expect(filterByNameAndVersion('TimeUseSurvey', response)).resolves.toStrictEqual(response);

  const responses = [
    {
      data: {
        label: 'Activity', //display label (this value is use for displaying on the button)
        ts: '100000000', //the timestamp at which the survey was filled out (in seconds)
        fmt_time: '12:36', //the formatted timestamp at which the survey was filled out
        name: 'TimeUseSurvey', //survey name
        version: '1', //survey version
        xmlResponse: '<this is my xml>', //survey response XML string
        jsonDocResponse: 'this is my json object', //survey response JSON object
      },
      metadata: {},
    },
    {
      data: {
        label: 'Activity', //display label (this value is use for displaying on the button)
        ts: '100000000', //the timestamp at which the survey was filled out (in seconds)
        fmt_time: '12:36', //the formatted timestamp at which the survey was filled out
        name: 'OtherSurvey', //survey name
        version: '1', //survey version
        xmlResponse: '<this is my xml>', //survey response XML string
        jsonDocResponse: 'this is my json object', //survey response JSON object
      },
      metadata: {},
    },
  ];

  //several responses -> only the one that has a name match
  expect(filterByNameAndVersion('TimeUseSurvey', responses)).resolves.toStrictEqual(response);
});
