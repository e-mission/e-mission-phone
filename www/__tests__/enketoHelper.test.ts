import { getInstanceStr } from '../js/survey/enketo/enketoHelper';

/**
 * @param xmlModel the blank XML model response for the survey
 * @param opts object with options like 'prefilledSurveyResponse' or 'prefillFields'
 * @returns XML string of an existing or prefilled model response, or null if no response is available
 */
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

});