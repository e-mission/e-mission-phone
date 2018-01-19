'use strict';

angular.module('emission.splash.updatecheck', ['emission.plugin.logger',
                                               'angularLocalStorage'])

.factory('UpdateCheck', function($ionicPopup, $rootScope, $window, Logger, storage) {
  var uc = {};
  var CHANNEL_KEY = 'deploy_channel';
  var deploy = $window.IonicCordova;


  /*
   * Returns a promise that resolves to the name of the channel
   * to load UI updates from.
   */
  uc.getChannel = function() {
    return storage.get(CHANNEL_KEY);
  };

  uc.setChannel = function(channelName) {
    storage.set(CHANNEL_KEY, channelName);
  };

  uc.setChannelPromise = function(channel) {
    return new Promise(function(resolve, reject) {
        deploy.init({
            appId: "e0d8cdec",
            channel: getChannelToUse()
        }, resolve, reject);
    });
  };

  var updateProgress = function(prog) {
      $rootScope.progress = prog;
      $rootScope.isDownloading = true;
      if(prog==100) {
        $rootScope.isDownloading = false;
      }
  }

  uc.checkPromise = function() {
    return new Promise(function(resolve, reject) {
        deploy.check(resolve, reject);
    });
  };

  uc.downloadPromise = function() {
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
    return new Promise(function(resolve, reject) {
        deploy.extract(function(res) {
            if(res = 'true') {
                resolve(res);
            } else {
                updateProgress(res);
            }
        }, reject);
    });
  };

  uc.redirectPromise = function() {
    return new Promise(function(resolve, reject) {
        deploy.redirect(resolve, reject);
    });
  };

  uc.handleClientChangeURL = function(urlComponents) {
    Logger.log("handleClientChangeURL = "+JSON.stringify(urlComponents));
    if (urlComponents['clear_local_storage'] == "true") {
        Logger.log("About to clear all local storage");
        storage.clearAll();
    }
    if (urlComponents['clear_usercache'] == "true") {
        Logger.log("About to clear usercache");
        window.cordova.plugins.BEMUserCache.clearAll();
    }
    uc.setChannel(urlComponents['new_client']);
    uc.checkForUpdates();
  };

  // Default to dev
  var getChannelToUse = function() {
      var channel = uc.getChannel();
      if (channel == null || channel == "") {
        console.log("No saved channel found, using prod")
        channel = 'prod';
      };
      console.log("Returning channel "+channel)
      return channel;
  }

  var showProgressDialog = function(title) {
    $ionicPopup.show({
      title: title,
      template: '<progress class="download" value="{{progress}}" max="100"></progress>',
      scope: $rootScope,
      buttons: []
    });
  }

  var applyUpdate = function() {
    if ($rootScope.isDownloading) {
      return;
    }
    $rootScope.progress = 0;
    showProgressDialog("Downloading UI-only update");
    uc.downloadPromise().then(function() {
      $rootScope.progress = 0;
      showProgressDialog("Extracting UI-only update");
      uc.extractPromise().then(function(res) {
          Logger.log('Ionic Deploy: Update Success! ' + res);
          var reloadAlert = $ionicPopup.alert("Update done, reloading...");
          reloadAlert.then(function(res) {
            uc.redirectPromise();
          });
      });
    });
  };


    // Check Ionic Deploy for new code
  uc.checkForUpdates = function() {
    console.log('Ionic Deploy: Checking for updates');
    uc.setChannelPromise(getChannelToUse()).then(function(result) {
    Logger.log("deploy init result = "+result);
    uc.checkPromise().then(function(hasUpdate) {
      Logger.log('Ionic Deploy: Update available: ' + hasUpdate);
      if (hasUpdate) {
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
    }).finally(function(err) {
      Logger.log('Ionic Deploy: Unable to check for updates'+err);
      console.error('Ionic Deploy: Unable to check for updates',err)
    })
  }

  return uc;
});

