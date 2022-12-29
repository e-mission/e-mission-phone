/*
 * Directive to display a survey to add notes to a trip or place
 * 
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
      notesConfig: '=',
      surveys: '='
    },
    controller: "EnketoAddNoteButtonCtrl",
    templateUrl: 'templates/survey/enketo/add-note-button.html'
  };
})
.controller("EnketoAddNoteButtonCtrl", function($scope, $element, $attrs, $translate,
    EnketoSurveyLaunch, $ionicPopover, ClientStats, DynamicConfig,
    EnketoNotesService) {
  console.log("Invoked enketo directive controller for add-note-button");
  $scope.notes = []

  $scope.displayLabel = () => {
    const localeCode = $translate.use();
    // if already filled in
    //   return $scope.notesConfig?.['filled-in-label']?.[localeCode];
    return $scope.notesConfig?.['not-filled-in-label']?.[localeCode];
  }

  $scope.openPopover = function ($event, trip, inputType) {
    const surveyName = $scope.notesConfig.surveyName;
    console.log('About to launch survey ', surveyName);
    // const survey = $scope.surveys[surveyName];
    // console.log('survey formpath ', survey.formPath);
    return EnketoSurveyLaunch
      .launch($scope, surveyName, { trip: trip })
      .then(result => {
        if (!result) {
          return;
        }
        $scope.$apply(() => trip.userInput['NOTES'] = {
            data: result,
            write_ts: Date.now()
        });
        // store is commented out since the enketo survey launch currently
        // stores the value as well
        // $scope.store(inputType, result, false);
      });
  };
})
.factory("EnketoNotesService", function(UnifiedDataLoader, $window) {
  // TODO
  return {}
});