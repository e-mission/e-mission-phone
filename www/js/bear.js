'use strict';

angular.module('emission.main.bear',['nvd3', 'emission.services', 'emission.stats.clientstats', 'ionic-datepicker', 'emission.main.metrics.factory', 'emission.stats.clientstats','angularLocalStorage', 'emission.plugin.logger'])

.controller('BearCtrl', function($scope, $ionicPlatform, $ionicActionSheet, $ionicLoading,
                                    CommHelper, $window, $ionicPopup, ClientStats,
                                    FootprintHelper, CalorieCal, $ionicModal, $timeout, storage,
                                    $ionicScrollDelegate, $rootScope, $location,  $state, ReferHelper, $http, Logger) {
  $scope.myBear = {};
  $scope.otherBears = [];
  var totalWidth = 600;
  var leftPad;
  var totalSize;
  $scope.$on('$ionicView.enter', function() {
    var newMyBear = {};
    var newOtherBears = [];
    $ionicScrollDelegate.$getByHandle('bearScroller').scrollTo(100, 300);
    CommHelper.getPolarBears().then(function(response) {
        newMyBear = response.myBear;
        totalSize = parseFloat(newMyBear['size']);
        for (var key in response.otherBears) {
          totalSize += parseFloat(response.otherBears[key]['size']);
        }
        var scale = totalWidth/totalSize; //or 80 maximum
        if (scale > 80) {
          scale = 80;
        }
        newMyBear['left'] = 260;
        newMyBear['top'] = 616 - (0.824 * response.myBear['size'] * scale * 325/400) + 0.824 * 80 * 325/400;
        newMyBear['size'] = response.myBear.size * scale;
        if (parseFloat(newMyBear['happiness']) > 0.5) {
          newMyBear['img'] = "happybear.gif";
        } else if (parseFloat(newMyBear['happiness']) > -0.5) {
          newMyBear['img'] = "neutralbear.gif";
        } else {
          newMyBear['img'] = "sadbear.gif";
        }
        var leftPad = newMyBear['left'] + newMyBear['size'] + 5;
        for (var key in response.otherBears) {
          response.otherBears[key]['left'] = leftPad;
          leftPad = leftPad + response.otherBears[key]['size'] * scale + 5;
          response.otherBears[key]['top'] = 616 - (0.824 * response.otherBears[key]['size'] * scale * 325/400) + 0.824 * 80 * 325/400;
          if (parseFloat(response.otherBears[key]['happiness']) > 0.5) {
            response.otherBears[key]['img'] = "happybear.gif";
          } else if (parseFloat(response.otherBears[key]['happiness']) > -0.5) {
            response.otherBears[key]['img'] = "neutralbear.gif";
          } else {
            response.otherBears[key]['img'] = "sadbear.gif";
          }
          response.otherBears[key]['name'] = key;
          response.otherBears[key]['size'] = response.otherBears[key]['size'] * scale;
          if (response.otherBears[key]['size'] < 80) {
            response.otherBears[key]['hidden'] = true;
            response.otherBears[key]['truncate'] = false;
          } else {
            response.otherBears[key]['hidden'] = false;
            response.otherBears[key]['truncate'] = true;
          }
          newOtherBears.push(response.otherBears[key]);
        }
        $scope.$apply(function() {
          $scope.myBear = newMyBear;
          $scope.otherBears = newOtherBears;
        })
      }, function(error) {
          console.log(error);
          console.log("Failed");
      });
    ClientStats.addEvent(ClientStats.getStatKeys().OPENED_APP).then(
        function() {
            console.log("Added "+ClientStats.getStatKeys().OPENED_APP+" event");
        }
    );
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
