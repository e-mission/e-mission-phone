/**
 * A directive to display a diary list item.
 */

angular.module('emission.main.diary.diarylistitem', [
    'ui-leaflet',
    'emission.main.diary.list'
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
                                        $state
){
    $scope.surveyOpt = SurveyOptions.MULTILABEL;
    const DEFAULT_ITEM_HT = 335;
    $scope.itemHt = DEFAULT_ITEM_HT;

    $scope.toDetail = function (param) {
        $state.go('root.main.diary-detail', {
            tripId: param
        });
    }
});