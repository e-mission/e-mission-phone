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
      trip: '=',
      notesConfig: '=',
      surveys: '=',
      timeBounds: '=',
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

  $scope.getPartialTimeUseResponse = () => {
    const timebounds = $scope.timeBounds(); // for trips, these times are start and end of trip
                                            // for places, it is enter and exit time (end of one trip and start of next)

    // Prefill the time bounds of the trip into the survey
    const startDayAndTime = timebounds.start_fmt_time.split('T');
    const startHMS = startDayAndTime[1].substring(0, 8); // truncated to 8 chars for HH:MM:SS
    const startTimezoneCode = startDayAndTime[1].split('-')[1];
    const startTime = `${startHMS}.000-${startTimezoneCode}`
    const endDayAndTime = timebounds.end_fmt_time.split('T');
    const endHMS = endDayAndTime[1].substring(0, 8); // truncated to 8 chars for HH:MM:SS
    const endTimezoneCode = endDayAndTime[1].split('-')[1];
    const endTime = `${endHMS}.000-${endTimezoneCode}`

    // TODO: Hardcoding a partial TimeUseSurvey response for now
    // Can we come up with a more generic and more elegant way to do this ?
    return {
      data: {
        name: "TimeUseSurvey",
        xmlResponse:
        `<a88RxBtE3jwSar3cwiZTdn xmlns:jr=\"http://openrosa.org/javarosa\" xmlns:orx=\"http://openrosa.org/xforms\" id=\"a88RxBtE3jwSar3cwiZTdn\">
          <start>${timebounds.start_fmt_time}</start>
          <end>${timebounds.end_fmt_time}</end>
          <group_hg4zz25>
            <Date>${startDayAndTime[0]}</Date>    ${/* YY:MM:DD */''}
            <Start_time>${startTime}</Start_time> ${/* HH:MM:SS.mmm-HH:MM */''}
            <End_time>${endTime}</End_time>
          </group_hg4zz25>
        </a88RxBtE3jwSar3cwiZTdn>`
      }
    };
  }

  $scope.openPopover = function ($event, trip, inputType) {
    const surveyName = $scope.notesConfig.surveyName;
    console.log('About to launch survey ', surveyName);

    let partialTimeUseResponse;
    if (surveyName == 'TimeUseSurvey') {
      partialTimeUseResponse = $scope.getPartialTimeUseResponse();
    }

    if ($event.stopPropagation) $event.stopPropagation();
    return EnketoSurveyLaunch
      .launch($scope, surveyName, { trip: trip, prefilledSurveyResponse: partialTimeUseResponse })
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