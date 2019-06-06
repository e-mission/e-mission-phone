angular.module('emission.main.control.collection', [])
.factory("ControlCollectionHelper", function($window, 
        $ionicActionSheet, $ionicPopup, $ionicPopover, $rootScope) {

    var cch = {};
    cch.new_config = {};
    cch.config = {};
    cch.accuracyOptions = {};
    cch.settingsPopup = {};

    /* 
     * Functions to read and format values for display
     */

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

    /* 
     * Functions to edit and save values
     */

    var getPopoverScope = function() {
        var new_scope = $rootScope.$new();
        new_scope.saveAndReload = cch.saveAndReload;
        new_scope.isIOS = ionic.Platform.isIOS;
        new_scope.isAndroid = ionic.Platform.isAndroid;
        new_scope.setAccuracy = cch.setAccuracy;
        return new_scope;
    }

    cch.editConfig = function($event) {
        // TODO: replace with angular.clone
        cch.new_config = JSON.parse(JSON.stringify(cch.config));
        var popover_scope = getPopoverScope();
        popover_scope.new_config = cch.new_config;
        $ionicPopover.fromTemplateUrl('templates/control/main-collect-settings.html', {
            scope: popover_scope
        }).then(function(popover) {
            cch.settingsPopup = popover;
            console.log("settings popup = "+cch.settingsPopup);
            cch.settingsPopup.show($event);
        });
        return cch.new_config;
    }

    cch.saveAndReload = function() {
        console.log("new config = "+cch.new_config);
        cch.setConfig(cch.new_config)
        .then(function(){
            cch.config = cch.new_config;
            $rootScope.$broadcast('control.update.complete', 'collection config');
        }, function(err){
            window.logger.Logger.displayError("Error while setting collection config", err);
        });
        cch.settingsPopup.hide();
        cch.settingsPopup.remove();
    };

    /* 
     * Edit helpers for values that selected from actionSheets
     */

    cch.setAccuracy= function() {
        var accuracyActions = [];
        for (name in cch.accuracyOptions) {
            accuracyActions.push({text: name, value: cch.accuracyOptions[name]});
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

    cch.forceState = function() {
        var forceStateActions = [{text: "Initialize",
                                  transition: "INITIALIZE"},
                                 {text: 'Start trip',
                                  transition: "EXITED_GEOFENCE"},
                                 {text: 'End trip',
                                  transition: "STOPPED_MOVING"},
                                 {text: 'Visit ended',
                                  transition: "VISIT_ENDED"},
                                 {text: 'Visit started',
                                  transition: "VISIT_STARTED"},
                                 {text: 'Remote push',
                                  transition: "RECEIVED_SILENT_PUSH"}];
        $ionicActionSheet.show({
            buttons: forceStateActions,
            titleText: "Force state",
            cancelText: "Cancel",
            buttonClicked: function(index, button) {
                cch.forceTransition(button.transition);
                return true;
            }
        });
    };

    cch.forceTransition = function(transition) {
        cch.forceTransitionWrapper(transition).then(function(result) {
            $ionicPopup.alert({template: 'success -> '+result}).then(function() {
                $rootScope.$broadcast('control.update.complete', 'forceTransition');
            });
        }, function(error) {
            $ionicPopup.alert({template: 'error -> '+error}).then(function() {
                $rootScope.$broadcast('control.update.complete', 'forceTransition');
            });
        });
    };


    /* 
     * Functions for the separate accuracy toggle 
     */

    var accuracy2String = function() {
        var accuracy = cch.config.accuracy;
        for (var k in cch.accuracyOptions) {
            if (cch.accuracyOptions[k] == accuracy) {
                return k;
            }
        }
    }

    cch.isMediumAccuracy = function() {
        if (cch.config == null) {
            return undefined; // config not loaded when loading ui, set default as false
        } else {
            var v = accuracy2String();
            if (ionic.Platform.isIOS()) {
                return v != "kCLLocationAccuracyBestForNavigation" && v != "kCLLocationAccuracyBest" && v != "kCLLocationAccuracyTenMeters";
            } else if (ionic.Platform.isAndroid()) {
                return v != "PRIORITY_HIGH_ACCURACY";
            } else {
                $ionicPopup.alert("Emission does not support this platform");
            }
        }
    }

    cch.toggleLowAccuracy = function() {
        cch.new_config = JSON.parse(JSON.stringify(cch.config));
        if (cch.isMediumAccuracy()) {
            if (ionic.Platform.isIOS()) {
                cch.new_config.accuracy = cch.accuracyOptions["kCLLocationAccuracyBest"];
            } else if (ionic.Platform.isAndroid()) {
                cch.new_config.accuracy = cch.accuracyOptions["PRIORITY_HIGH_ACCURACY"];
            }
        } else {
            if (ionic.Platform.isIOS()) {
                cch.new_config.accuracy = cch.accuracyOptions["kCLLocationAccuracyHundredMeters"];
            } else if (ionic.Platform.isAndroid()) {
                cch.new_config.accuracy = cch.accuracyOptions["PRIORITY_BALANCED_POWER_ACCURACY"];
            }
        }
        cch.setConfig(cch.new_config)
        .then(function(){
            console.log("setConfig Sucess");
        }, function(err){
            window.logger.Logger.displayError("Error while setting collection config", err);
        });
    }

    /*
     * BEGIN: Simple read/write wrappers
     */

    cch.getState = function() {
      return window.cordova.plugins.BEMDataCollection.getState();
    };

    cch.setConfig = function(config) {
      return $window.cordova.plugins.BEMDataCollection.setConfig(config);
    };

    cch.getConfig = function() {
      return $window.cordova.plugins.BEMDataCollection.getConfig();
    };

    cch.getAccuracyOptions = function() {
      return $window.cordova.plugins.BEMDataCollection.getAccuracyOptions();
    };

    cch.forceTransitionWrapper = function(transition) {
      return window.cordova.plugins.BEMDataCollection.forceTransition(transition);
    };

    return cch;
});
