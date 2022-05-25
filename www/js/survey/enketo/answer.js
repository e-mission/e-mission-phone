angular.module('emission.survey.enketo.answer', [
  'ionic'
])
.factory('EnketoSurveyAnswer', function(
  $http, 
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

  const ENKETO_SURVEY_CONFIG_PATH = 'json/enketoSurveyConfig.json';
  const LABEL_FUNCTIONS = {
    TripConfirmSurvey: (xmlDoc) => {
      const modeStr = _getAnswerByTagName(xmlDoc, 'travel_mode');
      const purposeStr = _getAnswerByTagName(xmlDoc, 'destination_purpose');

      if (modeStr.includes('trip_not_valid') || purposeStr.includes('trip_not_valid')) {
        return 'Trip not valid';
      }

      const purposes = purposeStr.split(' ').length;
      const modes = modeStr.split(' ').length;
      return `${purposes} purpose${purposes > 1 ? 's': ''}, ${modes} mode${modes > 1 ? 's': ''}`;
    },
    UserProfileSurvey: (xmlDoc) => {
      return 'Answered';
    },
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
    return $http.get(ENKETO_SURVEY_CONFIG_PATH).then(configRes => {
      _config = configRes.data;
      return _config;
    });
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
   * @returns {string} label string
   */
  function resolveLabel(name, xmlDoc) {
    return LABEL_FUNCTIONS[name](xmlDoc);
  }

  return {
    filterByNameAndVersion,
    resolveLabel,
  };
});
