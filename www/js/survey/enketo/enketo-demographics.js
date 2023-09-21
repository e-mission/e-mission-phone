import angular from 'angular';

angular.module('emission.survey.enketo.demographics',
    ['emission.stats.clientstats',
        'emission.services',
        'emission.survey.enketo.launch',
        'emission.survey.enketo.answer',
        // 'emission.survey.enketo.preview',
        'emission.survey.inputmatcher'])
.directive('enketoDemographicsButton', function() {
  return {
    scope: {
    },
    controller: "EnketoDemographicsButtonCtrl",
    templateUrl: 'templates/survey/enketo/demographics-button.html'
  };
})
.directive('enketoDemographicsInline', function() {
  return {
    scope: {
        ngDone: "=",
    },
    controller: "EnketoDemographicsInlineCtrl",
    templateUrl: 'templates/survey/enketo/inline.html'
  };
})
.controller("EnketoDemographicsButtonCtrl", function($scope, $element, $attrs,
    EnketoSurveyLaunch, $ionicPopover, ClientStats,
    EnketoDemographicsService) {
  console.log("Invoked enketo directive controller for demographics ");

  $scope.openPopover = function ($event) {
    return EnketoDemographicsService.loadPriorDemographicSurvey().then((lastSurvey) => {
        return EnketoSurveyLaunch
          .launch($scope, 'UserProfileSurvey', { prefilledSurveyResponse: lastSurvey?.data?.xmlResponse,
                showBackButton: true, showFormFooterJumpNav: true  })
          .then(result => {
            console.log("demographic survey result ", result);
          });
    });
  };

  $scope.init = function() {
      console.log("During initialization of the button control", $scope.trip);
  }

  $scope.init();
})
.controller("EnketoDemographicsInlineCtrl", function($scope, $window, $element, $attrs,
    $http, EnketoSurveyLaunch, EnketoSurvey, $ionicPopover, ClientStats,
    EnketoDemographicsService, $ionicPlatform, $timeout) {
  console.log("Invoked enketo inline directive controller for demographics ");

  var validateAndSave = function() {
    return EnketoSurvey.validateAndSave()
    .then(result => {
      if (!result) {
        $ionicPopup.alert({template: i18next.t('survey.enketo-form-errors')});
      } else {
        $scope.ngDone();
      }
    });
  }

  $scope.enketoSurvey = {
    disableDismiss: true,
    validateAndSave
  }

  $scope.setEditSurveyAnswer = function(newVal) {
    $scope.editSurveyAnswer = newVal;
    $timeout(() => {
        if (newVal) {
            /*
             * if we had an existing survey, we want to wait until the user chooses
             * to edit it to display the form. But then we also have to wait to
             * initialize the form.
             * https://github.com/e-mission/e-mission-docs/issues/727#issuecomment-1126720935
             */
            return EnketoSurveyLaunch
              .initSurvey('UserProfileSurvey', { prefilledSurveyResponse: $scope.existingSurvey?.data?.xmlResponse,
                showBackButton: true, showFormFooterJumpNav: true  })
              .then(result => {
                console.log("demographic survey result ", result);
              }).catch(e => console.trace(e));
        }
    }, 50); // wait for 50 ms to load to ensure that the form is in place
  }

  $scope.initForm = function() {
    $scope.loading = true;
    return EnketoDemographicsService.loadPriorDemographicSurvey().then((lastSurvey) => {
        $scope.$apply(() => { $scope.loading = false; $scope.existingSurvey = lastSurvey});
        console.log("ENKETO: existing survey ", $scope.existingSurvey);
        if (!$scope.existingSurvey) {
            /*
             * if we don't have an existing survey, we will display the form
             * without any prompt and want to show it immediately. However, if
             * we have an existing response, then we want to see if the user
             * wants to edit it, which means that we won't have a form to
             * initialize here. We will initialize the form in
             * setEditSurveyAnswer instead
             */
            return EnketoSurveyLaunch
              .initSurvey('UserProfileSurvey', { prefilledSurveyResponse: $scope.existingSurvey?.data?.xmlResponse,
                showBackButton: true, showFormFooterJumpNav: true  })
              .then(result => {
                console.log("demographic survey result ", result);
              }).catch(e => console.trace(e));
        }
    }).catch(() => {
        $scope.$apply(() => {$scope.loading = false;});
    });
  };

  $scope.init = function() {
      console.log("During initialization of the button control", $scope.trip);
      $scope.initForm().then(() => {
        console.log("finished loading form");
      });;
  }

  $ionicPlatform.ready(() => $scope.init());
});
