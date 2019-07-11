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
  var __trip = null;

  function init({ form_location, opts, trip }) {
    __form = null;
    __session = {};
    __form_location = form_location;
    __loaded_form = null;
    __loaded_model = null;
    __trip = null;

    __opts = opts;
    if (__opts && __opts.session) {
      __session = __opts.session;
    }

    if (trip) {
      __trip = trip;
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

  function getUserProfile(user_properties, answers) {
    const potentialCandidates = answers.filter(function(answer) {
        return answer.data.user_uuid = user_properties.uuid;
    });
    return potentialCandidates.length ?
        potentialCandidates[potentialCandidates.length - 1] :
        null;
  }

  function _restoreAnswer(answers) {
    let answer = null;
    if (__trip) {
        answer = ConfirmHelper.getUserInputForTrip(__trip, answers);
    } else if (__session.user_properties) {
        answer = getUserProfile(__session.user_properties, answers);
    }
    return (!answer) ? null : answer.data.survey_result;
  }

  function _parseAnswerByTagName(answerXml, tagName) {
    const vals = answerXml.getElementsByTagName(tagName);
    const val = vals.length ? vals[0].innerHTML : null;
    if (!val) return '<null>';
    return val.replace(/_/g, ' ');
  }

  function makeAnswerFromAnswerData(data) {
    return {
      data: data
    }
  }

  function populateLabels(answer, xmlParser = new $window.DOMParser()) {
    const xmlStr = answer.data.survey_result;
    const xml = xmlParser.parseFromString(xmlStr, 'text/xml');
    // Data injection
    answer.travel_mode_main = _parseAnswerByTagName(xml, 'travel_mode_main');
    answer.o_purpose_main = _parseAnswerByTagName(xml, 'o_purpose_main');
    answer.d_purpose_main = _parseAnswerByTagName(xml, 'd_purpose_main');
    return answer;
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
          return populateLabels(answer, xmlParser);
        });
      }

      return answers;
    });
  }

  function displayForm() {
    let data_key = (__session && __session.data_key) ?
        __session.data_key :
        "manual/confirm_survey";
    return getAllSurveyAnswers(data_key
    ).then(_restoreAnswer
    ).then(function(answerData) {
      return _loadForm({ instanceStr: answerData });
    });
  }

  function _saveData() {
    const data = {
      survey_result: __form.getDataStr(),
    };
    if (__trip && __trip.data.properties) {
        data.start_ts = __trip.data.properties.start_ts;
        data.end_ts = __trip.data.properties.end_ts;
    }
    if (__session && __session.user_properties) {
        data.user_uuid = __session.user_properties.uuid;
    }
    return $window.cordova.plugins.BEMUserCache.putMessage(__session.data_key, data
    ).then(function(){
      return data;
    });
  }
  
  function validateForm() {
    return __form.validate()
    .then(function (valid){
      if (valid) return _saveData();
      return false;
    });
  }

  function getState() {
    return {
      form: __form,
      session: __session,
      loaded_form: __loaded_form,
      loaded_model: __loaded_model,
      trip: __trip,
    };
  }

  return {
    init: init,
    displayForm: displayForm,
    validateForm: validateForm,
    getAllSurveyAnswers: getAllSurveyAnswers,
    getState: getState,
    getUserProfile: getUserProfile,
    populateLabels: populateLabels,
    makeAnswerFromAnswerData: makeAnswerFromAnswerData,
  };
});
