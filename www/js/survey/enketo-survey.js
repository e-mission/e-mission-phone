'use strict';

angular.module('emission.survey.enketo.launch', [
  'emission.services',
  'emission.enketo-survey.service',
  'emission.plugin.logger',
])
.factory('EnketoSurveyLaunch', function(
  $state, $rootScope,
  $ionicPopup, EnketoSurvey, CommHelper
) {
  // CommHelper.getUser().then(function(profile){
  //     const uuid = profile.user_id["$uuid"];
  //     return uuid;
  // }).then(function(uuid) {
  //     const form_location = $rootScope.confirmSurveyFormLocation || "json/user-profile_v1.json";
  //     const opts = Object.assign({}, $rootScope.confirmSurveyOpts) || {
  //         session: {
  //             data_key: "manual/user_profile_survey",
  //             user_properties: {
  //                 uuid: uuid,
  //             },
  //         },
  //     };
  //     $rootScope.confirmSurveyFormLocation = null;
  //     $rootScope.confirmSurveyOpts = null;
  //     return EnketoSurvey.init({ form_location, opts, trip: $rootScope.confirmSurveyTrip });
  // }).then(function(){
  //     $('.form-header').after(EnketoSurvey.getState().loaded_form);
  //     if(!$stateParams.form_location) {
  //       $(".previous-page").hide();
  //       $(".form-footer__jump-nav").hide();
  //     }
  //     return;
  // }).then(EnketoSurvey.displayForm
  // ).then(function(loadErrors){
  //   if (loadErrors.length > 0) {
  //     $ionicPopup.alert({template: "loadErrors: " + loadErrors.join(",")});
  //   }
  // });

  function initConfirmSurvey({form_location, opts }) {
    EnketoSurvey.init({ form_location, opts, trip: $rootScope.confirmSurveyTrip }).then(function(){
      $('.form-header').after(EnketoSurvey.getState().loaded_form);
      $(".previous-page").hide();
      $(".form-footer__jump-nav").hide();
      return;
    }).then(EnketoSurvey.displayForm
    ).then(function(loadErrors){
      if (loadErrors.length > 0) {
        $ionicPopup.alert({template: "loadErrors: " + loadErrors.join(",")});
      }
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
        if ($rootScope.confirmSurveyIntroMode) {
          $rootScope.confirmSurveyIntroMode = false;
          $rootScope.$broadcast('USERPROFILE_SUBMIT');
        }
        return;
      }
    });
  }

  return {
    initConfirmSurvey: initConfirmSurvey,
    validateForm: validateForm,
    resetView: resetView,
  };
});
