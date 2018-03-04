'use strict';

angular.module('emission.main.bear',['nvd3', 'emission.services', 'ionic-datepicker', 'emission.main.metrics.factory', 'emission.stats.clientstats','angularLocalStorage', 'emission.plugin.logger'])

.controller('BearCtrl', function($scope, $ionicPlatform, $ionicActionSheet, $ionicLoading,
                                    CommHelper, $window, $ionicPopup,
                                    FootprintHelper, CalorieCal, $ionicModal, $timeout, storage,
                                    $ionicScrollDelegate, $rootScope, $location,  $state, ReferHelper, $http, Logger) {
  $scope.myBear = {};
  $scope.otherBears = [];
  var totalWidth = 600;
  var leftPad;
  var totalSize;
  $ionicPlatform.ready(function() {
      CommHelper.getPolarBears().then(function(response) {
        console.log(response)
        $scope.myBear = response.myBear;
        totalSize = parseFloat($scope.myBear['size']);
        for (var key in response.otherBears) {
          totalSize += parseFloat(response.otherBears[key]['size']);
        }
        var scale = totalWidth/totalSize; //or 40 maximum
        if (scale > 80) {
          scale = 80;
        }
        $scope.myBear['left'] = 260;
        $scope.myBear['top'] = 616 - (0.91 * response.myBear['size'] * scale) + 0.91 * 80;
        $scope.myBear['size'] = response.myBear.size * scale;
        if (parseFloat($scope.myBear['happiness']) > 0.5) {
          $scope.myBear['img'] = "happybear.gif";
        } else if (parseFloat($scope.myBear['happiness']) > -0.5) {
          $scope.myBear['img'] = "neutralbear.gif";
        } else {
          $scope.myBear['img'] = "sadbear.gif";
        }
        var leftPad = $scope.myBear['left'] + $scope.myBear['size'] + 5;
        for (var key in response.otherBears) {
          response.otherBears[key]['left'] = leftPad;
          leftPad = leftPad + response.otherBears[key]['size'] * scale + 5;
          response.otherBears[key]['top'] = 616 - (0.91 * response.otherBears[key]['size'] * scale) + 0.91 * 80;
          if (parseFloat(response.otherBears[key]['happiness']) > 0.5) {
            response.otherBears[key]['img'] = "happybear.gif";
          } else if (parseFloat(response.otherBears[key]['happiness']) > -0.5) {
            response.otherBears[key]['img'] = "neutralbear.gif";
          } else {
            response.otherBears[key]['img'] = "sadbear.gif";
          }
          response.otherBears[key]['name'] = key;
          response.otherBears[key]['size'] = response.otherBears[key]['size'] * scale;
          $scope.otherBears.push(response.otherBears[key]);
        }
        $state.reload();
      }, function(error) {
          console.log(error);
          console.log("Failed");
      });
    });
  $scope.$on('$ionicView.enter',function(){
    $ionicScrollDelegate.$getByHandle('bearScroller').scrollTo(100, 300);
    ClientStats.addEvent(ClientStats.getStatKeys().OPENED_APP).then(
        function() {
            console.log("Added "+ClientStats.getStatKeys().OPENED_APP+" event");
        });
  });

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
