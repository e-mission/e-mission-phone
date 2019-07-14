'use strict';

angular.module('emission.survey.enketo.launch', [
  'emission.services',
  'emission.enketo-survey.service',
  'emission.plugin.logger',
])
.factory('EnketoSurveyLaunch', function(
  $ionicPopup, EnketoSurvey, CommHelper, $ionicModal
) {
  var __uuid = null;
  var __modal = null;
  var surveyTypeMap = {
    UserProfile: initProfileSurvey,
    ConfirmSurvey: initConfirmSurvey,
  };
  var __type = null;
  var __modal_scope = null;
  var __opts = null;

  function reset() {
    if (__modal) {
      __modal.remove();
    }
    __modal = null;
    __type = null;
    __modal_scope = null;
    __opts = null;
  }

  function launch(scope, type, opts) {
    return new Promise(function(resolve, reject) {
      reset();
      __opts = opts;
      __modal_scope = scope;
      __type = type;
      $ionicModal.fromTemplateUrl('templates/survey/enketo-survey-modal.html', {
        scope: __modal_scope
      }).then(function (modal) {
        __modal = modal;
        __modal_scope.enketoSurvey = {
          disableDismiss: (opts && opts.disableDismiss) ? true : false,
          validateForm: validateForm,
          hide: function(success = false) { __modal.hide(); resolve(success); },
        }
        surveyTypeMap[type](opts);
        __modal.show();
      });
    });
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
        form_location: 'json/user-profile_v1.json',
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
    });
  }

  return { launch };
});
