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
    $scope.bid = "";
    $scope.stars = 4.5;
    $http.get('json/yelpfusion.json').then(function(result) {
          $scope.yelp = result.data;
        }
    )
    $scope.clickX = function() {
      $scope.currentDisplay.style.display = "none";
    };
    $scope.clickReview = function(id) {
      $scope.currentDisplay = document.getElementById("reviewModal" + id);
      $scope.currentDisplay.style.display = "block";
      $ionicLoading.show({
        template: 'Loading Reviews...'
        });
      $http({
        "async": true,
        "crossDomain": true,
        "url": "https://api.yelp.com/v3/businesses/"+$scope.bid+"/reviews",
        "method": "GET",
        "headers": $scope.yelp.headers
      }).then(function(res) {
        $scope.revs = res.data.reviews;
      });
      $ionicLoading.hide();
    };

    var uuid = $stateParams.uuid;
    $scope.clickSuggestion = function(id) {
      $ionicLoading.show({
        template: 'Loading most recent suggestion, this may take a while...'
        });
      CommHelper.getSuggestion().then(function(result) {
        $ionicLoading.hide();
        console.log(result);
        $scope.name = result.message;
        $scope.mode = result.method;
        $scope.bid = result.businessid;
        $scope.stars = result.rating;
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
