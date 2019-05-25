angular.module('emission.enketo-survey.service', [
  'ionic',
  'emission.services',
  'emission.plugin.logger',
  'emission.tripconfirm.service',
])
.factory('EnketoSurvey', function(
  $window, $http, UnifiedDataLoader, Logger,
  ConfirmHelper
) {
  var __form = null;
  var __session = {};
  var __form_location = null;
  var __loaded_form = null;
  var __loaded_model = null;

  function init(formLocParam, optsParam) {
    __form = null;
    __session = {};
    __form_location = formLocParam;
    __loaded_form = null;
    __loaded_model = null;

    const opts = JSON.parse(optsParam);
    if (opts && opts.session) {
      __session = opts.session;
    }

    return $http.get(__form_location)
    .then(function(form_json) {
      __loaded_form = form_json.data.form;
      __loaded_model = form_json.data.model;
    });
  }

  function _loadForm(opts = {}) {
    var formSelector = 'form.or:eq(0)';
    var data = {
      // required string of the default instance defined in the XForm
      modelStr: __loaded_model,
      // optional string of an existing instance to be edited
      instanceStr: opts.instanceStr || null,
      submitted: opts.submitted || false,
      external: opts.external || [],
      session: opts.session || {}
    };
    __form = new $window.FormModule( formSelector, data, {});
    var loadErrors = __form.init();
    return loadErrors;
  }

  function _restoreAnswer(answers) {
    const answer = ConfirmHelper.getUserInputForTrip(__session.trip_properties, answers);
    return (!answer) ? null : answer.data.survey_result;
  }

  function getAllSurveyAnswers(key = 'manual/confirm_survey', opts = {}) {
    const _opts_populateLabels = opts.populateLabels || false;

    const tq = $window.cordova.plugins.BEMUserCache.getAllTimeQuery();
    return UnifiedDataLoader.getUnifiedMessagesForInterval(key, tq)
    .then(function(answers){
      if (!_opts_populateLabels) return answers;

      const xmlParser = new $window.DOMParser();
      if (key === 'manual/confirm_survey') {
        return answers.map(function(answer){
          const xmlStr = answer.data.survey_result;
          const xml = xmlParser.parseFromString(xmlStr, 'text/xml');

          // Travel Mode
          const travelModes = xml.getElementsByTagName('travel_mode_main');
          const travelMode = travelModes.length ? travelModes[0].innerHTML : null;
          const travelModeLabel = travelMode ? travelMode.charAt(0).toUpperCase() + travelMode.slice(1) : '';

          // Travel Purpose
          const travelPurposes = xml.getElementsByTagName('travel_purpose_main');
          const travelPurpose = travelPurposes.length ? travelPurposes[0].innerHTML : null;
          const travelPurposeLabel = travelPurpose ? travelPurpose.charAt(0).toUpperCase() + travelPurpose.slice(1) : '';

          // Result Population
          answer.mode_label = travelModeLabel;
          answer.purpose_label = travelPurposeLabel;
          return answer;
        });
      }

      return answers;
    });
  }

  function displayForm() {
    // Load survey with previous answer
    if (__session &&
        __session.data_key &&
        __session.data_key === 'manual/confirm_survey'
    ) {
      return getAllSurveyAnswers(__session.data_key)
      .then(_restoreAnswer)
      .then(function(answerData) {
        return _loadForm({ instanceStr: answerData });
      });
    }
    return _loadForm();
  }

  function _saveData() {
    const value = {
      survey_result: __form.getDataStr(),
      start_ts: __session.start_ts,
      end_ts: __session.end_ts,
    };
    return $window.cordova.plugins.BEMUserCache.putMessage(__session.data_key, value);
  }
  
  function validateForm() {
    return __form.validate()
    .then(function (valid){
      if (valid) return _saveData().then(function(){return valid});
      return valid;
    });
  }

  function getState() {
    return {
      form: __form,
      session: __session,
      loaded_form: __loaded_form,
      loaded_model: __loaded_model,
    };
  }

  return {
    init: init,
    displayForm: displayForm,
    validateForm: validateForm,
    getAllSurveyAnswers: getAllSurveyAnswers,
    getState: getState,
  };
});
