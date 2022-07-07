
/**
 * A directive to display each trip within the diary view.
 */

angular.module('emission.main.diary.infscrolltripitem', [
                                                        'emission.main.diary.infscrolllist',
                                                        'emission.survey.multilabel.services'

])

.directive("infiniteScrollTripItem", function(){
    return{
      restrict: 'E',
      scope: {
        trip: '='
      },
      controller: 'TripItemCtrl',
      templateUrl: 'templates/diary/trip_list_item.html'
    };
  })

  .controller("TripItemCtrl", function($scope,
                                        SurveyOptions,
                                        $state
                                        ){
    const DEFAULT_ITEM_HT = 150;
    $scope.surveyOpt = SurveyOptions.MULTILABEL;
    $scope.itemHt = DEFAULT_ITEM_HT;

    // Added function from infiniteDiaryListCtrl
    $scope.showDetail = function($event, trip) {
      $state.go("root.main.inf_scroll-detail", {
          tripId: trip.id
      });
    }
});