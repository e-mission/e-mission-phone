/*
 * Directive to display a survey for each trip
 * Assumptions:
 * - The directive is embedded within an ion-view
 * - The controller for the ion-view has a function called
 *      'recomputeDisplayTrips` which modifies the trip *list* as necessary. An
 *      example with the label view is removing the labeled trips from the
 *      "toLabel" filter. Function can be a no-op (for example, in
 *      the diary view)
 * - The view is associated with a state which we can record in the client stats.
 * - The directive implements a `verifyTrip` function that can be invoked by
 *      other components.
 */

angular.module('emission.survey.enketo.demographics',
    ['emission.stats.clientstats',
        'emission.services',
        'emission.survey.enketo.launch',
        'emission.survey.enketo.answer',
        'emission.survey.enketo.preview',
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
          .launch($scope, 'UserProfileSurvey', { prev_demographic_survey: lastSurvey,
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
        $ionicPopup.alert({template: 'Form contains errors. Please see fields marked in red.'});
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
              .initSurvey('UserProfileSurvey', { prev_demographic_survey: $scope.existingSurvey,
                showBackButton: true, showFormFooterJumpNav: true  })
              .then(result => {
                console.log("demographic survey result ", result);
              }).catch(e => console.trace(e));
        }
    }, 10); // wait for 10 ms to load to ensure that the form is in place
  }

  $scope.initForm = function() {
    return EnketoDemographicsService.loadPriorDemographicSurvey().then((lastSurvey) => {
        $scope.$apply(() => $scope.existingSurvey = lastSurvey);
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
              .initSurvey('UserProfileSurvey', { prev_demographic_survey: $scope.existingSurvey,
                showBackButton: true, showFormFooterJumpNav: true  })
              .then(result => {
                console.log("demographic survey result ", result);
              }).catch(e => console.trace(e));
        }
    });
  };

  $scope.init = function() {
      console.log("During initialization of the button control", $scope.trip);
      $scope.initForm().then(() => {
        console.log("finished loading form");
      });;
  }

  $ionicPlatform.ready(() => $scope.init());
})
.factory("EnketoDemographicsService", function(UnifiedDataLoader, $window) {
  var eds = {};
  console.log("Creating EnketoDemographicsService");
  eds.key = "manual/demographic_survey";

  var _getMostRecent = function(answers) {
    answers.sort((a, b) => a.metadata.write_ts < b.metadata.write_ts);
    console.log("first answer is ", answers[0], " last answer is ", answers[answers.length-1]);
    return answers[0];
  }

  /*
   * We retrieve all the records every time instead of caching because of the
   * usage pattern. We assume that the demographic survey is edited fairly
   * rarely, so loading it every time will likely do a bunch of unnecessary work.
   * Loading it on demand seems like the way to go. If we choose to experiment
   * with incremental updates, we may want to revisit this.
   */
  eds.loadPriorDemographicSurvey = function() {
    const tq = $window.cordova.plugins.BEMUserCache.getAllTimeQuery();
    return UnifiedDataLoader.getUnifiedMessagesForInterval(eds.key, tq)
        .then(answers => _getMostRecent(answers));
  }

  return eds;
});
