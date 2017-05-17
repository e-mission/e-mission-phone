angular.module('emission.main.control.collection',['emission.services'])
.factory("ControlCollectionHelper", function($window, ControlHelper) {
    var cch = {};
    cch.new_config = {};
    cch.config = {};
    cch.accuracyOptions = {};
    cch.settingsPopup = {};

    cch.getCollectionSettings = function() {
        var promiseList = []
        promiseList.push(cch.getConfig());
        promiseList.push(cch.getAccuracyOptions());
        return Promise.all(promiseList).then(function(resultList){
            var config = resultList[0];
            var accuracyOptions = resultList[1];
            cch.config = config;
            cch.accuracyOptions = accuracyOptions;
            return cch.formatConfigForDisplay(config, accuracyOptions);
        })
    };

    cch.formatConfigForDisplay = function(config, accuracyOptions) {
        var retVal = [];
        for (var prop in config) {
            if (prop == "accuracy") {
                for (var name in accuracyOptions) {
                    if (accuracyOptions[name] == config[prop]) {
                        retVal.push({'key': prop, 'val': name});
                    }
                }
            } else {
                retVal.push({'key': prop, 'val': config[prop]});
            }
        }
        return retVal;
    }

    cch.setConfig = function(config) {
      return $window.cordova.plugins.BEMDataCollection.setConfig(config);
    };

    cch.getConfig = function() {
      return $window.cordova.plugins.BEMDataCollection.getConfig();
    };

    cch.editConfig = function($event) {
        // TODO: replace with angular.clone
        new_config = JSON.parse(JSON.stringify(config));
        console.log("settings popup = "+settingsPopup);
        cch.settingsPopup.show($event);
    }

    $scope.saveAndReloadCollectionSettingsPopover = function() {
        console.log("new config = "+cch.new_config);
        ControlHelper.dataCollectionSetConfig(cch.new_config)
        .then(function(){
            $scope.getCollectionSettings()
        }, function(err){
            console.log("setConfig Error: " + err);
        });
        cch.settingsPopup.hide();
    };

    cch.setAccuracy= function() {
        var accuracyActions = [];
        for (name in $scope.settings.collect.accuracyOptions) {
            accuracyActions.push({text: name, value: $scope.settings.collect.accuracyOptions[name]});
        }
        $ionicActionSheet.show({
            buttons: accuracyActions,
            titleText: "Select accuracy",
            cancelText: "Cancel",
            buttonClicked: function(index, button) {
                cch.new_config.accuracy = button.value;
                return true;
            }
        });
    };

    cch.init = function($scope) {
        $ionicPopover.fromTemplateUrl('templates/control/main-collect-settings.html', {
            scope: $scope
        }).then(function(popover) {
            cch.settingsPopup = popover;
        });
    };

    var accuracy2String = function() {
        var accuracy = cch.config.accuracy;
        for (var k in cch.accuracyOptions) {
            if ($scope.settings.collect.accuracyOptions[k] == accuracy) {
                return k;
            }
        }
    }

    cch.isMediumAccuracy = function() {
        if (cch.config == null) {
            return undefined; // config not loaded when loading ui, set default as false
        } else {
            var accuracyString = accuracy2String();
            if ($scope.isIOS()) {
                return v != "kCLLocationAccuracyBestForNavigation" && v != "kCLLocationAccuracyBest" && v != "kCLLocationAccuracyTenMeters";
            } else if ($scope.isAndroid()) {
                return v != "PRIORITY_HIGH_ACCURACY";
            } else {
                $ionicPopup.alert("Emission does not supprt this platform");
            }
        }
    }

    $scope.toggleLowAccuracy = function() {
        cch.new_config = JSON.parse(JSON.stringify(cch.config));
        if ($scope.getLowAccuracy()) {
            if ($scope.isIOS()) {
                cch.new_config.accuracy = cch.accuracyOptions["kCLLocationAccuracyBest"];
            } else if ($scope.isAndroid()) {
                accuracy = cch.accuracyOptions["PRIORITY_HIGH_ACCURACY"];
            }
        } else {
            if ($scope.isIOS()) {
                cch.new_config.accuracy = cch.accuracyOptions["kCLLocationAccuracyHundredMeters"];
            } else if ($scope.isAndroid()) {
                cch.new_config.accuracy = cch.accuracyOptions["PRIORITY_BALANCED_POWER_ACCURACY"];
            }
        }
        cch.setConfig(cch.new_config)
        .then(function(){
            console.log("setConfig Sucess");
        }, function(err){
            console.log("setConfig Error: " + err);
        });
    }

    return cch;
});
