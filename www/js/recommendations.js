'use strict';

angular.module('emission.main.recommendations',['emission.services', 'emission.plugin.logger',
                'emission.survey.launch',
                'ngSanitize', 'ngAnimate',
                'emission.splash.referral', 'angularLocalStorage',
                'ng-walkthrough', 'nzTour'])

.controller('RecommendationsCtrl', function(CommHelper, $state, $ionicLoading, $scope, $rootScope, $ionicModal, nzTour,
                                $window, $http, $ionicPopup, $timeout, storage, ReferralHandler, ReferHelper, Logger, $cordovaInAppBrowser, SurveyLaunch) {
    $scope.cSF = 1000;
    $scope.xCoord = 37.8756;
    $scope.yCoord = -122.2588;
    $scope.currentDisplay = "";
    $scope.clickDirections = function(id) {
      $scope.currentDisplay = document.getElementById("mapModal" + id)
      $scope.currentDisplay.style.display = "block";
    };
    $scope.clickX = function() {
      $scope.currentDisplay.style.display = "none";
    }
    $scope.clickReview = function(id) {
      $scope.currentDisplay = document.getElementById("reviewModal" + id)
      $scope.currentDisplay.style.display = "block";
    }
});
