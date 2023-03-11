
/**
 * A directive to display each place within the diary view.
 */

angular.module('emission.main.diary.infscrollplaceitem',
    ['emission.main.diary.infscrolllist',
        'emission.survey.multilabel.services',
        'emission.services',
        'emission.config.imperial',
        'emission.config.dynamic',
        'emission.plugin.logger',
        'emission.stats.clientstats',
        'emission.survey.enketo.add-note-button',])

  .directive("infiniteScrollPlaceItem", function () {
    return {
      restrict: 'E',
      scope: {
        place: '=',
        config: '=',
        surveys: '=',
      },
      controller: 'PlaceItemCtrl',
      templateUrl: 'templates/diary/place_list_item.html'
    };
  })

  .controller("PlaceItemCtrl", function ($scope, $state, DynamicConfig) {
    console.log("Place Item Controller called");
    console.log('config is ', $scope.config);

    // config will initially be undefined, so we will watch
    $scope.$watch('config', function (loadedConfig) {
      // if place-notes button config is not present, then we won't even show the 'add note button'
      $scope.configPlaceNotes = loadedConfig?.survey_info?.buttons?.['place-notes'];
    });
  });
