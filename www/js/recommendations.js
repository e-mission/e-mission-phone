'use strict';

angular.module('emission.main.recommendations',['emission.services', 'emission.plugin.logger',
                'emission.survey.launch',
                'ngSanitize', 'ngAnimate',
                'emission.splash.referral', 'angularLocalStorage',
                'ng-walkthrough', 'nzTour'])

.controller('RecommendationsCtrl', function(CommHelper, $state, $ionicLoading, $scope, $rootScope, $ionicModal, nzTour,
                                $window, $http, $ionicPopup, $timeout, storage, ReferralHandler, ReferHelper, Logger, $cordovaInAppBrowser, SurveyLaunch) {

     CommHelper.getSuggestion().then(function(result) {
        console.log(result);
        var name = JSON.stringify(result.message);
        var mode = JSON.stringify(result.method);
        document.getElementById("message_1").innerHTML = name.replace(/\"/g, "");
        document.getElementById("mode_1").innerHTML = mode.replace(/\"/g, "");
     });
    
    $scope.clickX = function() {
      $scope.currentDisplay.style.display = "none";
    };
    $scope.clickReview = function(id) {
      $scope.currentDisplay = document.getElementById("reviewModal" + id);
      $scope.currentDisplay.style.display = "block";
    };

    $scope.clickSuggestion = function(id) {
      CommHelper.getSuggestion().then(function(result) {
        var name = JSON.stringify(result.message);
        var mode = JSON.stringify(result.method);
        document.getElementById("message_1").innerHTML = name.replace(/\"/g, "");
        document.getElementById("mode_1").innerHTML = mode.replace(/\"/g, "");
     }).catch(function(err) {
      console.log("Error while getting suggestion" + err);
    });
  };
});
