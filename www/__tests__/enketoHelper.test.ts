import { getInstanceStr, filterByNameAndVersion, resolveTimestamps, resolveLabel, _lazyLoadConfig, loadPreviousResponseForSurvey} from '../js/survey/enketo/enketoHelper';
import { mockBEMUserCache } from '../__mocks__/cordovaMocks';
import { mockLogger } from '../__mocks__/globalMocks';

// import initializedI18next from '../js/i18nextInit';
// window['i18next'] = initializedI18next;

mockBEMUserCache();
mockLogger();
// jest.mock('../__mocks__/messageFormatMocks');
// jest.mock("i18next");

// global.i18next = { resolvedLanguage : "en" }

it('gets the survey config', async () => {
    //this is aimed at testing my mock of the config
    //mocked getDocument for the case of getting the config
    let config = await _lazyLoadConfig();
    let mockSurveys = {
        TimeUseSurvey: { compatibleWith: 1, 
          formPath: "https://raw.githubusercontent.com/sebastianbarry/nrel-openpath-deploy-configs/surveys-info-and-surveys-data/survey-resources/data-json/time-use-survey-form-v9.json", 
          labelTemplate: {en: " erea, plural, =0 {} other {# Employment/Education, } }{ da, plural, =0 {} other {# Domestic activities, }",
                          es: " erea, plural, =0 {} other {# Empleo/Educación, } }{ da, plural, =0 {} other {# Actividades domesticas, }"}, 
          labelVars: {da: {key: "Domestic_activities", type: "length"},
                      erea: {key: "Employment_related_a_Education_activities", type:"length"}}, 
          version: 9}
      }
    expect(config).toMatchObject(mockSurveys);
})

it('gets the model response, if avaliable, or returns null', ()=> {
    const xmlModel = '<model><instance>\n <data xmlns:jr=\"http://openrosa.org/javarosa\" xmlns:odk=\"http://www.opendatakit.org/xforms\" xmlns:orx=\"http://openrosa.org/xforms\" id=\"snapshot_xml\">\n  <travel_mode/>\n <meta>\n <instanceID/>\n  </meta>\n </data>\n  </instance></model>;';
    const filled = '<model><instance>\n <data xmlns:jr=\"http://openrosa.org/javarosa\" xmlns:odk=\"http://www.opendatakit.org/xforms\" xmlns:orx=\"http://openrosa.org/xforms\" id=\"snapshot_xml\">\n  <travel_mode/>car\n <meta>\n <instanceID/>\n  </meta>\n </data>\n  </instance></model>;';
    const opts = {"prefilledSurveyResponse": filled};
    const opts2 = {"prefillFields": {"travel_mode" : "car"}};
    
    //if no xmlModel, returns null
    expect(getInstanceStr(null, opts)).toBe(null);

    //if there is a prefilled survey, return it
    expect(getInstanceStr(xmlModel, opts)).toBe(filled);

    //if there is a model and fields, return prefilled
    // expect(getInstanceStr(xmlModel, opts2)).toBe(filled);
    //TODO - figure out how to use the helper function with JEST -- getElementsByTagName is empty? should it be?

    //if none of those things, also return null
    expect(getInstanceStr(xmlModel, {})).toBe(null);
});

//resolve timestamps
it('resolves the timestamps', () => {
    const xmlParser = new window.DOMParser();
    const timelineEntry = { end_local_dt: {timezone: "America/Los_Angeles"}, start_ts: 1469492672.928242, end_ts: 1469493031};

    //missing data returns null
    const missingData = '<tag> <Start_date>2016-08-28</Start_date> <End_date>2016-07-25</End_date> <End_time>17:30:31.000-06:00</End_time> </tag>';
    const missDataDoc = xmlParser.parseFromString(missingData, 'text/html');
    expect(resolveTimestamps(missDataDoc, timelineEntry)).toBeNull();
    //bad time returns undefined
    const badTimes = '<tag> <Start_date>2016-08-28</Start_date> <End_date>2016-07-25</End_date> <Start_time>17:32:32.928-06:00</Start_time> <End_time>17:30:31.000-06:00</End_time> </tag>';
    const badTimeDoc = xmlParser.parseFromString(badTimes, 'text/xml');
    expect(resolveTimestamps(badTimeDoc, timelineEntry)).toBeUndefined();
    //good info returns unix start and end timestamps -- TODO : address precise vs less precise?
    const timeSurvey = '<tag> <Start_date>2016-07-25</Start_date> <End_date>2016-07-25</End_date> <Start_time>17:24:32.928-06:00</Start_time> <End_time>17:30:31.000-06:00</End_time> </tag>';
    const xmlDoc = xmlParser.parseFromString(timeSurvey, 'text/xml');
    expect(resolveTimestamps(xmlDoc, timelineEntry)).toMatchObject({start_ts: 1469492672928, end_ts: 1469493031000});
});

