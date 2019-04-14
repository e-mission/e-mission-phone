angular.module('emission.main.control.tnotify', [])
.factory("ControlTransitionNotifyHelper", function($window, 
        $ionicActionSheet, $ionicPopup, $ionicPopover, $rootScope) {

    var ctnh = {};
    var CONFIG_LIST = "config_list";
    var MUTED_LIST = "muted_list";
    ctnh.transition_name_list = [
        "trip_started", "trip_ended", "tracking_started", "tracking_stopped"
    ];
    ctnh.new_configList = [];
    ctnh.transition2configList = [];
    ctnh.mergedTransitionNotifyEnableList = [];
    ctnh.settingsPopup = {};

    /* 
     * Functions to read and format values for display
     */

    ctnh.getTNotifySettings = function() {
        var promiseList = ctnh.transition_name_list.map(function(tn) {
            return ctnh.getConfigForTransition(tn, true);
        });
        return Promise.all(promiseList).then(function(resultList){
            ctnh.transition2configList = resultList;
            var notifyEnableLists = resultList.filter(non_null).map(ctnh.config2notifyList);
            ctnh.mergedTransitionNotifyEnableList = notifyEnableLists.reduce(
                function(acc, val) {
                return acc.concat(val);
            });
            // return mergedTransitionNotifyEnable.map(ctnh.formatConfigForDisplay);
            return ctnh.mergedTransitionNotifyEnableList;
        })
    };

    var non_null = function(el) {
        return el != null;
    }

    /*
     * Output of this function is a map of the form:
     * { transitionName: "trip_ended",
         notifyOptions: {
            id: "737678",
            title: "Trip just ended",
            ...
         },
         enabled: true/false
     * }
     */

    ctnh.config2notifyList = function(configWithMetadata) {
        var configList = configWithMetadata.data[CONFIG_LIST];
        var mutedList = configWithMetadata.data[MUTED_LIST];
        var enabledList = configList.map(function(config, i) {
            return !(isMutedEntry(config.id, mutedList));
        });
        var retVal = configList.map(function(config, i) {
            return {
                transitionName: configWithMetadata.metadata.key,
                notifyOptions: config,
                enabled: enabledList[i]
            };
        });
        return retVal;
    }

    var isMutedEntry = function(id, mutedList) {
        if (angular.isUndefined(mutedList)) {
            return false;
        };
        var foundMuted = mutedList.find(function(mutedEntry) {
            if (mutedEntry.id == id) {
                return true;
            }
        });
        // if we found a muted entry, foundMuted is defined
        // so if it is undefined, it is not muted, and we want to return false
        return !(angular.isUndefined(foundMuted));
    }

    /*
     * Currently unused - we're displaying a real template, not just key-value pairs
     */
    ctnh.formatConfigForDisplay = function(tnce) {
        return {'key': tnce.transitionName + " "+tnce.notifyOptions.id +
                " "+tnce.notifyOptions.title, 'val': tnce.enabled};
    }

    /* 
     * Functions to edit and save values
     */

    var getPopoverScope = function() {
        var new_scope = $rootScope.$new();
        new_scope.saveAndReload = ctnh.saveAndReload;
        new_scope.isIOS = ionic.Platform.isIOS;
        new_scope.isAndroid = ionic.Platform.isAndroid;
        new_scope.toggleEnable = ctnh.toggleEnable;
        return new_scope;
    }

    ctnh.editConfig = function($event) {
        ctnh.editedDisplayConfig = angular.copy(ctnh.mergedTransitionNotifyEnableList);
        ctnh.toggledSet = new Set();
        var popover_scope = getPopoverScope();
        popover_scope.display_config = ctnh.editedDisplayConfig;
        $ionicPopover.fromTemplateUrl('templates/control/main-transition-notify-settings.html', {
            scope: popover_scope
        }).then(function(popover) {
            ctnh.settingsPopup = popover;
            console.log("settings popup = "+ctnh.settingsPopup);
            ctnh.settingsPopup.show($event);
        });
        return ctnh.new_config;
    }

    ctnh.saveAndReload = function() {
        console.log("new config = "+ctnh.editedDisplayConfig);
        var toggledArray = [];
        ctnh.toggledSet.forEach(function(v) {
            toggledArray.push(v);
        });
        var promiseList = toggledArray.map(function(currConfigWrapper) {
            // TODO: I think we can use apply here since these are
            // basically the fields.
            return ctnh.setEnabled(currConfigWrapper.transitionName, 
                currConfigWrapper.notifyOptions, currConfigWrapper.enabled);
        });
        Promise.all(promiseList).then(function(resultList) {
            // reset temporary state after all promises are resolved.
            ctnh.mergedTransitionNotifyEnableList = ctnh.editedDisplayConfig;
            ctnh.toggledSet = [];
            $rootScope.$broadcast('control.update.complete', 'collection config');
        }).catch(function(error) {
            console.log("setConfig Error: " + err);
        });

        ctnh.settingsPopup.hide();
        ctnh.settingsPopup.remove();
    };

    /* 
     * Edit helpers for values that selected from actionSheets
     */

    ctnh.toggleEnable = function(entry) {
        console.log(JSON.stringify(entry));
        ctnh.toggledSet.add(entry);
    };

    ctnh.forceState = function() {
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
                ctnh.forceTransition(button.transition);
                return true;
            }
        });
    };

    ctnh.forceTransition = function(transition) {
        ctnh.forceTransitionWrapper(transition).then(function(result) {
            $rootScope.$broadcast('control.update.complete', 'forceTransition');
            $ionicPopup.alert({template: 'success -> '+result});
        }, function(error) {
            $rootScope.$broadcast('control.update.complete', 'forceTransition');
            $ionicPopup.alert({template: 'error -> '+error});
        });
    };


    /* 
     * Functions for the separate accuracy toggle 
     */

    var accuracy2String = function() {
        var accuracy = ctnh.config.accuracy;
        for (var k in ctnh.accuracyOptions) {
            if (ctnh.accuracyOptions[k] == accuracy) {
                return k;
            }
        }
    }

    ctnh.isMediumAccuracy = function() {
        if (ctnh.config == null) {
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

    ctnh.toggleLowAccuracy = function() {
        ctnh.new_config = JSON.parse(JSON.stringify(ctnh.config));
        if (ctnh.isMediumAccuracy()) {
            if (ionic.Platform.isIOS()) {
                ctnh.new_config.accuracy = ctnh.accuracyOptions["kCLLocationAccuracyBest"];
            } else if (ionic.Platform.isAndroid()) {
                accuracy = ctnh.accuracyOptions["PRIORITY_HIGH_ACCURACY"];
            }
        } else {
            if (ionic.Platform.isIOS()) {
                ctnh.new_config.accuracy = ctnh.accuracyOptions["kCLLocationAccuracyHundredMeters"];
            } else if (ionic.Platform.isAndroid()) {
                ctnh.new_config.accuracy = ctnh.accuracyOptions["PRIORITY_BALANCED_POWER_ACCURACY"];
            }
        }
        ctnh.setConfig(ctnh.new_config)
        .then(function(){
            console.log("setConfig Sucess");
        }, function(err){
            console.log("setConfig Error: " + err);
        });
    }

    /*
     * BEGIN: Simple read/write wrappers
     */

    ctnh.getConfigForTransition = function(transitionName, withMetadata) {
      return window.cordova.plugins.BEMUserCache.getLocalStorage(transitionName, withMetadata);
    };

    ctnh.setEnabled = function(transitionName, configData, enableState) {
      if (enableState == true) {
        return window.cordova.plugins.BEMTransitionNotification.enableEventListener(transitionName, configData);
      } else {
        return window.cordova.plugins.BEMTransitionNotification.disableEventListener(transitionName, configData);
      }
    };

    return ctnh;
});
