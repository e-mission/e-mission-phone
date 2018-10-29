'use strict';

angular.module('emission.main.recommendations',['emission.services', 'emission.plugin.logger',
                'emission.survey.launch',
                'ngSanitize', 'ngAnimate',
                'emission.splash.referral', 'angularLocalStorage',
                'ng-walkthrough', 'nzTour'])

/*
Ask Shankari about this Wednesday
.service('CommHelper', function($http) {
    var getConnectURL = function(successCallback, errorCallback) {
        window.cordova.plugins.BEMConnectionSettings.getSettings(
            function(settings) {
                successCallback(settings.connectUrl);
            }, errorCallback);
    };
  */

.controller('RecommendationsCtrl', function(CommHelper, $state, $ionicLoading, $scope, $rootScope, $ionicModal, nzTour,
                                $window, $http, $ionicPopup, $timeout, storage, ReferralHandler, ReferHelper, Logger, $cordovaInAppBrowser, SurveyLaunch) {
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

    $scope.getSuggestion = function() {
      return new Promise(function(resolve, reject) {
        var msgFiller = function(message) {
          console.log("THIS IS THE SUGGESTION" + JSON.stringify(message));
          document.getElementById("0").innerHTML = JSON.stringify(message);
        }
        window.cordova.plugins.BEMServerComm.pushGetJSON("/suggestion_sys", msgFiller, resolve, reject);
      });
    };

});
