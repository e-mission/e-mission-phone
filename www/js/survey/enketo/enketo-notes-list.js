
/**
 * A directive to display the list of notes for a trip or place
 */

angular.module('emission.survey.enketo.notes-list',
    ['emission.survey.enketo.launch'])

  .directive("enketoNotesList", function () {
    return {
      restrict: 'E',
      scope: {
        timelineEntry: '=', // the trip or place for which we are displaying notes
        additionEntries: '=', // an array of trip- or place- additionEntries to display
        timezone: '=',
      },
      controller: 'NotesListCtrl',
      templateUrl: 'templates/survey/enketo/notes_list.html'
    };
  })

  .controller("NotesListCtrl", function ($scope, $state, $element, $window, $ionicPopup,
                                EnketoSurveyLaunch, DiaryHelper) {
    console.log("Notes List Controller called");

    const getScrollElement = function() {
      if (!$scope.scrollElement) {
          const ionItemElement = $element.closest('ion-item')
          if (ionItemElement) {
              $scope.scrollElement = ionItemElement.closest('ion-content');
          }
      }
      return $scope.scrollElement;
    }

    $scope.setDisplayDt = function(entry) {
      const timezone = $scope.timelineEntry.start_local_dt?.timezone
                      || $scope.timelineEntry.enter_local_dt?.timezone
                      || $scope.timelineEntry.end_local_dt?.timezone
                      || $scope.timelineEntry.exit_local_dt?.timezone;
      const beginTs = entry.data.start_ts || entry.data.enter_ts;
      const stopTs = entry.data.end_ts || entry.data.exit_ts;
      let d;
      if (DiaryHelper.isMultiDay(beginTs, stopTs)) {
        d = `${moment.parseZone(beginTs*1000).tz(timezone).format('MMM D')} - ${moment.parseZone(stopTs*1000).tz(timezone).format('MMM D')}`
      }
      const begin = moment.parseZone(beginTs*1000).tz(timezone).format('LT');
      const stop = moment.parseZone(stopTs*1000).tz(timezone).format('LT');
      return entry.displayDt = {
        date: d,
        time: begin + " - " + stop
      }
    }

    $scope.confirmDeleteEntry = (entry) => {
      $scope.currEntry = entry;
      $ionicPopup.show({title: 'Delete entry',
      templateUrl: `templates/survey/enketo/delete-entry.html`, 
      scope: $scope,
        buttons: [{
          text: 'Delete',
          type: 'button-cancel',
          onTap: function(e) {
            return $scope.deleteEntry(entry);
          }
          },{
          text: 'Cancel',
          type: 'button-stable',
        }]
      });

      return;
    }

    $scope.deleteEntry = (entry) => {
      console.log("Deleting entry", entry);

      const dataKey = entry.key || entry.metadata.key;
      const data = entry.data;
      const index = $scope.additionEntries.indexOf(entry);
      data.status = 'DELETED';

      return $window.cordova.plugins.BEMUserCache
        .putMessage(dataKey, data)
        .then(() => 
          $scope.$apply(() => {
            $scope.additionEntries.splice(index, 1);
            const scrollElement = getScrollElement();
            if (scrollElement) scrollElement.trigger('scroll-resize');
          })
        );
    }

    $scope.editEntry = (entry) => {
      const prevResponse = entry.data.xmlResponse;
      const dataKey = entry.key || entry.metadata.key;
      const surveyName = entry.data.name;
      return EnketoSurveyLaunch
        .launch($scope, surveyName, { prefilledSurveyResponse: prevResponse, dataKey: dataKey, timelineEntry: $scope.timelineEntry })
        .then(result => {
          if (!result) {
            return;
          }
          const addition = {
            data: result,
            write_ts: Date.now(),
            key: dataKey
          };

          // adding the addition for display is handled in infinite_scroll_list.js
          $scope.$emit('enketo.noteAddition', addition, getScrollElement());
          
          $scope.deleteEntry(entry);

          // store is commented out since the enketo survey launch currently
          // stores the value as well
          // $scope.store(inputType, result, false);
        });
    }
  });
