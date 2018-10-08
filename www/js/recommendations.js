'use strict';

angular.module('emission.main.recommendations',['emission.services', 'emission.plugin.logger',
                'emission.survey.launch',
                'ngSanitize', 'ngAnimate',
                'emission.splash.referral', 'angularLocalStorage',
                'ng-walkthrough', 'nzTour'])

.controller('RecommendationsCtrl', function(CommHelper, $state, $ionicLoading, $scope, $rootScope, $ionicModal, nzTour,
                                $window, $http, $ionicPopup, $timeout, storage, ReferralHandler, ReferHelper, Logger, $cordovaInAppBrowser, SurveyLaunch) {
    $scope.cSF = 1000;
    var map = document.getElementById('mapModal');
    var review = document.getElementById('reviewModal');
    $scope.clickDirections = function() {
      map.style.display = "block";
      console.log("clicked directions");
    };
    $scope.clickX = function() {
      map.style.display = "none";
      review.style.display = "none";
    }
    $scope.clickReview = function() {
      review.style.display = "block";
    }
});
