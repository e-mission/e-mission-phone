'use strict';

angular.module('emission.main.recommendations',['emission.services', 'emission.plugin.logger',
                'emission.survey.launch',
                'ngSanitize', 'ngAnimate',
                'emission.splash.referral', 'angularLocalStorage',
                'ng-walkthrough', 'nzTour'])

.controller('RecommendationsCtrl', function(CommHelper, $state, $ionicLoading, $scope, $rootScope, $ionicModal, nzTour,
                                $window, $http, $ionicPopup, $timeout, storage, ReferralHandler, ReferHelper, Logger, $cordovaInAppBrowser, SurveyLaunch) {


    $scope.name = "Yeet Fang";
    $scope.mode = "Yeet";
    $scope.clickX = function() {
      $scope.currentDisplay.style.display = "none";
    };
    $scope.clickReview = function(id) {
      $scope.currentDisplay = document.getElementById("reviewModal" + id);
      $scope.currentDisplay.style.display = "block";
    };

    $scope.clickSuggestion = function(id) {
      CommHelper.getSuggestion().then(function(result) {
        $scope.name = JSON.stringify(result.message);
        $scope.mode = JSON.stringify(result.method);
     }).catch(function(err) {
      console.log("Error while getting suggestion" + err);
    });
  };
});
