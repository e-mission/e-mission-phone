'use strict';

angular.module('emission.main.survey', [])

.controller('SurveyCtrl', function($scope, SurveyLaunch) {
  $scope.$on('$ionicView.afterEnter', function() {
    var surveyUrl = 'https://berkeley.qualtrics.com/jfe/form/SV_afnJgB5brT0zCo5';
    var uuidEelementId = 'QR~QID56';
    SurveyLaunch.startSurvey(surveyUrl, uuidEelementId);
  })

  $scope.startSurvey = function () {
    var surveyUrl = 'https://berkeley.qualtrics.com/jfe/form/SV_afnJgB5brT0zCo5';
    var uuidEelementId = 'QR~QID56';
    SurveyLaunch.startSurvey(surveyUrl, uuidEelementId);
  }
});
