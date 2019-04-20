'use strict';

angular.module('emission.main.recommendations',['emission.services', 'emission.plugin.logger',
                'emission.survey.launch',
                'ngSanitize', 'ngAnimate',
                'emission.splash.referral', 'angularLocalStorage',
                'ng-walkthrough', 'nzTour'])

.controller('RecommendationsCtrl', function(CommHelper, $state, $stateParams, $ionicLoading, $scope, $rootScope, $ionicModal, nzTour,
                                $window, $http, $ionicPopup, $timeout, storage, ReferralHandler, ReferHelper, Logger, $cordovaInAppBrowser, SurveyLaunch) {


    $scope.message = "Cannot Retrieve Suggestion, Please Refresh";
    $scope.question = "";
    $scope.loc = "";
    $scope.mode = "Cannot Retrieve Mode";
    $scope.bid = "yalis-stanley-hall-cafe-berkeley";
    $scope.stars = 4.5;
    $scope.rating = "";
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
        $scope.message = result.message;
        $scope.question = result.question;
        $scope.loc = result.suggested_loc;
        $scope.mode = "Also try " + result.method + " instead";
        $scope.bid = result.businessid;
        $scope.stars = result.rating;
        $scope.rating = "img/small/small_"+$scope.stars+".png";
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
