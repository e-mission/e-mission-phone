'use strict';

angular.module('emission.splash.updatecheck', ['emission.plugin.logger',
                                               'emission.plugin.kvstore'])

.factory('UpdateCheck', function($ionicPopup, $ionicPlatform, $rootScope, $window, Logger, KVStore) {
  var uc = {};
  var CHANNEL_KEY = 'deploy_channel';


  /*
   * Returns a promise that resolves to the name of the channel
   * to load UI updates from.
   */
  uc.getChannel = function() {
    return KVStore.get(CHANNEL_KEY);
  };

  uc.setChannel = function(channelName) {
    return KVStore.set(CHANNEL_KEY, channelName);
  };

  uc.initChannelPromise = function(currChannel) {
    var deploy = $window.IonicCordova.deploy;
    if (currChannel == null) {
        Logger.log("currChannel == null, skipping deploy init");
        return Promise.resolve(null);
    } else {
        return new Promise(function(resolve, reject) {
            var config = {
                appId: "e0d8cdec",
                channel: currChannel
            }
            deploy.init(config, resolve, reject);
        });
    }
  };

  var updateProgress = function(prog) {
    $rootScope.$apply(function(){ 
      $rootScope.progress = prog;
      $rootScope.isDownloading = true;
      if(prog==100) {
        $rootScope.isDownloading = false;
      }
    });
  }

  uc.checkPromise = function() {
    var deploy = $window.IonicCordova.deploy;
    return new Promise(function(resolve, reject) {
        deploy.check(resolve, reject);
    });
  };

  uc.downloadPromise = function() {
    var deploy = $window.IonicCordova.deploy;
    return new Promise(function(resolve, reject) {
        deploy.download(function(res) {
            if(res == 'true') {
                resolve(res);
            } else {
                updateProgress(res);
            }
        }, reject);
    });
  };

  uc.extractPromise = function() {
    var deploy = $window.IonicCordova.deploy;
    return new Promise(function(resolve, reject) {
        deploy.extract(function(res) {
            console.log("extract progress = "+res);
            var expectedResult = $window.cordova.platformId == "ios"? "done": "true";
            if(res == expectedResult) {
                resolve(res);
            } else {
                updateProgress(res);
            }
        }, reject);
    });
  };

  uc.redirectPromise = function() {
    var deploy = $window.IonicCordova.deploy;
    return new Promise(function(resolve, reject) {
        deploy.redirect(resolve, reject);
    });
  };

  uc.handleClientChangeURL = function(urlComponents) {
    Logger.log("handleClientChangeURL = "+JSON.stringify(urlComponents));
    var operationArray = []
    if (urlComponents['clear_usercache'] == "true") {
        Logger.log("About to clear usercache");
        operationArray.push(KVStore.clearAll());
    }
    operationArray.push(uc.setChannel(urlComponents['new_client']));
    Promise.all(operationArray).then(function() {
        Logger.log("successfully set the channel to "+urlComponents['new_client']);
        uc.checkForUpdates();
    }).catch(function(error) {
      var display_msg = error.message + "\n" + error.stack;
      if (!angular.isDefined(error.message)) {
        display_msg = JSON.stringify(error);
      }
      $ionicPopup.alert({"title": "Unable to handle client change",
        "template": display_msg});
      Logger.log('Ionic Deploy: Unable to handle client change URL '+display_msg);
    })
  };

  // Default to dev
  var getChannelToUse = function() {
      return uc.getChannel().then(function(channel) {
      if (channel == null || channel == "") {
        console.log("No saved channel found, skipping channel config")
        channel = null;
      };
      console.log("Returning channel "+channel)
      return channel;
      });
  }

  var applyUpdate = function() {
    if ($rootScope.isDownloading) {
      return;
    }
    $rootScope.progress = 0;
    var downloadPop = $ionicPopup.show({
      title: "Downloading UI-only update",
      template: '<progress class="download" value="{{progress}}" max="100"></progress>',
      scope: $rootScope,
      buttons: []
    });
    uc.downloadPromise().then(function() {
      $rootScope.progress = 0;
      downloadPop.close();
      // alert("download -> extract");
      var extractPop = $ionicPopup.show({
        title: "Extracting UI-only update",
        template: '<progress class="download" value="{{progress}}" max="100"></progress>',
        scope: $rootScope,
        buttons: []
      });
      uc.extractPromise().then(function(res) {
          extractPop.close();
          // alert("extract -> reload");
          Logger.log('Ionic Deploy: Update Success! ' + res);
          var reloadAlert = $ionicPopup.alert({
            title: "Update done, reloading..."
          });
          reloadAlert.then(function(res) {
            uc.redirectPromise();
          });
      });
    });
  };


    // Check Ionic Deploy for new code
  uc.checkForUpdates = function() {
    console.log('Ionic Deploy: Checking for updates');
    getChannelToUse().then(function(currChannel) {
    uc.initChannelPromise(currChannel).then(function() {
    Logger.log("deploy init complete ");
    uc.checkPromise().then(function(hasUpdate) {
      Logger.log('Ionic Deploy: Update available: ' + hasUpdate);
      if (hasUpdate == 'true') {
        Logger.log('Ionic Deploy: found update, asking user: ');

        $ionicPopup.show({
            title: "Download new UI-only update?",
            templateUrl: 'templates/splash/release-notes.html',
            scope: $rootScope,
            buttons: [{ // Array[Object] (optional). Buttons to place in the popup footer.
              text: 'Not now',
              type: 'button-default',
        }, {
              text: 'Apply',
              type: 'button-positive',
              onTap: function(e) {
                return true;
              }
            }]
        }).then(function(res){
            if(res) {
              Logger.log('Ionic Deploy: User accepted deploy update');
              applyUpdate();
            } else {
              Logger.log('User skipped deploy update');
            }
          });
      } else {
        // TODO: Figure out a better way to do this using promises
        // $ionicPopup.alert({title: "Up to date!"});
      }
    })
    })
    }).catch(function(err) {
      Logger.log('Ionic Deploy: Unable to check for updates'+err);
      console.error('Ionic Deploy: Unable to check for updates',err)
    })
  }

  $ionicPlatform.ready().then(function() {
    uc.checkForUpdates();
  });

  return uc;
});

