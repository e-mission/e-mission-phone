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
    $scope.yelp = {
      "headers": {
    		"Authorization": "Bearer your-api-key",
    		"cache-control": "no-cache"
    	}
    }
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
      $http({
        "async": true,
        "crossDomain": true,
        "url": "https://api.yelp.com/v3/businesses/yalis-stanley-hall-cafe-berkeley/reviews",
        "method": "GET",
        "headers": $scope.yelp.headers
      }).then(function(res) {
        $scope.revs = res.data.reviews;
      });
      $http({
        "async": true,
        "crossDomain": true,
        "url": "https://api.yelp.com/v3/businesses/yalis-stanley-hall-cafe-berkeley",
        "method": "GET",
        "headers": $scope.yelp.headers
      }).then(function(res) {
        $scope.info = res.data;
      });
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