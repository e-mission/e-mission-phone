/*
 * Directive to enable the permissions required for the app to function properly.
 */

angular.module('emission.appstatus.permissioncheck',
    [])
.directive('permissioncheck', function() {
    return {
        scope: {
        },
        controller: "PermissionCheckControl",
        templateUrl: "templates/appstatus/permissioncheck.html"
    };
}).
controller("PermissionCheckControl", function($scope, $element, $attrs,
        $ionicPlatform, $ionicPopup, $window, $translate) {
    console.log("PermissionCheckControl initialized");

    $scope.setupLocChecks = function(platform, version) {
        if (platform.toLowerCase() == "android") {
            return $scope.setupAndroidLocChecks(version);
        } else if (platform.toLowerCase() == "ios") {
            return $scope.setupIOSLocChecks(version);
        } else {
            alert("Unknown platform, no tracking");
        }
    }

    $scope.setupFitnessChecks = function(platform, version) {
        if (platform.toLowerCase() == "android") {
            return $scope.setupAndroidFitnessChecks(version);
        } else if (platform.toLowerCase() == "ios") {
            return $scope.setupIOSFitnessChecks(version);
        } else {
            alert("Unknown platform, no tracking");
        }
    }

    $scope.setupNotificationChecks = function(platform, version) {
        if (platform.toLowerCase() == "android") {
            return $scope.setupAndroidNotificationChecks(version);
        } else if (platform.toLowerCase() == "ios") {
            return $scope.setupIOSNotificationChecks(version);
        } else {
            alert("Unknown platform, no tracking");
        }
    }

    let iconMap = (statusState) => statusState? "✅" : "❌";
    let classMap = (statusState) => statusState? "status-green" : "status-red";

    $scope.recomputeLocStatus = function() {
        $scope.locChecks.forEach((lc) => {
            lc.statusIcon = iconMap(lc.statusState);
            lc.statusClass = classMap(lc.statusState)
        });
        $scope.overallLocStatus = $scope.locChecks.map((lc) => lc.statusState).reduce((pv, cv) => pv && cv);
        console.log("overallLocStatus = "+$scope.overallLocStatus+" from ", $scope.locChecks);
        $scope.overallLocStatusIcon = iconMap($scope.overallLocStatus);
        $scope.overallLocStatusClass = classMap($scope.overallLocStatus);
    }

    $scope.recomputeFitnessStatus = function() {
        $scope.fitnessChecks.forEach((fc) => {
            fc.statusIcon = iconMap(fc.statusState);
            fc.statusClass = classMap(fc.statusState)
        });
        $scope.overallFitnessStatus = $scope.fitnessChecks.map((fc) => fc.statusState).reduce((pv, cv) => pv && cv);
        console.log("overallFitnessStatus = "+$scope.overallFitnessStatus+" from ", $scope.fitnessChecks);
        $scope.overallFitnessStatusIcon = iconMap($scope.overallFitnessStatus);
        $scope.overallFitnessStatusClass = classMap($scope.overallFitnessStatus);
    }

    $scope.recomputeNotificationStatus = function() {
        $scope.notificationChecks.forEach((nc) => {
            nc.statusIcon = iconMap(nc.statusState);
            nc.statusClass = classMap(nc.statusState)
        });
        $scope.overallNotificationStatus = $scope.notificationChecks.map((nc) => nc.statusState).reduce((pv, cv) => pv && cv);
        console.log("overallNotificationStatus = "+$scope.overallNotificationStatus+" from ", $scope.notificationChecks);
        $scope.overallNotificationStatusIcon = iconMap($scope.overallNotificationStatus);
        $scope.overallNotificationStatusClass = classMap($scope.overallNotificationStatus);
    }

    let checkOrFix = function(checkObj, nativeFn, recomputeFn, showError=true) {
        return nativeFn()
            .then((status) => {
                console.log("availability ", status)
                $scope.$apply(() => {
                    checkObj.statusState = true;
                    recomputeFn();
                });
                return status;
            }).catch((error) => {
                console.log("Error", error)
                if (showError) {
                    $ionicPopup.alert({
                        title: "Error",
                        template: "<div class='item-text-wrap'>"+error+"</div>",
                        okText: "Please fix again"
                    });
                };
                $scope.$apply(() => {
                    checkObj.statusState = false;
                    recomputeFn();
                });
                return error;
            });
    }

    $scope.setupAndroidLocChecks = function(platform, version) {
        let fixSettings = function() {
            console.log("Fix and refresh location settings");
            return checkOrFix(locSettingsCheck, $window.cordova.plugins.BEMDataCollection.fixLocationSettings,
                $scope.recomputeLocStatus, showError=true);
        };
        let checkSettings = function() {
            console.log("Refresh location settings");
            return checkOrFix(locSettingsCheck, $window.cordova.plugins.BEMDataCollection.isValidLocationSettings,
                $scope.recomputeLocStatus, showError=false);
        };
        let fixPerms = function() {
            console.log("fix and refresh location permissions");
            return checkOrFix(locPermissionsCheck, $window.cordova.plugins.BEMDataCollection.fixLocationPermissions,
                $scope.recomputeLocStatus, showError=true);
        };
        let checkPerms = function() {
            console.log("fix and refresh location permissions");
            return checkOrFix(locPermissionsCheck, $window.cordova.plugins.BEMDataCollection.isValidLocationPermissions,
                $scope.recomputeLocStatus, showError=false);
        };
        var androidSettingsDescTag = "intro.appstatus.locsettings.description.android-gte-9";
        if (version < 9) {
            androidSettingsDescTag = "intro.appstatus.locsettings.description.android-lt-9";
        }
        var androidPermDescTag = "intro.appstatus.locperms.description.android-gte-11";
        if($scope.osver < 6) {
            androidPermDescTag = 'intro.appstatus.locperms.description.android-lt-6';
        } else if ($scope.osver < 10) {
            androidPermDescTag = "intro.appstatus.locperms.description.android-6-9";
        } else if ($scope.osver < 11) {
            androidPermDescTag= "intro.appstatus.locperms.description.android-10";
        }
        console.log("description tags are "+androidSettingsDescTag+" "+androidPermDescTag);
        // location settings
        let locSettingsCheck = {
            name: $translate.instant("intro.appstatus.locsettings.name"),
            desc: $translate.instant(androidSettingsDescTag),
            statusState: false,
            fix: fixSettings,
            refresh: checkSettings
        }
        let locPermissionsCheck = {
            name: $translate.instant("intro.appstatus.locperms.name"),
            desc: $translate.instant(androidPermDescTag),
            statusState: false,
            fix: fixPerms,
            refresh: checkPerms
        }
        $scope.locChecks = [locSettingsCheck, locPermissionsCheck];
        let locCheckPromises = $scope.locChecks.map((lc) => lc.refresh());
        console.log(locCheckPromises);
        Promise.all(locCheckPromises)
            .then((result) => $scope.recomputeLocStatus())
            .catch((error) => $scope.recomputeLocStatus())
    }

    $scope.setupAndroidFitnessChecks = function(platform, version) {
        $scope.fitnessPermNeeded = ($scope.osver >= 10);

        let fixPerms = function() {
            console.log("fix and refresh fitness permissions");
            return checkOrFix(fitnessPermissionsCheck, $window.cordova.plugins.BEMDataCollection.fixFitnessPermissions,
                $scope.recomputeFitnessStatus, showError=true);
        };
        let checkPerms = function() {
            console.log("fix and refresh fitness permissions");
            return checkOrFix(fitnessPermissionsCheck, $window.cordova.plugins.BEMDataCollection.isValidFitnessPermissions,
                $scope.recomputeFitnessStatus, showError=false);
        };
  
        let fitnessPermissionsCheck = {
            name: $translate.instant("intro.appstatus.fitnessperms.name"),
            desc: $translate.instant("intro.appstatus.fitnessperms.description.android"),
            fix: fixPerms,
            refresh: checkPerms
        }
        $scope.fitnessChecks = [fitnessPermissionsCheck];
        let fitnessCheckPromises = $scope.fitnessChecks.map((fc) => fc.refresh());
        console.log(fitnessCheckPromises);
        Promise.all(fitnessCheckPromises)
            .then((result) => $scope.recomputeFitnessStatus())
            .catch((error) => $scope.recomputeFitnessStatus())
    }

    $scope.setupAndroidNotificationChecks = function() {
        let fixPerms = function() {
            console.log("fix and refresh notification permissions");
            return checkOrFix(appAndChannelNotificationsCheck, $window.cordova.plugins.BEMDataCollection.fixShowNotifications,
                $scope.recomputeNotificationStatus, showError=true);
        };
        let checkPerms = function() {
            console.log("fix and refresh notification permissions");
            return checkOrFix(appAndChannelNotificationsCheck, $window.cordova.plugins.BEMDataCollection.isValidShowNotifications,
                $scope.recomputeNotificationStatus, showError=false);
        };
        let fixPaused = function() {
            console.log("refresh notification pause status");
            return checkOrFix(appUnpausedCheck, $window.cordova.plugins.BEMDataCollection.isNotificationsUnpaused,
                $scope.recomputeNotificationStatus, showError=true);
        };
        let checkPaused = function() {
            console.log("refresh notification pause status");
            return checkOrFix(appUnpausedCheck, $window.cordova.plugins.BEMDataCollection.isNotificationsUnpaused,
                $scope.recomputeNotificationStatus, showError=false);
        };
        let appAndChannelNotificationsCheck = {
            name: $translate.instant("intro.appstatus.notificationperms.app-enabled-name"),
            desc: $translate.instant("intro.appstatus.notificationperms.description.android-enable"),
            fix: fixPerms,
            refresh: checkPerms
        }
        let appUnpausedCheck = {
            name: $translate.instant("intro.appstatus.notificationperms.not-paused-name"),
            desc: $translate.instant("intro.appstatus.notificationperms.description.android-unpause"),
            fix: fixPaused,
            refresh: checkPaused
        }
        $scope.notificationChecks = [appAndChannelNotificationsCheck, appUnpausedCheck];
        let notificationCheckPromises = $scope.notificationChecks.map((fc) => fc.refresh());
        console.log("About to initialize notification status");
        console.log(notificationCheckPromises);
        Promise.all(notificationCheckPromises)
            .then((result) => $scope.recomputeNotificationStatus())
            .catch((error) => $scope.recomputeNotificationStatus())
    }

    $scope.setupPermissionText = function() {
        if($scope.platform.toLowerCase() == "ios") {
          if($scope.osver < 13) {
              $scope.locationPermExplanation = $translate.instant("intro.permissions.locationPermExplanation-ios-lt-13");
          } else {
              $scope.locationPermExplanation = $translate.instant("intro.permissions.locationPermExplanation-ios-gte-13");
          }
        }
  
        $scope.backgroundRestricted = false;
        if($window.device.manufacturer.toLowerCase() == "samsung") {
          $scope.backgroundRestricted = true;
          $scope.allowBackgroundInstructions = $translate.instant("intro.allow_background.samsung");
        }
  
        console.log("Explanation = "+$scope.locationPermExplanation);
    }

    $scope.checkLocationServicesEnabled = function() {
        console.log("About to see if location services are enabled");
    }
    $ionicPlatform.ready().then(function() {
        console.log("app is launched, should refresh");
        $scope.platform = $window.device.platform;
        $scope.osver = $window.device.version.split(".")[0];
        $scope.setupPermissionText();
        $scope.setupLocChecks($scope.platform, $scope.osver);
        $scope.setupFitnessChecks($scope.platform, $scope.osver);
        $scope.setupNotificationChecks($scope.platform, $scope.osver);
    });

    $ionicPlatform.on("resume", function() {
        console.log("app has resumed, should refresh");
    });
});
