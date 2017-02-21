'use strict';

angular.module('emission.survey.launch', ['emission.services',
                    'emission.plugin.logger'])

.factory('SurveyLaunch', function($http, $cordovaInAppBrowser, $ionicPopup, $rootScope,
    CommHelper, Logger) {

    var surveylaunch = {};
    var replace_uuid = function(uuidElementId) {
        return Promise.all([$http.get("js/survey/uuid_insert.js"),
                     CommHelper.getUser()])
          .then(function([scriptText, userProfile]) {
            // alert("finished loading script");
            Logger.log(scriptText.data);
            var uuid = userProfile.user_id['$uuid']
            // I tried to use http://stackoverflow.com/posts/23387583/revisions
            // for the idea on how to invoke the function in the script
            // file, but the callback function was never invoked. So I edit the
            // script file directly and insert the userId.
            Logger.log("inserting user id into qualtrics survey. userId = "+ uuid
                        +" element id = "+uuidElementId);
            var codeTemplate = scriptText.data;
            var codeString = codeTemplate.replace("SCRIPT_REPLACE_UUID", uuid)
                                .replace("SCRIPT_REPLACE_ELEMENT_ID", uuidElementId);
            $cordovaInAppBrowser.executeScript({ code: codeString });
          });
    };

    surveylaunch.startSurvey = function (url, uuidElementId) {
      var options = {
        location: 'no',
        clearcache: 'no',
        toolbar: 'yes'
      };

      // THIS LINE FOR inAppBrowser
      $cordovaInAppBrowser.open('https://berkeley.qualtrics.com/SE/?SID=SV_5pzFk7JnMkfWBw1', '_blank', options)
          .then(function(event) {
            console.log("successfully opened page with result "+JSON.stringify(event));
            // success
          })
          .catch(function(event) {
            // error
          });
      $rootScope.$on('$cordovaInAppBrowser:loadstart', function(e, event) {
        console.log("started loading, event = "+JSON.stringify(event));
        if (event.url == 'https://bic2cal.eecs.berkeley.edu/') {
            $cordovaInAppBrowser.close();
        }
      });
      $rootScope.$on('$cordovaInAppBrowser:loadstop', function(e, event) {
        console.log("stopped loading, event = "+JSON.stringify(event));
        if (event.url == 'https://berkeley.qualtrics.com/jfe/form/SV_5pzFk7JnMkfWBw1') {
            replace_uuid(uuidElementId)
            .then(function() {
                Logger.log("Finished replacing uuid and launching survey");
            })
            .catch(function(error) {
              $ionicPopup.alert({"template": "Relaunching survey - while replacing uuid, got error "+ JSON.stringify(error)})
              .then(function() {
                surveylaunch.startSurvey(url, uuidElementId);
              });
            });
        } else {
            Logger.log("checking for survey loadstop, finished loading url "+event.url+" ignoring...");
        }
      });
      $rootScope.$on('$cordovaInAppBrowser:exit', function(e, event) {
        console.log("exiting, event = "+JSON.stringify(event));
      });
    };

    return surveylaunch;

    /*var showUserId = function() {
        console.log("Showing user id");
        $ionicPopup.show({
          title: 'Bic2Cal Survey',
          templateUrl: 'templates/goals/uid.html',
          scope: $scope,
            buttons: [{
              text: 'Copy user id and open survey',
              type: 'button-positive',
              onTap: function(e) {
                $cordovaClipboard.copy(userId).then(function () {
                    console.log("copying to clipboard "+userId);
                    startSurvey();
                }, function () {
                    // error
                }); 
              }
            }]
        });
    };*/

});
