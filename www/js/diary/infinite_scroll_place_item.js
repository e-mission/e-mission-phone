
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

    // timebounds is used in js/survey/enketo/enketo-add-note-button.js getPrefillTimes() function
    // this allows us to pre-fill time and date in surveys that have 'Date', 'Start_time', and 'End_time' fields
    $scope.timeBounds = () => {
      let obj = {
        isPlace: true,
        enter_fmt_time: $scope.place?.start_fmt_time,
        exit_fmt_time: $scope.place?.end_fmt_time
      }
      if(!obj.exit_fmt_time) obj.exit_fmt_time = moment().format();
      return obj;
    };

    // config will initially be undefined, so we will watch
    $scope.$watch('config', function (loadedConfig) {
      // if place-notes button config is not present, then we won't even show the 'add note button'
      $scope.configPlaceNotes = loadedConfig?.survey_info?.buttons?.['place-notes'];
    });
  });
