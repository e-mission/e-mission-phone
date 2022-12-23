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

angular.module('emission.survey.enketo.add-note-button',
    ['emission.stats.clientstats',
        'emission.services',
        'emission.config.dynamic',
        'emission.survey.enketo.launch',
        'emission.survey.enketo.answer',
        'emission.survey.enketo.preview',
        'emission.survey.inputmatcher'])
.directive('enketoAddNoteButton', function() {
  return {
    scope: {
      survey: '@',
    },
    controller: "EnketoAddNoteButtonCtrl",
    templateUrl: 'templates/survey/enketo/add-note-button.html'
  };
})
.controller("EnketoAddNoteButtonCtrl", function($scope, $element, $attrs, $translate,
    EnketoSurveyLaunch, $ionicPopover, ClientStats, DynamicConfig,
    EnketoTimeuseService) {
  console.log("Invoked enketo directive controller for add-note-button");
  $scope.notes = []

  DynamicConfig.configReady().then((newConfig) => {
    Logger.log("Resolved UI_CONFIG_READY promise in enketo-time-use.js, filling in templates");
    $scope.ui_config = newConfig;

    const surveyKey = $scope.ui_config.surveys[$scope.survey];
    if (!surveyKey) {
      console.log(`No survey found for target ${$scope.survey}. Skipping...`);
      return;
    }
    const survey = $scope.ui_config.surveys?.[surveyKey];
    const localeCode = $translate.use();
    $scope.label = survey['not-filled-in-label']?.[localeCode];
    console.log('localecode is ', localeCode);

    console.log('label is ', $scope.label);
    console.log('survey is ', survey);
  })

  $scope.openPopover = function ($event) {

    
    // TODO launch the survey

    // return EnketoTimeuseService.loadPriorTimeuseSurvey().then((lastSurvey) => {
    //     return EnketoSurveyLaunch
    //       .launch($scope, 'TimeUseSurvey', { prev_timeuse_survey: lastSurvey,
    //             showBackButton: true, showFormFooterJumpNav: true })
    //       .then(result => {
    //         console.log("timeuse survey result ", result);
    //         $scope.timeUse.push(result);
    //         $scope.timeUse.forEach(e => {
    //           console.log("Timeuse array ", e);
    //         });
    //       });
    // });
  };

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
