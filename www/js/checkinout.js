'use strict';

angular.module('emission.main.checkinout',[
                                      'emission.services',
                                      'emission.stats.clientstats',
                                      'emission.plugin.logger'])

.controller("CheckinoutCtrl", function($window, $scope, $rootScope, $ionicPlatform, $state,
                                    $ionicPopup, ClientStats, CommHelper,
                                    KVStore, Logger, $ionicPopover, $translate) {

const LOCAL_STORAGE_KEY = "CHECKINOUT_KEY";

$scope.data = {};

const initCheckout = function() {
    $scope.checkout = {
        status: false,
        bikeLabel: undefined
    };
}

const getScannedLabel = function(urlText) {
    const url = new URL(urlText);
    if (url.protocol != "emission:") {
        throw new Error("Invalid protocol "+url.protocol+" in url "+urlText);
    }
    if (url.pathname != "//checkinout") {
        throw new Error("Invalid pathname "+url.pathname+" in url "+urlText);
    }
    const bikeLabel = url.searchParams.get("bikeLabel");
    if (bikeLabel === null) {
        throw new Error("No bike label found in url "+urlText);
    } else {
        return bikeLabel;
    }
}

const scanBikeLabel = function() {
    return new Promise(function(resolve, reject) {
        if (!$scope.scanEnabled) {
            reject(new Error("plugins not yet initialized, please retry later"));
        } else {
          cordova.plugins.barcodeScanner.scan(
            function (result) {
                if (result.format == "QR_CODE" &&
                    result.cancelled == false) {
                    try {
                        const bikeLabel = getScannedLabel(result.text);
                        resolve(bikeLabel);
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

const scanBikeLabelDebug = function() {
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
            const bikeLabel = getScannedLabel(res);
            resolve(bikeLabel);
        } catch (e) {
            reject(e);
        }
      });
    });
}

$scope.doCheckout = function() {
    scanBikeLabel().then((bikeLabel) => {
        const checkoutOp = {
            status: true,
            bikeLabel: bikeLabel
        }
        CommHelper.checkinoutNew("CHECKOUT", checkoutOp).then((response) => {
            $scope.$apply(function() {
                $scope.checkout = angular.copy(response.details);
                $scope.checkedOutList.push(response.details);
            })
            // KVStore.set(LOCAL_STORAGE_KEY, $scope.checkout);
        }).catch((err) => {
            Logger.displayError("Error while updating status", err);
       });;
    }).catch((err) => {
        Logger.displayError("Error while scanning QR code", err);
    });
}

$scope.doCheckin = function() {
    scanBikeLabel().then((bikeLabel) => {
        if (bikeLabel === $scope.checkout.bikeLabel) {
            CommHelper.checkinoutNew("CHECKIN", $scope.checkout).then((response) => {
              $scope.$apply(function() {
                // KVStore.remove(LOCAL_STORAGE_KEY);
                $scope.checkedOutList = $scope.checkedOutList.filter(
                    (el) => el.bikeLabel != $scope.checkout.bikeLabel);
                $scope.checkout.status = false;
                // remember to set this to undefined *after* we finish filtering
                $scope.checkout.bikeLabel = undefined;
              })
            }).catch((err) => {
              Logger.displayError("Error while updating status", err);
           });;
        } else {
            Logger.displayError("Error while scanning QR code",
                new Error("Please check in bike "+$scope.checkout.bikeLabel+" first"));
        }
    }).catch((err) => {
        Logger.displayError("Error while scanning QR code", err);
    });
}

$scope.refreshState = function() {
    const getList = CommHelper.checkinoutList().then((listResult) => {
        $scope.$apply(() => {
            $scope.checkedOutList = listResult.current_list;
        });
    }).catch((err) => {
        Logger.displayError("Error while updating checked out list", err);
    });
    const getMine = CommHelper.checkinoutGet().then((myResult) => {
        $scope.$apply(() => {
            if (myResult != null) {
                $scope.checkout = myResult.current_checkout;
            } else {
                initCheckout();
            }
        });
    }).catch((err) => {
        Logger.displayError("Error while updating status", err);
        initCheckout();
    });
    const getCalls = [getList, getMine];
    return Promise.all(getCalls);
}

$ionicPlatform.ready(function() {
    if (cordova.plugins.barcodeScanner != undefined) {
        $scope.scanEnabled = true;
    }
    $scope.refreshState();
});
});
