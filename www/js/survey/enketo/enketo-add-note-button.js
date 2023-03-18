/*
 * Directive to display a survey to add notes to a timeline entry (trip or place)
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
      timelineEntry: '=',
      notesConfig: '=',
      surveys: '=',
      datakey: '@',
    },
    controller: "EnketoAddNoteButtonCtrl",
    templateUrl: 'templates/survey/enketo/add-note-button.html'
  };
})
.controller("EnketoAddNoteButtonCtrl", function($scope, $element, $attrs, $translate,
    EnketoSurveyLaunch, $ionicPopover, ClientStats, DynamicConfig,
    EnketoNotesButtonService) {
  console.log("Invoked enketo directive controller for add-note-button");
  $scope.notes = [];

  const updateLabel = () => {
    const localeCode = $translate.use();
    if ($scope.notesConfig?.['filled-in-label'] && timelineEntry.additions?.length > 0) {
      $scope.displayLabel = $scope.notesConfig?.['filled-in-label']?.[localeCode];
    } else {
      $scope.displayLabel = $scope.notesConfig?.['not-filled-in-label']?.[localeCode];
    }
  }
  $scope.$watch('notesConfig', updateLabel);
  $scope.$watch('timelineEntry.additions', updateLabel);

  // return a dictionary of fields we want to prefill, using start/enter and end/exit times
  $scope.getPrefillTimes = () => {
    const begin = $scope.timelineEntry.start_fmt_time || $scope.timelineEntry.enter_fmt_time;
    const stop = $scope.timelineEntry.end_fmt_time || $scope.timelineEntry.exit_fmt_time;

    const momentBegin = moment.parseZone(begin);
    let momentStop = moment.parseZone(stop);
    // stop could be undefined because the last place will not have an exit time
    if (!stop) {
      // if begin is the same day as today, we will use the current time for stop
      // else, stop will be begin + 1 hour
      if (moment(begin).isSame(moment(), 'day')) {
        momentStop = moment.parseZone();
      } else {
        momentStop = moment(momentBegin).add(1, 'hour');
      }
    }

    return {
      "Date": momentBegin.format('YYYY-MM-DD'),
      "Start_time": momentBegin.format('HH:mm:ss.SSSZ'),
      "End_time": momentStop.format('HH:mm:ss.SSSZ')
    }
  }

  const getScrollElement = function() {
    if (!$scope.scrollElement) {
        console.log("scrollElement is not cached, trying to read it ");
        const ionItemElement = $element.closest('ion-item')
        if (ionItemElement) {
            console.log("ionItemElement is defined, we are in a list, finding the parent scroll");
            $scope.scrollElement = ionItemElement.closest('ion-content');
        } else {
            console.log("ionItemElement is defined, we are in a detail screen, ignoring");
        }
    }
    // TODO: comment this out after testing to avoid log spew
    console.log("Returning scrollElement ", $scope.scrollElement);
    return $scope.scrollElement;
  }

  $scope.openPopover = function ($event, timelineEntry, inputType) {
    const surveyName = $scope.notesConfig.surveyName;
    console.log('About to launch survey ', surveyName);

    // The way isPlace is generated is very rudamentary, only checking to see if the datakey includes the word "place". We will want to change
    // this before pushing the final changes to a more permanent solution, but for now this at the very least works
    const isPlace = $scope.datakey?.includes("place");

    // prevents the click event from bubbling through to the card and opening the details page
    if ($event.stopPropagation) $event.stopPropagation();
    return EnketoSurveyLaunch
      .launch($scope, surveyName, { timelineEntry: timelineEntry, prefillFields: $scope.getPrefillTimes(), dataKey: $scope.datakey })
      .then(result => {
        if (!result) {
          return;
        }
        const addition = {
          data: result,
          write_ts: Date.now(),
          key: $scope.datakey
        };

        // adding the addition for display is handled in infinite_scroll_list.js
        $scope.$emit('enketo.noteAddition', addition, getScrollElement());
        
        // store is commented out since the enketo survey launch currently
        // stores the value as well
        // $scope.store(inputType, result, false);
      });
  };
})
.factory("EnketoNotesButtonService", function(InputMatcher, EnketoSurveyAnswer, Logger, $timeout) {
  var enbs = {};
  console.log("Creating EnketoNotesButtonService");
  enbs.SINGLE_KEY="NOTES";
  enbs.MANUAL_KEYS = [];

  /**
   * Set the keys for trip and/or place additions whichever will be enabled,
   * and sets the name of the surveys they will use.
   */
  enbs.initConfig = function(tripSurveyName, placeSurveyName) {
    enbs.tripSurveyName = tripSurveyName;
    if (tripSurveyName) {
       enbs.MANUAL_KEYS.push("manual/trip_addition_input")
    }
    enbs.placeSurveyName = placeSurveyName;
    if (placeSurveyName) {
       enbs.MANUAL_KEYS.push("manual/place_addition_input")
    }
  }

  /**
   * Embed 'inputType' to the timelineEntry.
   */
  enbs.extractResult = function(results) {
    const resultsPromises = [EnketoSurveyAnswer.filterByNameAndVersion(enbs.timelineEntrySurveyName, results)];
    if (enbs.timelineEntrySurveyName != enbs.placeSurveyName) {
      resultsPromises.push(EnketoSurveyAnswer.filterByNameAndVersion(enbs.placeSurveyName, results));
    }
    return Promise.all(resultsPromises);
  };

  enbs.processManualInputs = function(manualResults, resultMap) {
    console.log("ENKETO: processManualInputs with ", manualResults, " and ", resultMap);
    const surveyResults = manualResults.flat(2);
    resultMap[enbs.SINGLE_KEY] = surveyResults;
  }

  enbs.populateInputsAndInferences = function(timelineEntry, manualResultMap) {
    console.log("ENKETO: populating timelineEntry,", timelineEntry, " with result map", manualResultMap);
    if (angular.isDefined(timelineEntry)) {
        // initialize additions array as empty if it doesn't already exist
        timelineEntry.additions ||= [];
        enbs.populateManualInputs(timelineEntry, timelineEntry.nextEntry, enbs.SINGLE_KEY,
            manualResultMap[enbs.SINGLE_KEY]);
        timelineEntry.finalInference = {};
    } else {
        console.log("timelineEntry information not yet bound, skipping fill");
    }
  }

  /**
   * Embed 'inputType' to the timelineEntry
   * This is the version that is called from the list, which focuses only on
   * manual inputs. It also sets some additional values 
   */
  enbs.populateManualInputs = function (timelineEntry, nextTimelineEntry, inputType, inputList) {
      // Check unprocessed labels first since they are more recent
      const unprocessedLabelEntry = InputMatcher.getAdditionsForTimelineEntry(timelineEntry, inputList);
      var userInputEntry = unprocessedLabelEntry;
      if (!angular.isDefined(userInputEntry)) {
          userInputEntry = timelineEntry.timelineEntry_addition[enbs.inputType2retKey(inputType)];
      }
      enbs.populateInput(timelineEntry.additions, inputType, userInputEntry);
      // Logger.log("Set "+ inputType + " " + JSON.stringify(userInputEntry) + " for trip starting at " + JSON.stringify(trip.start_fmt_time));
      enbs.editingTrip = angular.undefined;
  }

  /**
   * Insert the given userInputLabel into the given inputType's slot in inputField
   */
  enbs.populateInput = function(timelineEntryField, inputType, userInputEntry) {
    if (angular.isDefined(userInputEntry)) {
          userInputEntry.forEach(ta => {
            timelineEntryField.push(ta);
          });
    }
  }

  return enbs;
});
