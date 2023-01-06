
/**
 * A directive to display the list of notes for a trip or place
 */

angular.module('emission.survey.enketo.notes-list', [])

  .directive("enketoNotesList", function () {
    return {
      restrict: 'E',
      scope: {
        entries: '=', // an array of trip- or place- additions to display
      },
      controller: 'NotesListCtrl',
      templateUrl: 'templates/survey/enketo/notes_list.html'
    };
  })

  .controller("NotesListCtrl", function ($scope, $state) {
    console.log("Notes List Controller called");

    $scope.deleteEntry = (entry) => {
      console.log("Deleting entry", entry);
      // TODO
    }
  });
