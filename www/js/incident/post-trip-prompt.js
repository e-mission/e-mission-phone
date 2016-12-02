'use strict';

angular.module('emission.incident.posttrip.prompt', ['emission.plugin.logger'])
.factory("PostTripAutoPrompt", function($window, Logger) {
  var ptap = {};

  var showTripEndNotification = function() {
    var actions = [ {
        identifier: 'SIGN_IN',
        title: 'Yes',
        icon: 'res://ic_signin',
        activationMode: 'background',
        destructive: false,
        authenticationRequired: true
    },
    {
       identifier: 'MORE_SIGNIN_OPTIONS',
       title: 'More Options',
       icon: 'res://ic_moreoptions',
       activationMode: 'foreground',
       destructive: false,
       authenticationRequired: false
    },
    {
       identifier: 'PROVIDE_INPUT',
       title: 'Provide Input',
       icon: 'ic_input',
       activationMode: 'background',
       destructive: false,
       authenticationRequired: false,
       behavior: 'textInput',
       textInputSendTitle: 'Reply'
    }];

    console.log("About to show notification");
    $window.cordova.plugins.notification.local.schedule({
      id: 1,
      title: "Trip just ended",
      text: "Incident to report?",
      actions: [actions[0], actions[1]],
      category: 'SIGN_IN_TO_CLASS'
    });
  }

  ptap.registerTripEnd = function() {
    console.log( "register tripEnd received!" );
    // Android
    $window.broadcaster.addEventListener("local.transition.stopped_moving", function( e ) {
      showTripEndNotification();
    });

    // iOS
    $window.broadcaster.addEventListener("TRANSITION_NAME", function( e ) {
      console.log("Received TRANSITION_NAME event"+JSON.stringify(e));
      showTripEndNotification();
    });
  }

  return ptap;

});
