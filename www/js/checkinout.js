'use strict';

angular.module('emission.main.checkinout',[
                                      'emission.stats.clientstats',
                                      'emission.plugin.logger'])

.controller("CheckinoutCtrl", function($window, $scope, $rootScope, $ionicPlatform, $state,
                                    $ionicPopup, ClientStats,
                                    KVStore, Logger, $ionicPopover, $translate) {

const LOCAL_STORAGE_KEY = "CHECKINOUT_KEY";

$scope.data = {};

const initCheckout = function() {
    $scope.checkout = {
        status: false,
        bikeNo: undefined
    };
}

const getScannedNo = function(urlText) {
    const url = new URL(urlText);
    if (url.protocol != "emission:") {
        throw new Error("Invalid protocol "+url.protocol+" in url "+urlText);
    }
    // android and iOS parse URLs differently. for the emission://checkinout URL
    // ios puts checkinout into the hostname and android puts it into the pathname
    // so we are only invalid if neither is valid
    if (url.hostname != "checkinout" && url.pathname != "//checkinout") {
        throw new Error("Invalid pathname "+url.pathname+" in url "+urlText);
    }
    const bikeNo = url.searchParams.get("bikeNo");
    if (bikeNo === null) {
        throw new Error("No bike number found in url "+urlText);
    } else {
        return bikeNo;
    }
}

const scanBikeNo = function() {
    return new Promise(function(resolve, reject) {
        if (!$scope.scanEnabled) {
            reject(new Error("plugins not yet initialized, please retry later"));
        } else {
          cordova.plugins.barcodeScanner.scan(
            function (result) {
                if (result.format == "QR_CODE" &&
                    result.cancelled == false) {
                    try {
                        const bikeNo = getScannedNo(result.text);
                        resolve(bikeNo);
                    } catch(e) {
                        reject(e);
                    }
                } else {
                    reject(new Error("invalid QR code"+result.text));
                }
            },
            function (error) {
                reject(error);
            });
        }
    });
}

const scanBikeNoDebug = function() {
    return new Promise(function(resolve, reject) {
      var scanBikePopup = $ionicPopup.show({
        template: '<input type="userEmail" ng-model="data.scannedurl">',
        title: 'Copy and paste the bike URL',
        scope: $scope,
        buttons: [
          {
            text: '<b>Save</b>',
            type: 'button-positive',
            onTap: function(e) {
              if (!$scope.data.scannedurl) {
                //don't allow the user to close unless he enters a username

                e.preventDefault();
              } else {
                if ($scope.data.scannedurl.indexOf(' ') >= 0) {
                  e.preventDefault();
                }
                return $scope.data.scannedurl;
              }
            }
          }
        ]
      });
      scanBikePopup.then(function(res) {
        console.log('Tapped!', res);
        try {
            const bikeNo = getScannedNo(res);
            resolve(bikeNo);
        } catch (e) {
            reject(e);
        }
      });
    });
}

$scope.doCheckout = function() {
    scanBikeNo().then((bikeNo) => {
        $scope.$apply(function() {
            $scope.checkout.status = true;
            $scope.checkout.bikeNo = bikeNo;
            KVStore.set(LOCAL_STORAGE_KEY, $scope.checkout);
        });
    }).catch((err) => {
        Logger.displayError("Error while scanning QR code", err);
    });
}

$scope.doCheckin = function() {
    scanBikeNo().then((bikeNo) => {
        if (bikeNo === $scope.checkout.bikeNo) {
            $scope.$apply(function() {
                KVStore.remove(LOCAL_STORAGE_KEY);
                $scope.checkout.status = false;
                $scope.checkout.bikeNo = undefined;
            });
        } else {
            Logger.displayError("Error while scanning QR code",
                new Error("Please check in bike "+$scope.checkout.bikeNo+" first"));
        }
    }).catch((err) => {
        Logger.displayError("Error while scanning QR code", err);
    });
}

$ionicPlatform.ready(function() {
    if (cordova.plugins.barcodeScanner != undefined) {
        $scope.scanEnabled = true;
    }
    KVStore.get(LOCAL_STORAGE_KEY).then((storedVal) => {
        if (storedVal != null) {
            $scope.checkout = storedVal;
        } else {
            initCheckout();
        }
    }).catch((err) => {
        initCheckout();
    });
});


});
