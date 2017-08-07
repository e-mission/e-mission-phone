'use strict';

angular.module('emission.main.cci-about', ['emission.plugin.logger'])

.controller('CCIAboutCtrl', function($scope, $state, $cordovaEmailComposer, $ionicPopup, $ionicNavBarDelegate) {

  var hideBackButton = function() {
    $ionicNavBarDelegate.showBackButton(false);
  };

  $scope.$on('$ionicView.enter', function() {
      hideBackButton();
  });

	$scope.emailCCI = function() {
        var email = {
            to: ['cci@berkeley.edu'],
            subject: 'Question from Emission User',
            body: ''
        }

        $cordovaEmailComposer.open(email).then(function() {
           window.Logger.log(window.Logger.LEVEL_DEBUG,
               "CCI email queued successfully");
        },
        function () {
           window.Logger.log(window.Logger.LEVEL_INFO,
               "CCI email cancel reported, seems to be an error on android");
        });
    };
})