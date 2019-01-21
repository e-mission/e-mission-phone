'use strict';

angular.module('emission.main.recommendations',['emission.services', 'emission.plugin.logger',
                'emission.survey.launch',
                'ngSanitize', 'ngAnimate',
                'emission.splash.referral', 'angularLocalStorage',
                'ng-walkthrough', 'nzTour'])

.controller('RecommendationsCtrl', function(CommHelper, $state, $stateParams, $ionicLoading, $scope, $rootScope, $ionicModal, nzTour,
                                $window, $http, $ionicPopup, $timeout, storage, ReferralHandler, ReferHelper, Logger, $cordovaInAppBrowser, SurveyLaunch) {


    $scope.name = "Cannot Retrieve Suggestion";
    $scope.mode = "Cannot Retrieve Mode";
    $scope.clickX = function() {
      $scope.currentDisplay.style.display = "none";
    };
    $scope.clickReview = function(id) {
      $scope.currentDisplay = document.getElementById("reviewModal" + id);
      $scope.currentDisplay.style.display = "block";
    };


    var uuid = $stateParams.uuid;
    $scope.clickSuggestion = function(id) {
      $ionicLoading.show({
        template: 'Loading...'
        });
      CommHelper.getSuggestion().then(function(result) {
        console.log(result);
        $scope.name = result.message;
        $scope.mode = result.method;
        $ionicLoading.hide();
     }).catch(function(err) {
      console.log("Error while getting suggestion" + err);
    });
  };

  $scope.pickTrip = function(id) {
    $scope.currentDisplay = document.getElementById("tripSelection");
    $scope.currentDisplay.style.display = "block";
    $scope.currentDisplay.style.visibility = "visible";
  };
});