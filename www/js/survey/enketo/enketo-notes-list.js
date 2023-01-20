
/**
 * A directive to display the list of notes for a trip or place
 */

angular.module('emission.survey.enketo.notes-list', [])

  .directive("enketoNotesList", function () {
    return {
      restrict: 'E',
      scope: {
        entries: '=', // an array of trip- or place- additions to display
        isplace: '='
      },
      controller: 'NotesListCtrl',
      templateUrl: 'templates/survey/enketo/notes_list.html'
    };
  })

  .controller("NotesListCtrl", function ($scope, $state, $window) {
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

    $scope.deleteEntry = (index, entry) => {
      console.log("Deleting entry", entry);

      const dataKey = entry.key || entry.metadata.key;
      const data = entry.data;
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
