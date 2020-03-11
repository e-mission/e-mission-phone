'use strict';

angular.module('emission.survey.enketo.launch', [
  'emission.services',
  'emission.enketo-survey.service',
  'emission.plugin.logger',
  'emission.stats.clientstats',
  'emission.main.control.sync',
  'emission.splash.startprefs',
])
.factory('EnketoSurveyLaunch', function(
  $ionicPopup, EnketoSurvey, CommHelper, $ionicModal, $ionicScrollDelegate,
  $rootScope, $window, $state, Logger, ClientStats, ControlSyncHelper, StartPrefs
) {
  var __uuid = null;
  var __modal = null;
  // survey type and init function mapping
  // key: survey type (string)
  // value: init function
  var surveyTypeMap = {
    UserProfile: initProfileSurvey,
    ConfirmSurvey: initConfirmSurvey,
    EndSurvey: initEndSurvey,
  };
  var __type = null;
  var __modal_scope = null;
  var __opts = null;

  function reset() {
    if (__modal) {
      __modal.remove(); // remove modal object inorder to reset everything and makes it ready for the next launch
    }
    __modal = null;
    __type = null;
    __modal_scope = null;
    __opts = null;
  }

  // launch the survey
  function launch(scope, type, opts) {
    return new Promise(function(resolve, reject) {
      reset();
      // survey launch options
      // available opts
      // {
      //    trip: tripgj // trip object to refer to if it is a trip-related survey or the confirm survey
      //    disableDismiss: boolean // hide dismiss button (set to true if you wanted to force user to finish the survey)
      //    onInit: function // called when the survey is launched
      //    onNext: function // called when user clicked on next
      // }
      __opts = opts;
      __modal_scope = scope;
      __type = type;
      $ionicModal.fromTemplateUrl('templates/survey/enketo-survey-modal.html', {
        scope: __modal_scope
      }).then(function (modal) {
        __modal = modal;
        __modal_scope.enketoSurvey = {
          // embed functions to make it available for the template to execute them
          disableDismiss: (opts && opts.disableDismiss) ? true : false,
          validateForm: validateForm,
          onNext: onNext,
          hide: function(success = false) { __modal.hide(); resolve(success); },
        }
        surveyTypeMap[type](opts); // execute the initialize function based on type
        __modal.show();
        if (__opts && __opts.onInit) {
          __opts.onInit();
        }
      });
    });
  }

  function onNext() {
    if (__opts && __opts.onNext) {
      __opts.onNext();
    }
  }

  function initSurvey(params) {
    return EnketoSurvey.init({
      form_location: params.form_location,
      opts: params.opts,
      trip: params.trip,
    }).then(function(){
      $('.enketo-plugin .form-header').after(EnketoSurvey.getState().loaded_form);
      $(".enketo-plugin .previous-page").hide();
      $(".enketo-plugin .form-footer__jump-nav").hide();
      return;
    }).then(EnketoSurvey.displayForm
    ).then(function(loadErrors){
			
			// Ignore 'Different root nodes' error: START
			const idx = loadErrors.findIndex((errTxt) => errTxt.includes('Different root nodes'));
			if (idx !== -1) {
        loadErrors.splice(idx, 1);
			}
			// Ignore 'Different root nodes' error: END

      if (loadErrors.length > 0) {
        $ionicPopup.alert({template: "loadErrors: " + loadErrors.join(",")});
      }
    });
  }

  function initConfirmSurvey(opts) {
    return initSurvey({
      form_location: 'json/trip-end-survey_v9.json',
      opts: {
        session: {
          data_key: 'manual/confirm_survey',
        },
      },
      trip: opts.trip,
    });
  }

  function initProfileSurvey(opts) {
    let promise;
    if (__uuid) {
      promise = Promise.resolve(__uuid);
    } else {
      promise = CommHelper.getUser().then(function(profile){
        const uuid = profile.user_id['$uuid'];
        __uuid = uuid;
        return uuid;
      });
    }
    return promise.then(function(uuid) {
      return initSurvey({
        form_location: 'json/user-profile_v4.json',
        opts: {
          session: {
            data_key: 'manual/user_profile_survey',
            user_properties: {
              uuid: uuid,
            },
          },
        },
      });
    });
  }

  function initEndSurvey(opts) {
    let promise;
    if (__uuid) {
      promise = Promise.resolve(__uuid);
    } else {
      promise = CommHelper.getUser().then(function(profile){
        const uuid = profile.user_id['$uuid'];
        __uuid = uuid;
        return uuid;
      });
    }
    return promise.then(function(uuid) {
      return initSurvey({
        form_location: 'json/post-experience-survey-v1.json',
        opts: {
          session: {
            data_key: 'manual/user_end_survey',
            user_properties: {
              uuid: uuid,
            },
          },
        },
      });
    });
  }

  function validateForm() {
    return EnketoSurvey.validateForm()
    .then(function(valid){
      if (!valid) {
        $ionicPopup.alert({template: 'Form contains errors. Please see fields marked in red.'});
      } else {
        const data = valid;
        const answer = EnketoSurvey.populateLabels(
          EnketoSurvey.makeAnswerFromAnswerData(data)
        );
        if (__opts && __opts.trip) {
          __opts.trip.userSurveyAnswer = answer;
        }
        __modal_scope.enketoSurvey.hide(true);
        return;
      }
    }).then(() => {
      // Post-save flow (only for EndSurvey)
      // 1. Force-Sync
      // 2. Logout
      if (__type === 'EndSurvey') {
        return forceSync().then(res => {
          console.log('forceSync done.');
          if (res === undefined) {
            return $ionicPopup.alert({template: 'Cannot save data! Please try again.'}).then(() => data);
          }
          returnToIntro();
          return data;
        });
      }
    });
  }

  // forceSync function from general-settings.js
  function forceSync() {
    ClientStats.addEvent(ClientStats.getStatKeys().BUTTON_FORCE_SYNC).then(
      function () {
        console.log("Added " + ClientStats.getStatKeys().BUTTON_FORCE_SYNC + " event");
      });
    return ControlSyncHelper.forceSync().then(function () {
      console.log('forceSync start');
      /*
       * Change to sensorKey to "background/location" after fixing issues
       * with getLastSensorData and getLastMessages in the usercache
       * See https://github.com/e-mission/e-mission-phone/issues/279 for details
       */
      var sensorKey = "statemachine/transition";
      return $window.cordova.plugins.BEMUserCache.getAllMessages(sensorKey, true);
    }).then(function (sensorDataList) {
      Logger.log("sensorDataList = " + JSON.stringify(sensorDataList));
      // If everything has been pushed, we should
      // only have one entry for the battery, which is the one that was
      // inserted on the last successful push.
      var isTripEnd = function (entry) {
        if (entry.metadata.key == getEndTransitionKey()) {
          return true;
        } else {
          return false;
        }
      };
      var syncLaunchedCalls = sensorDataList.filter(isTripEnd);
      var syncPending = (syncLaunchedCalls.length > 0);
      Logger.log("sensorDataList.length = " + sensorDataList.length +
        ", syncLaunchedCalls.length = " + syncLaunchedCalls.length +
        ", syncPending? = " + syncPending);
      return syncPending;
    }).then(function (syncPending) {
      Logger.log("sync launched = " + syncPending);
      if (syncPending) {
        Logger.log("data is pending, showing confirm dialog");
        return $ionicPopup.confirm({ template: 'data pending for push' }).then(function (res) {
          if (res) {
            return forceSync();
          }
          Logger.log("user refused to re-sync");
          return undefined;
        });
      }
      return $ionicPopup.alert({ template: 'Thank you for your participation! Logging out now.' });
    }).catch(function (error) {
      Logger.displayError("Error while forcing sync", error);
      return undefined;
    });
  }

  // returnToIntro function from general-settings.js
  function returnToIntro() {
    var testReconsent = false;
    if (testReconsent) {
      $rootScope.req_consent.approval_date = Math.random();
      StartPrefs.loadPreferredScreen();
    } else {
      $state.go("root.intro");
    }
  }
  

  return { launch };
});
