'use strict';
angular.module('emission.main.common.detail',['ui-leaflet',
                                      'ionic-datepicker',
                                      'emission.services'])

.controller("CommonDetailCtrl", function($scope, $stateParams,
                                        Timeline, DiaryHelper,Config) {
    $scope.placeId = $stateParams.placeId;
});
