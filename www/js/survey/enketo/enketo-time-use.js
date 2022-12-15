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

angular.module('emission.survey.enketo.time-use',
    ['emission.stats.clientstats',
        'emission.services',
        'emission.survey.enketo.launch',
        'emission.enketo-survey.answer',
        'emission.survey.enketo.preview',
        'emission.survey.inputmatcher'])
.directive('enketoTimeuseButton', function() {
  return {
    scope: {
    },
    controller: "EnketoTimeuseButtonCtrl",
    templateUrl: 'templates/survey/enketo/timeuse-button.html'
  };
})
.directive('enketoTimeuseInline', function() {
  return {
    scope: {
        ngDone: "=",
    },
    restrict: 'E',
    controller: "EnketoTimeuseInlineCtrl",
    templateUrl: 'templates/survey/enketo/timeuse-inline.html'
  };
})
.controller("EnketoTimeuseButtonCtrl", function($scope, $element, $attrs,
    EnketoSurveyLaunch, $ionicPopover, ClientStats,
    EnketoTimeuseService) {
  console.log("Invoked enketo directive controller for time-use ");

  $scope.openPopover = function ($event) {
    return EnketoTimeuseService.loadPriorTimeuseSurvey().then((lastSurvey) => {
        return EnketoSurveyLaunch
          .launch($scope, 'TimeUseSurvey', { prev_timeuse_survey: lastSurvey,
                showBackButton: true, showFormFooterJumpNav: true  })
          .then(result => {
            console.log("timeuse survey result ", result);
          });
    });
  };

  $scope.init = function() {
      console.log("During initialization of the button control", $scope.trip);
  }

  $scope.init();
})
.controller("EnketoTimeuseInlineCtrl", function($scope, $window, $element, $attrs,
    $http, EnketoSurveyLaunch, EnketoSurvey, $ionicPopover, ClientStats,
    EnketoTimeuseService, $ionicPlatform, $timeout) {
  console.log("Invoked enketo inline directive controller for time use ");

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
              .initSurvey('UserProfileSurvey', { prev_timeuse_survey: $scope.existingSurvey,
                showBackButton: true, showFormFooterJumpNav: true  })
              .then(result => {
                console.log("time use survey result ", result);
              }).catch(e => console.trace(e));
        }
    }, 10); // wait for 10 ms to load to ensure that the form is in place
  }

  $scope.initForm = function() {
    return EnketoTimeuseService.loadPriorTimeuseSurvey().then((lastSurvey) => {
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
              .initSurvey('UserProfileSurvey', { prev_timeuse_survey: $scope.existingSurvey,
                showBackButton: true, showFormFooterJumpNav: true  })
              .then(result => {
                console.log("time use survey result ", result);
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
.factory("EnketoTimeuseService", function(UnifiedDataLoader, $window) {
  var eds = {};
  console.log("Creating EnketoTimeuseService");
  eds.key = "manual/timeuse_survey";

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
  eds.loadPriorTimeuseSurvey = function() {
    const tq = $window.cordova.plugins.BEMUserCache.getAllTimeQuery();
    return UnifiedDataLoader.getUnifiedMessagesForInterval(eds.key, tq)
        .then(answers => _getMostRecent(answers));
  }

  return eds;
});
