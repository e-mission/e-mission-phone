'use strict';

angular.module('emission.main.recommendations',['emission.services', 'emission.plugin.logger',
                'emission.survey.launch',
                'ngSanitize', 'ngAnimate',
                'emission.splash.referral', 'angularLocalStorage',
                'ng-walkthrough', 'nzTour'])

.controller('RecommendationsCtrl', function(CommHelper, $state, $ionicLoading, $scope, $rootScope, $ionicModal, nzTour,
                                $window, $http, $ionicPopup, $timeout, storage, ReferralHandler, ReferHelper, Logger, $cordovaInAppBrowser, SurveyLaunch) {

    //$scope.currentDisplay = "";
    //Check and see if this is right with Vanessa
    //for now using sample
    /*
    $http.get('json/sampleRecommendation.json').then(function(result) {
        var name = JSON.stringify(result.data.name);
        var mode = JSON.stringify(result.data.mode);
        document.getElementById("message_1").innerHTML = name.replace(/\"/g, "");
        document.getElementById("mode_1").innerHTML = mode.replace(/\"/g, "");
        // Eventually this will be a for loop with all the messages
      }
    )
    */
    $scope.name = "Yeet Fang";
    $scope.mode = "Yeet";
    $http.get('json/sampleRecommendation.json').then(function(result) {
        $scope.recs = result.data;
      }
    )
     CommHelper.getSuggestion().then(function(result) {
        console.log(result);
        $scope.name = JSON.stringify(result.message);
        $scope.mode = JSON.stringify(result.method);
     });

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

    $scope.clickSuggestion = function(id) {
      CommHelper.getSuggestion().then(function(result) {
        console.log(result);
        $scope.name = JSON.stringify(result.message);
        $scope.mode = JSON.stringify(result.method);
     });
    }

});
