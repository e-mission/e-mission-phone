'use strict';

angular.module('emission.main.cci-about', ['emission.plugin.logger'])


  
  
  .controller('CommHelper', function($http) {
    var getConnectURL = function(successCallback, errorCallback) {
        window.cordova.plugins.BEMConnectionSettings.getSettings(
            function(settings) {
                successCallback(settings.connectUrl);
            }, errorCallback);
    };
 
  $scope.signupSerial = function (user.username) {
         return new Promise(function(resolve, reject) {
            window.cordova.plugins.BEMServerComm.postUserPersonalData("/profile/update", "update_doc", updateDoc, resolve, reject);
        });
    }; 
	
	
	


});


  
  
  
  
  
  

