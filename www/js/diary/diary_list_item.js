/**
 * A directive to display a diary list item.
 */

angular.module('emission.main.diary.diarylistitem', [
    'ui-leaflet',
    'emission.main.diary.list',
    'emission.services',
])

.directive("diaryListItem", function(){
    return{
        restrict: 'E',
        scope: {
            tripgj: '='
        },
        controller: 'DiaryListItemCtrl',
        templateUrl: 'templates/diary/diary_list_item.html'
    };
})

.controller("DiaryListItemCtrl", function(
                                        $scope,
                                        SurveyOptions,
                                        $state, Config
){
    $scope.surveyOpt = SurveyOptions.MULTILABEL;
    const DEFAULT_ITEM_HT = 335;
    $scope.itemHt = DEFAULT_ITEM_HT;

    $scope.toDetail = function (param) {
        $state.go('root.main.diary-detail', {
            tripId: param
        });
    }
    angular.extend($scope, {
        defaults: {
            zoomControl: false,
            dragging: false,
            zoomAnimation: true,
            touchZoom: false,
            scrollWheelZoom: false,
            doubleClickZoom: false,
            boxZoom: false,
        }
    });

    angular.extend($scope.defaults, Config.getMapTiles())
});
