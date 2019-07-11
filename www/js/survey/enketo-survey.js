'use strict';

angular.module('emission.survey.enketo.launch', [
  'emission.services',
  'emission.enketo-survey.service',
  'emission.plugin.logger',
])
.controller('EnketoSurveyCtrl', function($scope, $state, $stateParams, $rootScope,
  $ionicPopup, EnketoSurvey, CommHelper
) {
  CommHelper.getUser().then(function(profile){
      const uuid = profile.user_id["$uuid"];
      return uuid;
  }).then(function(uuid) {
      const form_location = $stateParams.form_location || "json/user-profile_v1.json";
      const opts = $stateParams.opts || JSON.stringify({
          session: {
              data_key: "manual/user_profile_survey",
              user_properties: {
                  uuid: uuid,
              },
          },
      });
      return EnketoSurvey.init({ form_location, opts, trip: $rootScope.confirmSurveyTrip});
  }).then(function(){
      $('.form-header').after(EnketoSurvey.getState().loaded_form);
      if(!$stateParams.form_location) {
        $(".previous-page").hide();
        $(".form-footer__jump-nav").hide();
      }
      return;
  }).then(EnketoSurvey.displayForm
  ).then(function(loadErrors){
    if (loadErrors.length > 0) {
      $ionicPopup.alert({template: "loadErrors: " + loadErrors.join(",")});
    }
  });

  $scope.validateForm = function() {
    EnketoSurvey.validateForm()
    .then(function(valid){
      if (!valid) {
        $ionicPopup.alert({template: 'Form contains errors. Please see fields marked in red.'});
      } else {
        const data = valid;
        const answer = EnketoSurvey.populateLabels(
          EnketoSurvey.makeAnswerFromAnswerData(data)
        );
        $rootScope.confirmSurveyTrip.userSurveyAnswer = answer;
        if ($rootScope.confirmSurveyIntroMode) {
            $rootScope.confirmSurveyIntroMode = false;
            $rootScope.$broadcast('USERPROFILE_SUBMIT');
          return;
        }
        $state.go($rootScope.previousState, $rootScope.previousStateParams);
      }
    });
  }
});
