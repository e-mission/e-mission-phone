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

    $scope.recomputeLocStatus = function() {
        let iconMap = (statusState) => statusState? "✅" : "❌";
        let classMap = (statusState) => statusState? "status-green" : "status-red";
        $scope.locChecks.forEach((lc) => {
            lc.statusIcon = iconMap(lc.statusState);
            lc.statusClass = classMap(lc.statusState)
        });
        $scope.overallLocStatus = $scope.locChecks.map((lc) => lc.statusState).reduce((pv, cv) => pv && cv);
        console.log("overallLocStatus = "+$scope.overallLocStatus+" from ", $scope.locChecks);
        $scope.overallLocStatusIcon = iconMap($scope.overallLocStatus);
        $scope.overallLocStatusClass = classMap($scope.overallLocStatus);
    }

    $scope.setupAndroidLocChecks = function(platform, version) {
        let checkOrFixSettings = function(nativeFn, showError=true) {
            return nativeFn()
                .then((status) => {
                    console.log("availability ", status)
                    $scope.$apply(() => {
                        locSettingsCheck.statusState = true;
                        $scope.recomputeLocStatus();
                    });
                    return status;
                }).catch((error) => {
                    console.log("Error", error)
                    if (showError) {
                        $ionicPopup.alert({
                            title: "Error in location settings",
                            template: "<div class='item-text-wrap'>"+error+"</div>",
                            okText: "Please fix again"
                        });
                    };
                    $scope.$apply(() => {
                        locSettingsCheck.statusState = false;
                        $scope.recomputeLocStatus();
                    });
                    return error;
                });
        }
        let fixSettings = function() {
            console.log("Fix and refresh location settings");
            return checkOrFixSettings($window.cordova.plugins.BEMDataCollection.fixLocationSettings, showError=true);
        };
        let checkSettings = function() {
            console.log("Refresh location settings");
            return checkOrFixSettings($window.cordova.plugins.BEMDataCollection.isValidLocationSettings, showError=false);
        };
        let fixAndRefreshPermissionsPlaceholder = function() {
            console.log("fix or refresh location permissions");
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
            fix: fixAndRefreshPermissionsPlaceholder,
            refresh: fixAndRefreshPermissionsPlaceholder
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
  
        let fixAndRefreshPermissionsPlaceholder = function() {
            console.log("Fix and refresh fitnessation permissions");
        };
        let fitnessPermissionsCheck = {
            name: $translate.instant("intro.appstatus.fitnessperms.name"),
            desc: $translate.instant("intro.appstatus.fitnessperms.description.android"),
            statusIcon: "✅",
            statusClass: "status-green",
            fix: fixAndRefreshPermissionsPlaceholder,
            refresh: fixAndRefreshPermissionsPlaceholder
        }
        $scope.fitnessChecks = [fitnessPermissionsCheck];
        $scope.overallFitnessStatusIcon = "✅";
        $scope.overallFitnessStatusClass = "status-green";
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
    });

    $ionicPlatform.on("resume", function() {
        console.log("app has resumed, should refresh");
    });
});
