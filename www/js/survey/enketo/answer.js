angular.module('emission.survey.enketo.answer', [
  'ionic',
  'emission.config.dynamic',
])
.factory('EnketoSurveyAnswer', function(
  $http, DynamicConfig, $translate, $translateMessageFormatInterpolation
) {
  /**
   * @typedef EnketoAnswerData
   * @type {object}
   * @property {string} label - display label (this value is use for displaying on the button)
   * @property {string} ts - the timestamp at which the survey was filled out (in seconds)
   * @property {string} fmt_time - the formatted timestamp at which the survey was filled out
   * @property {string} name - survey name
   * @property {string} version - survey version
   * @property {string} xmlResponse - survey answer XML string
   * @property {string} jsonDocResponse - survey answer JSON object
   */

  /**
   * @typedef EnketoAnswer
   * @type {object}
   * @property {EnketoAnswerData} data - answer data
   * @property {{[labelField:string]: string}} [labels] - virtual labels (populated by populateLabels method)
   */

  /**
   * @typedef EnketoSurveyConfig
   * @type {{
   *  [surveyName:string]: {
   *   formPath: string;
   *   labelFields: string[];
   *   version: number;
   *   compatibleWith: number;
   *  }
   * }}
   */

  const LABEL_FUNCTIONS = {
    UseLabelTemplate: (xmlDoc, name) => {

      return _lazyLoadConfig().then(configSurveys => {

        const config = configSurveys[name]; // config for this survey
        const lang = $translate.use();
        const labelTemplate = config.labelTemplate?.[lang];

        if (!labelTemplate) return "Answered"; // no template given in config
        if (!config.labelVars) return labelTemplate; // if no vars given, nothing to interpolate,
        // so we return the unaltered template

        // gather vars that will be interpolated into the template according to the survey config
        const labelVars = {}
        for (lblVar in config.labelVars) {
          const fieldName = config.labelVars[lblVar].key;
          let fieldStr = _getAnswerByTagName(xmlDoc, fieldName);
          if (fieldStr == '<null>') fieldStr = null;
          if (config.labelVars[lblVar].type == 'length') {
            const fieldMatches = fieldStr?.split(' ');
            labelVars[lblVar] = fieldMatches?.length || 0;
          } else {
            labelVars[lblVar] = fieldStr || '';
          }
        }

        const label = $translateMessageFormatInterpolation.interpolate(labelTemplate, labelVars);
        return label;
      })
    }
  };
  
  /** @type {EnketoSurveyConfig} _config */
  let _config;

  /**
   * _getAnswerByTagName lookup for the survey answer by tag name form the given XML document.
   * @param {XMLDocument} xmlDoc survey answer object
   * @param {string} tagName tag name
   * @returns {string} answer string. If not found, return "\<null\>"
   */
  function _getAnswerByTagName(xmlDoc, tagName) {
    const vals = xmlDoc.getElementsByTagName(tagName);
    const val = vals.length ? vals[0].innerHTML : null;
    if (!val) return '<null>';
    return val;
  }

  /**
   * _lazyLoadConfig load enketo survey config. If already loaded, return the cached config
   * @returns {Promise<EnketoSurveyConfig>} enketo survey config
   */
  function _lazyLoadConfig() {
    if (_config !== undefined) {
      return Promise.resolve(_config);
    }
    return DynamicConfig.configReady().then((newConfig) => {
      Logger.log("Resolved UI_CONFIG_READY promise in answer.js, filling in templates");
      _config = newConfig.survey_info.surveys;
      return _config;
    })
  }

  /**
   * filterByNameAndVersion filter the survey answers by survey name and their version.
   * The version for filtering is specified in enketo survey `compatibleWith` config.
   * The stored survey answer version must be greater than or equal to `compatibleWith` to be included.
   * @param {string} name survey name (defined in enketo survey config)
   * @param {EnketoAnswer[]} answers survey answers
   *  (usually retrieved by calling UnifiedDataLoader.getUnifiedMessagesForInterval('manual/survey_response', tq)) method.
   * @return {Promise<EnketoAnswer[]>} filtered survey answers
   */
  function filterByNameAndVersion(name, answers) {
    return _lazyLoadConfig().then(config =>
      answers.filter(answer =>
        answer.data.name === name &&
        answer.data.version >= config[name].compatibleWith
      )
    );
  }

  /**
   * resolve answer label for the survey
   * @param {string} name survey name
   * @param {XMLDocument} xmlDoc survey answer object
   * @returns {Promise<string>} label string Promise
   */
  function resolveLabel(name, xmlDoc) {
    if (LABEL_FUNCTIONS[name])
      return LABEL_FUNCTIONS[name](xmlDoc);
    return LABEL_FUNCTIONS.UseLabelTemplate(xmlDoc, name);
  }

  /**
   * resolve timestamps label from the survey response
   * @param {XMLDocument} xmlDoc survey answer object
   * @returns {object} object with `start_ts` and `end_ts`
   */
  function resolveTimestamps(xmlDoc) {
    // check for Date and Time fields
    const date = xmlDoc.getElementsByTagName('Date')?.[0].innerHTML;
    const start = xmlDoc.getElementsByTagName('Start_time')?.[0].innerHTML;
    const end = xmlDoc.getElementsByTagName('End_time')?.[0].innerHTML;

    if (!date || !start || !end) return null; // if any of the fields are missing, return null

    const momentStart = moment(date + 'T' + start);
    const momentEnd = moment(date + 'T' + end);

    // return unix timestamps in milliseconds
    return {
      start_ts: momentStart.unix(),
      end_ts: +momentEnd.unix()
    }; 
  }

  return {
    filterByNameAndVersion,
    resolveLabel,
    resolveTimestamps,
  };
});
