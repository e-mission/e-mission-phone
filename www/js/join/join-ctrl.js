angular.module('emission.join.ctrl', ['emission.splash.updatecheck',
                                        'emission.splash.startprefs',
                                        'emission.splash.pushnotify',
                                        'emission.splash.storedevicesettings',
                                        'emission.splash.localnotify',
                                        'emission.splash.remotenotify',
                                        'emission.stats.clientstats',
                                        'emission.survey.multilabel.posttrip.prompt'])
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

    $scope.scanCode = function() {
      if (!$scope.scanEnabled) {
          $ionicPopup.alert({template: "plugins not yet initialized, please retry later"});
      } else {
        cordova.plugins.barcodeScanner.scan(
          function (result) {
              if (result.format == "QR_CODE" && 
                  result.cancelled == false && 
                  result.text.substring(0,11) == "emission://") {
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
});
