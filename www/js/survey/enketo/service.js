angular.module('emission.survey.enketo.service', [
  'ionic',
  'emission.services',
  'emission.survey.inputmatcher',
  'emission.survey.enketo.answer'
])
.factory('EnketoSurvey', function(
  $window, $http, UnifiedDataLoader,
  InputMatcher, EnketoSurveyAnswer,
) {
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

  /**
   * @typedef EnketoSurveyState
   * @type {{
   *  config: EnketoSurveyConfig;
   *  name: string;
   *  form: object;
   *  formLocation: string;
   *  loaded: {
   *    form: string;
   *    model: string;
   *  };
   *  opts: {
   *    trip: object;
   *    prev_demographic_survey: object;
   *  };
   * }}
   */

  const ENKETO_SURVEY_CONFIG_PATH = 'json/enketoSurveyConfig.json';
  /** @type {EnketoSurveyState} _state */
  let _state;

  /**
   * _lazyLoadConfig load enketo survey config. If already loaded, return the cached config
   * @returns {Promise<EnketoSurveyConfig>} enketo survey config
   */
  function _lazyLoadConfig() {
    if (_state.config !== null) {
      return Promise.resolve(_state.config);
    }
    return $http.get(ENKETO_SURVEY_CONFIG_PATH).then(configRes => {
      _state.config = configRes.data;
      return _state.config;
    });
  }

  /**
   * _loadForm load enketo form
   * @param {{
   *  instanceStr?: string;
   *  submitted?: boolean;
   *  external?: string[];
   *  session?: object;
   * }} opts enketo form options
   * @returns {string[]} load errors
   */
  function _loadForm(opts = {}) {
    const formSelector = 'form.or:eq(0)';
    const data = {
      // required string of the default instance defined in the XForm
      modelStr: _state.loaded.model,
      // optional string of an existing instance to be edited
      instanceStr: opts.instanceStr || null,
      submitted: opts.submitted || false,
      external: opts.external || [],
      session: opts.session || {}
    };
    _state.form = new $window.FormModule(formSelector, data, {});
    return _state.form.init();
  }

  /**
   * _resetState reset state object to its initial value
   */
  function _resetState() {
    _state = {
      config: null,
      name: null,
      form: null,
      formLocation: null,
      loaded: {
        form: null,
        model: null,
      },
      opts: {
        trip: null,
        prev_demographic_survey: null,
      },
    };
  }

  /**
   * _restoreAnswer restore the most recent answer for the survey
   * @param {EnketoAnswer[]} answers survey answers
   * @returns {Promise<string>} answer string promise
   */
  function _restoreAnswer() {
    if (_state.opts.trip) {
      const answer = _state.opts.trip.userInput["SURVEY"];
      return answer ? answer.data.xmlResponse : null;
    } else if (_state.opts.prev_demographic_survey) {
        const answer = _state.opts.prev_demographic_survey;
        // TODO: Figure out how to retrieve and match the profile survey
        return answer? answer.data.xmlResponse : null;
    } else {
        return null;
    }
  }

  /**
   * _saveData save survey answer data
   * @returns {Promise<EnketoAnswerData>} answer data
   */
  function _saveData() {
    /** @type {DOMParser} xmlParser */
    const xmlParser = new $window.DOMParser();
    const xmlResponse = _state.form.getDataStr();
    const xmlDoc = xmlParser.parseFromString(xmlResponse, 'text/xml');

    const data = {
      label: EnketoSurveyAnswer.resolveLabel(_state.name, xmlDoc),
      name: _state.name,
      timestamp: new Date(),
      version: _state.config[_state.name].version,
      xmlResponse,
    };
    if (_state.opts.trip && _state.opts.trip.data.properties) {
        data.start_ts = _state.opts.trip.data.properties.start_ts;
        data.end_ts = _state.opts.trip.data.properties.end_ts;
    }
    return $window.cordova.plugins.BEMUserCache
      .putMessage(_state.config[_state.name].dataKey, data)
      .then(() => data);
  }

  /**
   * getState return current state
   * @returns {EnketoSurveyState} state
   */
  function getState() {
    return _state;
  }

  /**
   * load survey data and initialize state for display
   * @param {string} name survey name
   * @param {{
   *    trip?: object;
   *  }} [opts]
   * @returns {Promise<void>}
   */
  function load(name, opts) {
    _resetState();

    _state.name = name;
    Object.assign(_state.opts, opts);

    return _lazyLoadConfig()
      .then(config => _state.formLocation = config[name].formPath)
      .then(() => $http.get(_state.formLocation))
      .then(formJson => {
        _state.loaded.form = formJson.data.form;
        _state.loaded.model = formJson.data.model;
      });
  }

  /**
   * showModal display enketo form modal with the most recent answer (if any)
   * @returns {string[]} errors
   */
  function showModal() {
    const instanceStr = _restoreAnswer();
    return Promise.resolve(_loadForm({ instanceStr }));
  }

  /**
   * validateAndSave validate survey response (answer) and save it
   * @returns {EnketoAnswerData|false} answer data or false if error
   */
  function validateAndSave() {
    return _state.form.validate().then(valid => valid ? _saveData() : false);
  }

  return {
    getState,
    load,
    showModal,
    validateAndSave,
  };
});
