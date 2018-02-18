'use strict';

angular.module('emission.main.bear',['nvd3', 'emission.services', 'ionic-datepicker', 'emission.main.metrics.factory', 'angularLocalStorage', 'emission.plugin.logger'])

.controller('BearCtrl', function($scope, $ionicActionSheet, $ionicLoading,
                                    CommHelper, $window, $ionicPopup,
                                    FootprintHelper, CalorieCal, $ionicModal, $timeout, storage,
                                    $ionicScrollDelegate, $rootScope, $location,  $state, ReferHelper, $http, Logger) {
  $scope.myBear = {};
  $scope.otherBears = {};
  var totalWidth = 600;
  var leftPad;
  var totalSize;
  CommHelper.getPolarBears().then(function(response) {
      $scope.myBear = response.myBear;
      $scope.otherBears = response.otherBears;
      totalSize = parseFloat($scope.myBear['size']);
      for (var i = 0; i < $scope.otherBears.length; i++) {
        totalSize += parseFloat($scope.otherBears[i]['size']);
      }
      var scale = totalWidth/totalSize; //or 40 maximum
      if (scale > 40) {
        scale = 40;
      }
      $scope.myBear['left'] = 280;
      $scope.myBear['top'] = 640;
      console.log(totalWidth);
      console.log(totalSize);
      console.log(scale);
      $scope.myBear['size'] = response.myBear.size * scale;
      if (parseFloat($scope.myBear['happiness'] > 0.5)) {
        $scope.myBear['img'] = "happybear.gif";
      } else if (parseFloat($scope.myBear['happiness'] > -0.5)) {
        $scope.myBear['img'] = "neutralbear.gif";
      } else {
        $scope.myBear['img'] = "sadbear.gif";
      }
      leftPad = $scope.myBear['left'] + $scope.myBear['size'];

      for (var i = 0; i < $scope.otherBears.length(); i++) {
        $scope.otherBears[i]['left'] = leftPad + $scope.otherBears[i]['size'] * scale;
        leftPad = leftPad + $scope.otherBears[i]['size'] * scale;
        $scope.otherBears[i]['top'] = 640 - $scope.otherBears[i]['size'] * scale / 2;
        if (parseFloat($scope.otherBears[i]['happiness'] > 0.5)) {
          $scope.otherBears[i]['img'] = "happybear.gif";
        } else if (parseFloat($scope.myBear['happiness'] > -0.5)) {
          $scope.otherBears[i]['img'] = "neutralbear.gif";
        } else {
          $scope.otherBears[i]['img'] = "sadbear.gif";
        }
      }
  }, function(error) {
      console.log(error);
      console.log("Failed");
  });

  var initZoom=0.75;
  $scope.$on('$ionicView.enter',function(){
    $ionicScrollDelegate.$getByHandle('bearScroller').zoomBy(initZoom);
  });

  $scope.onLoad = function(){
      CommHelper.getHappiness().then(function(response) {
          console.log("Success!");
          console.log(response);
          $scope.bear.happiness = response.happiness;
      }, function(error) {
          console.log(error);
          console.log("Failed");
      });
  };

  $scope.getPolarBears = function(){
      console.log($scope.myBear);
      console.log($scope.otherBears);
      CommHelper.getPolarBears().then(function(response) {
        console.log(response);
      }, function(error) {
          console.log(error);
          console.log("Failed");
      })
  };
});
