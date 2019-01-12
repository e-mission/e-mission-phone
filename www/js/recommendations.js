'use strict';

angular.module('emission.main.recommendations',['emission.services', 'emission.plugin.logger',
                'emission.survey.launch',
                'ngSanitize', 'ngAnimate',
                'emission.splash.referral', 'angularLocalStorage',
                'ng-walkthrough', 'nzTour'])

.controller('RecommendationsCtrl', function(CommHelper, $state, $ionicLoading, $scope, $rootScope, $ionicModal, nzTour,
                                $window, $http, $ionicPopup, $timeout, storage, ReferralHandler, ReferHelper, Logger, $cordovaInAppBrowser, SurveyLaunch) {


    $scope.name = "Cannot Retrieve Suggestion";
    $scope.mode = "Cannot Retrieve Mode";
    $scope.bid = 'hello';
    $scope.review = '';
    $scope.api_key = '';
    $scope.clickX = function() {
      $scope.currentDisplay.style.display = "none";
    };
    $scope.clickReview = function(id) {
      $scope.currentDisplay = document.getElementById("reviewModal" + id);
      $scope.currentDisplay.style.display = "block";
    };

    $scope.clickSuggestion = function(id) {
      CommHelper.getSuggestion().then(function(result) {
        $scope.name = result.message;
        $scope.mode = result.method;
     }).catch(function(err) {
      console.log("Error while getting suggestion" + err);
    });

    $scope.getReview = function() {
      $http.get('json/yelpfusion.json').then(function(result) {
          $scope.api_key = result.api_key;
          $scope.api_host = result.api_host;
        }
      )
      $http.get($scope.api_host +"/v3/businesses/search?term=Yalis_Cafe_Berkeley",
      {headers: {'Authorization': 'Bearer '+$scope.api_key}}}).then(function(res) {
        $scope.bid = res.businesses[0].id;
      });
      $http.get($scope.api_host + "/v3/businesses/" + $scope.bid + "/reviews",
      {headers: {'Authorization': 'Bearer '+$scope.api_key}}}).then(function(rev) {
        $scope.review = rev.reviews[0].text;
      });
    }
  };
});
