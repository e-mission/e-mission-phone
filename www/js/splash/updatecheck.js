'use strict';

angular.module('emission.splash.updatecheck', ['angularLocalStorage'])

.factory('UpdateCheck', function($ionicPopup, $rootScope, storage) {
  var uc = {};
  var CHANNEL_KEY = 'deploy_channel';

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

  var deploy = new Ionic.Deploy();

  var applyUpdate = function() {
    $ionicPopup.show({
      title: 'Downloading UI-only update',
      template: '<progress class="download" value="{{progress}}" max="100"></progress>',
      scope: $rootScope,
      buttons: []
    });
    if ($rootScope.isDownloading) {
      return;
    }
    deploy.update().then(function(res) {
      window.Logger.log(window.Logger.LEVEL_INFO,
       'Ionic Deploy: Update Success! ', res);
      var reloadAlert = $ionicPopup.alert("Update done, reloading...");
      reloadAlert.then(function(res) {
        deploy.load();
      });
    }, function(err) {
       console.log('Ionic Deploy: Update error! ', err);
       window.Logger.log(window.Logger.LEVEL_ERROR,
         'Ionic Deploy: Update error! '+ res);
       $rootScope.isDownloading = false;
       $ionicPopup.alert({template: 'Error during update'});
    }, function(prog) {
      console.log('Ionic Deploy: Progress... ', prog);
      $rootScope.$apply(function(){
          $rootScope.progress = prog;
          $rootScope.isDownloading = true;
          if(prog==100) {
            $rootScope.isDownloading = false;
          }
      });
    })
  };


    // Check Ionic Deploy for new code
  uc.checkForUpdates = function() {
    console.log('Ionic Deploy: Checking for updates');
    deploy.setChannel(getChannelToUse());
    deploy.check().then(function(hasUpdate) {
      window.Logger.log(window.Logger.LEVEL_DEBUG, 'Ionic Deploy: Update available: ' + hasUpdate);
      if (hasUpdate) {
        window.Logger.log(window.Logger.LEVEL_INFO, 'Ionic Deploy: found update, asking user: ');

        $rootScope.rn_list = [];
        deploy.getMetadata().then(function(metadata) {
          for (var key in metadata) {
            if (key.startsWith('release_note')) {
              $rootScope.rn_list.push(metadata[key]);
            }
          }
          console.log("About to ask for update with release notes"+
            $rootScope.rn_list);
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
              window.Logger.log(window.Logger.LEVEL_INFO,
                             'Ionic Deploy: User accepted deploy update');
              applyUpdate();
            } else {
              window.Logger.log(window.Logger.LEVEL_INFO,
                'User skipped deploy update');
            }
          });
        }, function(err) {
          window.Logger.log(window.Logger.LEVEL_DEBUG, 'Ionic Deploy: Unable to read metadata: '+err);
        }, function() {});
      } else {
        // TODO: Figure out a better way to do this using promises
        // $ionicPopup.alert({title: "Up to date!"});
      }
    }, function(err) {
      window.Logger.log(window.Logger.LEVEL_ERROR, 'Ionic Deploy: Unable to check for updates'+err);
      console.error('Ionic Deploy: Unable to check for updates',err)
    });
  }

  return uc;
});

