'use strict';

// import { Form } from 'enketo-core';

angular.module('emission.survey.enketo.launch', ['emission.services',
                    'emission.plugin.logger'])

.controller('EnketoSurveyCtrl', function($window, $scope, $rootScope, $state,
    $stateParams, $http, $ionicPopup, Logger, $cordovaInAppBrowser) {

    console.log("EnketoSurveyCtrl called with params = "+JSON.stringify($stateParams));

    $scope.loadForm = function(form_location) {
        // var invokeUrl = "templates/survey/enketo-survey-iab.html?xform="+form_location;
        // var invokeUrl = "https://odk.enke.to/preview?form=https://xlsform.opendatakit.org/downloads/ngzcr5fw/rkunsw-survey1.xml";
        // $cordovaInAppBrowser.open(invokeUrl, '_blank')
        $http.get(form_location)
        .then(function(form_json) {
            console.log(form_json);
            $scope.loaded_form = form_json.data.form;
            $scope.loaded_model = form_json.data.model;
            $( '.form-header' ).after( $scope.loaded_form );
            var formSelector = 'form.or:eq(0)';
            var data = {
                 // required string of the default instance defined in the XForm
                 modelStr: $scope.loaded_model,
                 // optional string of an existing instance to be edited
                 instanceStr: null,
                 // optional boolean whether this instance has ever been submitted before
                 submitted: false,
                 // optional array of external data objects containing: 
                 // {id: 'someInstanceId', xml: XMLDocument}
                 external: [],
                 // optional object of session properties 
                 // 'deviceid', 'username', 'email', 'phonenumber', 'simserial', 'subscriberid'
                 session: {}
            };
            $scope.form = new $window.FormModule( formSelector, data, {});
            var loadErrors = $scope.form.init();
            if (loadErrors.length > 0) {
                $ionicPopup.alert({template: "loadErrors: " + loadErrors.join(",")});
            }
        });
    };
    
    /*
     * Initialize all the scope variables based on the paramters
     */
    if (!angular.isDefined($stateParams.form_location)) {
        $ionicPopup.alert("No form location defined, going back to metrics")
        .then(function() {
            $state.go("root.main.metrics")
        });
    } else {
        $scope.loadForm($stateParams.form_location);
    }

    $scope.validateForm = function() {
        $scope.form.validate()
          .then(function (valid){
            if ( !valid ) {
              $ionicPopup.alert({template: 'Form contains errors. Please see fields marked in red.'});
            } else {
             // Record is valid! 
              $ionicPopup.alert({template: 'Form is valid! (see XML record in the console)'});
              console.log($scope.form.getDataStr());
            }
        });
    }
});
