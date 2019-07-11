'use strict';

angular.module('emission.survey.enketo.launch', [
  'emission.services',
  'emission.enketo-survey.service',
  'emission.plugin.logger',
])
.factory('EnketoSurveyLaunch', function(
  $rootScope, $ionicPopup, EnketoSurvey, CommHelper
) {
  var __uuid = null;

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

  function initConfirmSurvey() {
    return initSurvey({
      form_location: 'json/trip-end-survey_v9.json',
      opts: {
        session: {
          data_key: 'manual/confirm_survey',
        },
      },
      trip: $rootScope.confirmSurveyTrip,
    });
  }

  function initProfileSurvey() {
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

  function resetView() {
    EnketoSurvey.getState().form.resetView();
    $('.enketo-plugin article > form').remove();
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
        resetView();
        if ($rootScope.confirmSurveyTrip) {
          $rootScope.confirmSurveyTrip.userSurveyAnswer = answer;
          $rootScope.$broadcast('CONFIRMSURVEY_SUBMIT');
        }
        if ($rootScope.confirmSurveyUserProfile) {
          $rootScope.confirmSurveyUserProfile = false;
          $rootScope.$broadcast('USERPROFILE_SUBMIT');
        }
        return;
      }
    });
  }

  return {
    initConfirmSurvey: initConfirmSurvey,
    initProfileSurvey: initProfileSurvey,
    validateForm: validateForm,
    resetView: resetView,
  };
});
