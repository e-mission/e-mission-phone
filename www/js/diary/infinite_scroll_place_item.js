
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
        trip: '=',
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

    // This timebounds funciton is used in js/survey/enketo/enketo-add-note-button.js getPartialTimeUseResponse() function
    // This function is used to pre-fill the enketo TimeUse survey for programs/studies using the timeuse survey
    $scope.timeBounds = () => {
      let obj = {
        isPlace: true,
        enter_fmt_time: $scope.trip?.end_fmt_time,
        exit_fmt_time: $scope.trip?.nextTrip?.start_fmt_time
      }
      if(!obj.exit_fmt_time) obj.exit_fmt_time = moment().format();
      return obj;
    };
    $scope.configPlaceNotes = () => $scope.config?.survey_info?.buttons?.['place-notes'];
  });
