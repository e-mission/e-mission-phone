import angular from 'angular';

angular.module('emission.join.ctrl', ['emission.splash.startprefs',
                                        'emission.splash.pushnotify',
                                        'emission.splash.storedevicesettings',
                                        'emission.splash.localnotify',
                                        'emission.splash.remotenotify',
                                        'emission.stats.clientstats'])
.controller('JoinCtrl', function($scope, $state, $interval, $rootScope, 
    $ionicPlatform, $ionicPopup, $ionicPopover) {
    console.log('JoinCtrl invoked');
        // alert("attach debugger!");
        // PushNotify.startupInit();
    console.log('JoinCtrl invoke finished');

    $ionicPlatform.ready(function() {
      $scope.scanEnabled = true;
    });

    $ionicPopover.fromTemplateUrl('templates/join/about-app.html', {
      backdropClickToClose: true,
      hardwareBackButtonClose: true,
      scope: $scope
    }).then(function(popover) {
      $scope.popover = popover;
      $scope.isIOS = $ionicPlatform.is('ios');
      $scope.isAndroid = $ionicPlatform.is('android');
    });

    $scope.showDetails = function($event) {
      $scope.popover.show($event)
    }

    $scope.hideDetails = function($event) {
      $scope.popover.hide($event)
    }

    function handleOpenURL(url) {
      console.log("onLaunch method from external function called");
      var c = document.querySelectorAll("[ng-app]")[0];
      var scope = angular.element(c).scope();
      scope.$broadcast("CUSTOM_URL_LAUNCH", url);
    };

    $scope.scanCode = function() {
      if (!$scope.scanEnabled) {
          $ionicPopup.alert({template: "plugins not yet initialized, please retry later"});
      } else {
        cordova.plugins.barcodeScanner.scan(
          function (result) {
              if (result.format == "QR_CODE" && 
                  result.cancelled == false && 
                  result.text.startsWith("emission://")) {
                  handleOpenURL(result.text);
              } else {
                  $ionicPopup.alert({template: "invalid study reference "+result.text});
              }
          },
          function (error) {
              $ionicPopup.alert({template: "Scanning failed: " + error});
          });
      }
    }; // scanCode

    $scope.pasteCode = function() {
      $scope.data = {};
      const tokenPopup = $ionicPopup.show({
          template: '<input type="String" style="font-family: monospace;" ng-model="data.existing_token">',
          title: i18next.t('login.enter-existing-token') + '<br>',
          scope: $scope,
          buttons: [
            {
              text: '<b>' + i18next.t('login.button-accept') + '</b>',
              type: 'button-positive',
              onTap: function(e) {
                if (!$scope.data.existing_token) {
                  //don't allow the user to close unless he enters a username

                  e.preventDefault();
                } else {
                  return $scope.data.existing_token;
                }
              }
            },{
              text: '<b>' + i18next.t('login.button-decline') + '</b>',
              type: 'button-stable',
              onTap: function(e) {
                return null;
              }
            }
          ]
      });
      tokenPopup.then(function(token) {
          if (token != null) {
              handleOpenURL("emission://login_token?token="+token);
          }
      }).catch(function(err) {
          $scope.alertError(err);
      });
    };
});
