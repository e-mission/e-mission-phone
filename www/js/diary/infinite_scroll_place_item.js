
/**
 * A directive to display each trip within the diary view.
 */

angular.module('emission.main.diary.infscrollplaceitem', [
                                                        'emission.main.diary.infscrolllist',
                                                        'emission.survey.multilabel.services',
                                                        'emission.main.diary.infscrolldetail',
                                                        'ng-walkthrough',
                                                        'nvd3', 'emission.plugin.kvstore',
                                                        'emission.services',
                                                        'emission.config.imperial',
                                                        'emission.plugin.logger',
                                                        'emission.stats.clientstats',
        'emission.survey.enketo.add-note-button',])

.directive("infiniteScrollPlaceItem", function(){
    return{
      restrict: 'E',
      scope: {
        trip: '='
      },
      controller: 'PlaceItemCtrl',
      templateUrl: 'templates/diary/place_list_item.html'
    };
  })

  .controller("PlaceItemCtrl", function($scope, $state) {
    console.log("Place Item Controller called");

    // TODO detail page for places
    // $scope.showDetail = function($event) {
    //   $state.go("root.main.inf_scroll-detail", {
    //  
    //   });
    // }
});
