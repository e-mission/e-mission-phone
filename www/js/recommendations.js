'use strict';

angular.module('emission.main.recommendations',['emission.services', 'emission.plugin.logger',
                'emission.survey.launch',
                'ngSanitize', 'ngAnimate',
                'emission.splash.referral', 'angularLocalStorage',
                'ng-walkthrough', 'nzTour'])

.controller('RecommendationsCtrl', function(CommHelper, $state, $ionicLoading, $scope, $rootScope, $ionicModal, nzTour,
                                $window, $http, $ionicPopup, $timeout, storage, ReferralHandler, ReferHelper, Logger, $cordovaInAppBrowser, SurveyLaunch) {
    $scope.xCoord = 37.8756;
    $scope.yCoord = -122.2588;
    $scope.currentDisplay = "";
    $http.get('json/sampleRecommendation.json').then(function(result) {
        $scope.recs = result.data;
      }
    )
    $scope.clickDirections = function(id) {
      $scope.currentDisplay = document.getElementById("mapModal" + id);
      $scope.currentDisplay.style.display = "block";

    };
    $scope.clickX = function() {
      $scope.currentDisplay.style.display = "none";
    };
    $scope.clickReview = function(id) {
      $scope.currentDisplay = document.getElementById("reviewModal" + id);
      $scope.currentDisplay.style.display = "block";
    };
    $scope.getDistance = function(x, y) {
      var xDif = ($scope.xCoord - x) * 55;
      var yDif = ($scope.yCoord - y) * 69;
      var x2 = Math.pow(xDif, 2);
      var y2 = Math.pow(yDif, 2);
      var dist = Math.sqrt(x2 + y2);
      return Math.round(dist * 10) / 10 + " miles away";
    }

});