//resolve label
it('resolves the label', async () => {
    const xmlParser = new window.DOMParser();

    //have a custom survey label function TODO: we currently don't have custome label functions, but should test when we do
    
    //no custom function, fallback to UseLabelTemplate
    const xmlString = '<tag> <Domestic_activities>option_1/Domestic_activities> <Employment_related_a_Education_activities>option_2</Employment_related_a_Education_activities> </tag>';
    const xmlDoc = xmlParser.parseFromString(xmlString, 'text/html');

    //if no template, returns "Answered"
    expect(await resolveLabel("TimeUseSurvey", xmlDoc)).toBe("");
    //if no labelVars, returns template
    //else interpolates
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

});

/*
* We retrieve all the records every time instead of caching because of the
* usage pattern. We assume that the demographic survey is edited fairly
* rarely, so loading it every time will likely do a bunch of unnecessary work.
* Loading it on demand seems like the way to go. If we choose to experiment
* with incremental updates, we may want to revisit this.
*/
//   export function loadPreviousResponseForSurvey(dataKey: string) {
it('loads the previous response to a given survey', () => {
    //not really sure if I can test this yet given that it relies on an angular service...
    loadPreviousResponseForSurvey("manual/demographic_survey");
});

/**
 * filterByNameAndVersion filter the survey answers by survey name and their version.
 * The version for filtering is specified in enketo survey `compatibleWith` config.
 * The stored survey answer version must be greater than or equal to `compatibleWith` to be included.
 */
it('filters the survey answers by their name and version', () => {
    //no answers -> no filtered answers
    expect(filterByNameAndVersion("TimeUseSurvey", [])).resolves.toStrictEqual([]);

    const answer = [
        {
            data: {
                label: "Activity", //display label (this value is use for displaying on the button)
                ts: "100000000", //the timestamp at which the survey was filled out (in seconds)
                fmt_time: "12:36", //the formatted timestamp at which the survey was filled out
                name: "TimeUseSurvey", //survey name
                version: "1", //survey version
                xmlResponse: "<this is my xml>", //survey answer XML string
                jsonDocResponse: "this is my json object" //survey answer JSON object
            },
            labels: [{labelField: "goodbye"}] //TODO learn more about answer type
        }
    ];

    //one answer -> that answer
    expect(filterByNameAndVersion("TimeUseSurvey", answer)).resolves.toStrictEqual(answer);

    const answers = [
        {
            data: {
                label: "Activity", //display label (this value is use for displaying on the button)
                ts: "100000000", //the timestamp at which the survey was filled out (in seconds)
                fmt_time: "12:36", //the formatted timestamp at which the survey was filled out
                name: "TimeUseSurvey", //survey name
                version: "1", //survey version
                xmlResponse: "<this is my xml>", //survey answer XML string
                jsonDocResponse: "this is my json object" //survey answer JSON object
            },
            labels: [{labelField: "goodbye"}]
        },
        {
            data: {
                label: "Activity", //display label (this value is use for displaying on the button)
                ts: "100000000", //the timestamp at which the survey was filled out (in seconds)
                fmt_time: "12:36", //the formatted timestamp at which the survey was filled out
                name: "OtherSurvey", //survey name
                version: "1", //survey version
                xmlResponse: "<this is my xml>", //survey answer XML string
                jsonDocResponse: "this is my json object" //survey answer JSON object
            },
            labels: [{labelField: "goodbye"}]
        }
    ];

    //several answers -> only the one that has a name match
    expect(filterByNameAndVersion("TimeUseSurvey", answers)).resolves.toStrictEqual(answer);
});
