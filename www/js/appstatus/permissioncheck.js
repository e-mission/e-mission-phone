/*
 * Directive to enable the permissions required for the app to function properly.
 */

import angular from 'angular';

angular.module('emission.appstatus.permissioncheck',
    [])
.directive('permissioncheck', function() {
    return {
        scope: {
            overallstatus: "=",
        },
        controller: "PermissionCheckControl",
        templateUrl: "templates/appstatus/permissioncheck.html"
    };
}).
controller("PermissionCheckControl", function($scope, $element, $attrs,
        $ionicPlatform, $ionicPopup, $window, $translate) {
    console.log("PermissionCheckControl initialized with status "+$scope.overallstatus);

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
       return $scope.setupAndroidNotificationChecks(version);
    }

    $scope.setupBackgroundRestrictionChecks = function(platform, version) {
        if (platform.toLowerCase() == "android") {
            $scope.backgroundUnrestrictionsNeeded = true;
            return $scope.setupAndroidBackgroundRestrictionChecks(version);
        } else if (platform.toLowerCase() == "ios") {
            $scope.backgroundUnrestrictionsNeeded = false;
            $scope.overallBackgroundRestrictionStatus = true;
            $scope.backgroundRestrictionChecks = [];
            return true;
        } else {
            alert("Unknown platform, no tracking");
        }
    }

    let iconMap = (statusState) => statusState? "✅" : "❌";
    let classMap = (statusState) => statusState? "status-green" : "status-red";

    $scope.recomputeOverallStatus = function() {
        $scope.overallstatus = $scope.overallLocStatus
            && $scope.overallFitnessStatus
            && $scope.overallNotificationStatus
            && $scope.overallBackgroundRestrictionStatus;
    }

    $scope.recomputeLocStatus = function() {
        $scope.locChecks.forEach((lc) => {
            lc.statusIcon = iconMap(lc.statusState);
            lc.statusClass = classMap(lc.statusState)
        });
        $scope.overallLocStatus = $scope.locChecks.map((lc) => lc.statusState).reduce((pv, cv) => pv && cv);
        console.log("overallLocStatus = "+$scope.overallLocStatus+" from ", $scope.locChecks);
        $scope.overallLocStatusIcon = iconMap($scope.overallLocStatus);
        $scope.overallLocStatusClass = classMap($scope.overallLocStatus);
        $scope.recomputeOverallStatus();
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
        $scope.recomputeOverallStatus();
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
        $scope.recomputeOverallStatus();
    }

    $scope.recomputeBackgroundRestrictionStatus = function() {
        if (!$scope.backgroundRestrictionChecks) return;
        $scope.backgroundRestrictionChecks.forEach((brc) => {
            brc.statusIcon = iconMap(brc.statusState);
            brc.statusClass = classMap(brc.statusState)
        });
        $scope.overallBackgroundRestrictionStatus = $scope.backgroundRestrictionChecks.map((nc) => nc.statusState).reduce((pv, cv) => pv && cv);
        console.log("overallBackgroundRestrictionStatus = "+$scope.overallBackgroundRestrictionStatus+" from ", $scope.backgroundRestrictionChecks);
        $scope.overallBackgroundRestrictionStatusIcon = iconMap($scope.overallBackgroundRestrictionStatus);
        $scope.overallBackgroundRestrictionStatusClass = classMap($scope.overallBackgroundRestrictionStatus);
        $scope.recomputeOverallStatus();
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

    let refreshChecks = function(checksList, recomputeFn) {
        // without this, even if the checksList is []
        // the reduce in the recomputeFn fails because it is called on a zero
        // length array without a default value
        // we should be able to also specify a default value of True
        // but I don't want to mess with that at this last minute
        if (!checksList || checksList.length == 0) {
            return Promise.resolve(true);
        }
        let checkPromises = checksList?.map((lc) => lc.refresh());
        console.log(checkPromises);
        return Promise.all(checkPromises)
            .then((result) => recomputeFn())
            .catch((error) => recomputeFn())
    }

    $scope.setupAndroidLocChecks = function(platform, version) {
        debugger;
        let fixSettings = function() {
            console.log("Fix and refresh location settings");
            return checkOrFix(locSettingsCheck, $window.cordova.plugins.BEMDataCollection.fixLocationSettings,
                $scope.recomputeLocStatus, true);
        };
        let checkSettings = function() {
            console.log("Refresh location settings");
            return checkOrFix(locSettingsCheck, $window.cordova.plugins.BEMDataCollection.isValidLocationSettings,
                $scope.recomputeLocStatus, false);
        };
        let fixPerms = function() {
            console.log("fix and refresh location permissions");
            return checkOrFix(locPermissionsCheck, $window.cordova.plugins.BEMDataCollection.fixLocationPermissions,
                $scope.recomputeLocStatus, true).then((error) => locPermissionsCheck.desc = error);
        };
        let checkPerms = function() {
            console.log("fix and refresh location permissions");
            return checkOrFix(locPermissionsCheck, $window.cordova.plugins.BEMDataCollection.isValidLocationPermissions,
                $scope.recomputeLocStatus, false);
        };
        var androidSettingsDescTag = "intro.appstatus.locsettings.description.android-gte-9";
        if (version < 9) {
            androidSettingsDescTag = "intro.appstatus.locsettings.description.android-lt-9";
        }
        var androidPermDescTag = "intro.appstatus.locperms.description.android-gte-12";
        if($scope.osver < 6) {
            androidPermDescTag = 'intro.appstatus.locperms.description.android-lt-6';
        } else if ($scope.osver < 10) {
            androidPermDescTag = "intro.appstatus.locperms.description.android-6-9";
        } else if ($scope.osver < 11) {
            androidPermDescTag= "intro.appstatus.locperms.description.android-10";
        } else if ($scope.osver < 12) {
            androidPermDescTag= "intro.appstatus.locperms.description.android-11";
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
        refreshChecks($scope.locChecks, $scope.recomputeLocStatus);
    }

    $scope.setupIOSLocChecks = function(platform, version) {
        let fixSettings = function() {
            console.log("Fix and refresh location settings");
            return checkOrFix(locSettingsCheck, $window.cordova.plugins.BEMDataCollection.fixLocationSettings,
                $scope.recomputeLocStatus, true);
        };
        let checkSettings = function() {
            console.log("Refresh location settings");
            return checkOrFix(locSettingsCheck, $window.cordova.plugins.BEMDataCollection.isValidLocationSettings,
                $scope.recomputeLocStatus, false);
        };
        let fixPerms = function() {
            console.log("fix and refresh location permissions");
            return checkOrFix(locPermissionsCheck, $window.cordova.plugins.BEMDataCollection.fixLocationPermissions,
                $scope.recomputeLocStatus, true).then((error) => locPermissionsCheck.desc = error);
        };
        let checkPerms = function() {
            console.log("fix and refresh location permissions");
            return checkOrFix(locPermissionsCheck, $window.cordova.plugins.BEMDataCollection.isValidLocationPermissions,
                $scope.recomputeLocStatus, false);
        };
        var iOSSettingsDescTag = "intro.appstatus.locsettings.description.ios";
        var iOSPermDescTag = "intro.appstatus.locperms.description.ios-gte-13";
        if($scope.osver < 13) {
            iOSPermDescTag = 'intro.appstatus.locperms.description.ios-lt-13';
        }
        console.log("description tags are "+iOSSettingsDescTag+" "+iOSPermDescTag);
        // location settings
        let locSettingsCheck = {
            name: $translate.instant("intro.appstatus.locsettings.name"),
            desc: $translate.instant(iOSSettingsDescTag),
            statusState: false,
            fix: fixSettings,
            refresh: checkSettings
        }
        let locPermissionsCheck = {
            name: $translate.instant("intro.appstatus.locperms.name"),
            desc: $translate.instant(iOSPermDescTag),
            statusState: false,
            fix: fixPerms,
            refresh: checkPerms
        }
        $scope.locChecks = [locSettingsCheck, locPermissionsCheck];
        refreshChecks($scope.locChecks, $scope.recomputeLocStatus);
    }

    $scope.setupAndroidFitnessChecks = function(platform, version) {
        $scope.fitnessPermNeeded = ($scope.osver >= 10);

        let fixPerms = function() {
            console.log("fix and refresh fitness permissions");
            return checkOrFix(fitnessPermissionsCheck, $window.cordova.plugins.BEMDataCollection.fixFitnessPermissions,
                $scope.recomputeFitnessStatus, true).then((error) => fitnessPermissionsCheck.desc = error);
        };
        let checkPerms = function() {
            console.log("fix and refresh fitness permissions");
            return checkOrFix(fitnessPermissionsCheck, $window.cordova.plugins.BEMDataCollection.isValidFitnessPermissions,
                $scope.recomputeFitnessStatus, false);
        };
  
        let fitnessPermissionsCheck = {
            name: $translate.instant("intro.appstatus.fitnessperms.name"),
            desc: $translate.instant("intro.appstatus.fitnessperms.description.android"),
            fix: fixPerms,
            refresh: checkPerms
        }
        $scope.overallFitnessName = $translate.instant("intro.appstatus.overall-fitness-name-android");
        $scope.fitnessChecks = [fitnessPermissionsCheck];
        refreshChecks($scope.fitnessChecks, $scope.recomputeFitnessStatus);
    }

    $scope.setupIOSFitnessChecks = function(platform, version) {
        $scope.fitnessPermNeeded = true;

        let fixPerms = function() {
            console.log("fix and refresh fitness permissions");
            return checkOrFix(fitnessPermissionsCheck, $window.cordova.plugins.BEMDataCollection.fixFitnessPermissions,
                $scope.recomputeFitnessStatus, true).then((error) => fitnessPermissionsCheck.desc = error);
        };
        let checkPerms = function() {
            console.log("fix and refresh fitness permissions");
            return checkOrFix(fitnessPermissionsCheck, $window.cordova.plugins.BEMDataCollection.isValidFitnessPermissions,
                $scope.recomputeFitnessStatus, false);
        };
  
        let fitnessPermissionsCheck = {
            name: $translate.instant("intro.appstatus.fitnessperms.name"),
            desc: $translate.instant("intro.appstatus.fitnessperms.description.ios"),
            fix: fixPerms,
            refresh: checkPerms
        }
        $scope.overallFitnessName = $translate.instant("intro.appstatus.overall-fitness-name-ios");
        $scope.fitnessChecks = [fitnessPermissionsCheck];
        refreshChecks($scope.fitnessChecks, $scope.recomputeFitnessStatus);
    }

    $scope.setupAndroidNotificationChecks = function() {
        let fixPerms = function() {
            console.log("fix and refresh notification permissions");
            return checkOrFix(appAndChannelNotificationsCheck, $window.cordova.plugins.BEMDataCollection.fixShowNotifications,
                $scope.recomputeNotificationStatus, true);
        };
        let checkPerms = function() {
            console.log("fix and refresh notification permissions");
            return checkOrFix(appAndChannelNotificationsCheck, $window.cordova.plugins.BEMDataCollection.isValidShowNotifications,
                $scope.recomputeNotificationStatus, false);
        };
        let appAndChannelNotificationsCheck = {
            name: $translate.instant("intro.appstatus.notificationperms.app-enabled-name"),
            desc: $translate.instant("intro.appstatus.notificationperms.description.android-enable"),
            fix: fixPerms,
            refresh: checkPerms
        }
        $scope.notificationChecks = [appAndChannelNotificationsCheck];
        refreshChecks($scope.notificationChecks, $scope.recomputeNotificationStatus);
    }

    $scope.setupAndroidBackgroundRestrictionChecks = function() {
        let fixPerms = function() {
            console.log("fix and refresh backgroundRestriction permissions");
            return checkOrFix(unusedAppsUnrestrictedCheck, $window.cordova.plugins.BEMDataCollection.fixUnusedAppRestrictions,
                $scope.recomputeBackgroundRestrictionStatus, true);
        };
        let checkPerms = function() {
            console.log("fix and refresh backgroundRestriction permissions");
            return checkOrFix(unusedAppsUnrestrictedCheck, $window.cordova.plugins.BEMDataCollection.isUnusedAppUnrestricted,
                $scope.recomputeBackgroundRestrictionStatus, false);
        };
        let fixBatteryOpt = function() {
            console.log("fix and refresh battery optimization permissions");
            return checkOrFix(ignoreBatteryOptCheck, $window.cordova.plugins.BEMDataCollection.fixIgnoreBatteryOptimizations,
                $scope.recomputeBackgroundRestrictionStatus, true);
        };
        let checkBatteryOpt = function() {
            console.log("fix and refresh battery optimization permissions");
            return checkOrFix(ignoreBatteryOptCheck, $window.cordova.plugins.BEMDataCollection.isIgnoreBatteryOptimizations,
                $scope.recomputeBackgroundRestrictionStatus, false);
        };
        var androidUnusedDescTag = "intro.appstatus.unusedapprestrict.description.android-disable-gte-12";
        if ($scope.osver < 12) {
            androidUnusedDescTag= "intro.appstatus.unusedapprestrict.description.android-disable-lt-12";
        }
        let unusedAppsUnrestrictedCheck = {
            name: $translate.instant("intro.appstatus.unusedapprestrict.name"),
            desc: $translate.instant(androidUnusedDescTag),
            fix: fixPerms,
            refresh: checkPerms
        }
        let ignoreBatteryOptCheck = {
            name: $translate.instant("intro.appstatus.ignorebatteryopt.name"),
            desc: $translate.instant("intro.appstatus.ignorebatteryopt.description.android-disable"),
            fix: fixBatteryOpt,
            refresh: checkBatteryOpt
        }
        $scope.backgroundRestrictionChecks = [unusedAppsUnrestrictedCheck, ignoreBatteryOptCheck];
        refreshChecks($scope.backgroundRestrictionChecks, $scope.recomputeBackgroundRestrictionStatus);
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
        $scope.setupBackgroundRestrictionChecks($scope.platform, $scope.osver);
    });

    $ionicPlatform.on("resume", function() {
        console.log("PERMISSION CHECK: app has resumed, should refresh");
        refreshChecks($scope.locChecks, $scope.recomputeLocStatus);
        refreshChecks($scope.fitnessChecks, $scope.recomputeFitnessStatus);
        refreshChecks($scope.notificationChecks, $scope.recomputeNotificationStatus);
        refreshChecks($scope.backgroundRestrictionChecks, $scope.recomputeBackgroundRestrictionStatus);
    });

    $scope.$on("recomputeAppStatus", function(e, callback) {
        console.log("PERMISSION CHECK: recomputing state");
        Promise.all([
            refreshChecks($scope.locChecks, $scope.recomputeLocStatus),
            refreshChecks($scope.fitnessChecks, $scope.recomputeFitnessStatus),
            refreshChecks($scope.notificationChecks, $scope.recomputeNotificationStatus),
            refreshChecks($scope.backgroundRestrictionChecks, $scope.recomputeBackgroundRestrictionStatus)
        ]).then( () => {
            callback($scope.overallstatus)
        }
        );
    });
});
