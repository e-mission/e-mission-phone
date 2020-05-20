angular.module('emission.enketo-survey.service', [
  'ionic',
  'emission.services',
  'emission.plugin.logger',
  'emission.tripconfirm.services',
  'emission.main.control.sync',
  'emission.main.control.collection',
])
.factory('EnketoSurvey', function(
  $window, $http, UnifiedDataLoader, Logger,
  ConfirmHelper,
  ControlSyncHelper, ControlCollectionHelper
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
        potentialCandidates[0] :
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
    // return val.replace(/_/g, ' ');
    return val;
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
    // answer.travel_mode_main = _parseAnswerByTagName(xml, 'travel_mode_main');
    // answer.o_purpose_main = _parseAnswerByTagName(xml, 'o_purpose_main');
    // answer.d_purpose_main = _parseAnswerByTagName(xml, 'd_purpose_main');
    answer.destination_purpose = _parseAnswerByTagName(xml, 'destination_purpose');
    answer.travel_mode = _parseAnswerByTagName(xml, 'travel_mode');
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

  function _sync_getState() {
    const LOG_PREFIX = 'EnketoSurvey forceSync:';
    return ControlCollectionHelper.getState().then(function(response) {
      return response;
    }, function(error) {
      Logger.displayError(`${LOG_PREFIX} while getting current state, `, error);
    });
  }

  function _sync_getTransition(transKey) {
    const entry_data = {};
    return _sync_getState().then(function(curr_state) {
        entry_data.curr_state = curr_state;
        if (transKey == _sync_getEndTransitionKey()) {
            entry_data.curr_state = _sync_getOngoingTransitionState();
        }
        entry_data.transition = transKey;
        entry_data.ts = moment().unix();
        return entry_data;
    });
  }

  function _sync_getEndTransitionKey() {
    if(ionic.Platform.isAndroid()) {
      return 'local.transition.stopped_moving';
    }
    else if(ionic.Platform.isIOS()) {
      return 'T_TRIP_ENDED';
    }
  }

  function _sync_getOngoingTransitionState() {
    if(ionic.Platform.isAndroid()) {
      return 'local.state.ongoing_trip';
    }
    else if(ionic.Platform.isIOS()) {
      return 'STATE_ONGOING_TRIP';
    }
  }

  function _sync_isTripEnd(entry) {
    return (entry.metadata.key == _sync_getEndTransitionKey()) ? true : false;
  }

  function _sync_endForceSync() {
    var sensorKey = 'statemachine/transition';
    return _sync_getTransition(_sync_getEndTransitionKey()).then(function(entry_data) {
      return $window.cordova.plugins.BEMUserCache.putMessage(sensorKey, entry_data);
    }).then(function() {
      return _sync_getTransition(_sync_getEndTransitionKey()).then(function(entry_data) {
          return $window.cordova.plugins.BEMUserCache.putMessage(sensorKey, entry_data);
      })
    }).then(_sync_forceSync);
  }

  function _sync_forceSync() {
    const LOG_PREFIX = 'EnketoSurvey forceSync:';
    Logger.log(`EnketoSurvey forceSync start!`);
    ControlSyncHelper.forceSync().then(function() {
      return $window.cordova.plugins.BEMUserCache.getAllMessages('statemachine/transition', true);
    }).then(function(sensorDataList) {
      Logger.log(`${LOG_PREFIX} sensorDataList = ${JSON.stringify(sensorDataList)}`);
      const syncLaunchedCalls = sensorDataList.filter(_sync_isTripEnd);
      const syncPending = (syncLaunchedCalls.length > 0);
      Logger.log(LOG_PREFIX + ' sensorDataList.length = ' + sensorDataList.length +
                  ', syncLaunchedCalls.length = ' + syncLaunchedCalls.length +
                  ', syncPending? = ' + syncPending);
      return syncPending;
    }).then(function(syncPending) {
      Logger.log(`${LOG_PREFIX} sync launched = ${syncPending}`);
      if (syncPending) {
        Logger.log(`${LOG_PREFIX} data is pending, retry in 3 seconds.`);
        setTimeout(_sync_forceSync, 3000);
      } else {
        Logger.log(`${LOG_PREFIX} all data pushed!`);
      }
    }).catch(function(error) {
      Logger.displayError(LOG_PREFIX + ' Error while forcing sync', error);
    });
  }

  function _saveData() {
    const data = {
      survey_result: __form.getDataStr(),
      timestamp: new Date(),
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
