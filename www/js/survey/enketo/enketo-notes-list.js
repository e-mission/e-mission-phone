
/**
 * A directive to display the list of notes for a trip or place
 */

angular.module('emission.survey.enketo.notes-list', [])

  .directive("enketoNotesList", function () {
    return {
      restrict: 'E',
      scope: {
        entries: '=', // an array of trip- or place- additions to display
        timezone: '=',
      },
      controller: 'NotesListCtrl',
      templateUrl: 'templates/survey/enketo/notes_list.html'
    };
  })

  .controller("NotesListCtrl", function ($scope, $state, $element, $window) {
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

    $scope.setDisplayTime = function(entry) {
      const timezone = $scope.timezone;
      const beginTs = entry.data.start_ts || entry.data.enter_ts;
      const stopTs = entry.data.end_ts || entry.data.exit_ts;
      const begin = moment.parseZone(beginTs*1000).tz(timezone).format("h:mm A");
      const stop = moment.parseZone(stopTs*1000).tz(timezone).format("h:mm A");
      return entry.displayTime = begin + " - " + stop;
    }

    $scope.deleteEntry = (entry) => {
      console.log("Deleting entry", entry);

      const dataKey = entry.key || entry.metadata.key;
      const data = entry.data;
      const index = $scope.entries.indexOf(entry);
      data.status = 'DELETED';

      return $window.cordova.plugins.BEMUserCache
        .putMessage(dataKey, data)
        .then(() => 
          $scope.$apply(() => {
            $scope.entries.splice(index, 1);
            const scrollElement = getScrollElement();
            if (scrollElement) scrollElement.trigger('scroll-resize');
          })
        );
    }
  });
