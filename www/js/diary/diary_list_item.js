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
            tripgj: '=',
            config: '=',
        },
        controller: 'DiaryListItemCtrl',
        templateUrl: 'templates/diary/diary_list_item.html'
    };
})

.controller("DiaryListItemCtrl", function($scope, SurveyOptions, $state, Config) {
    const surveyOptKey = $scope.config?.survey_info?.['trip-labels'];
    $scope.surveyOpt = SurveyOptions[surveyOptKey];
    console.log('surveyOpt in diary_list_item.js is', $scope.surveyOpt);
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
