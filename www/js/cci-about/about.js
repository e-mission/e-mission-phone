'use strict';

angular.module('emission.main.cci-about', ['emission.plugin.logger'])

.controller('CCIAboutCtrl', function($scope, $state, $cordovaEmailComposer, $ionicPopup, SurveyLaunch) {

  $scope.studyEmail = "cci.vmt@gmail.com";

  $scope.startSurvey = function () {
      SurveyLaunch.startSurvey('https://berkeley.qualtrics.com/jfe/form/SV_eQBjPXx10yaAScl', 'QR~QID3');
      startSurvey();
  };
	
  $scope.emailCCI = function() {
        var email = {
            to: [$scope.studyEmail],
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


  
  
  
  
  
  

