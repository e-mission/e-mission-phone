'use strict';

angular.module('emission.eval.services', ['emission.plugin.logger',
    "emission.services", "emission.main.control.collection",
    "emission.main.control.sync"])

.service('EvalServices', function($window, $rootScope,
                                 $ionicPopup, $http, $timeout,
                                 Config, ControlHelper,
                                 ControlCollectionHelper, ControlSyncHelper,
                                 Logger) {

    const EVAL_TRANSITION_KEY = "manual/evaluation_transition";

    /*
     * BEGIN: persistence code. Everything from the controller that does not
     * invoke one of these deals only with local state.
     */

    var storeBatteryReading = function() {
        return $window.cordova.plugins.BEMDataCollection.storeBatteryLevel();
    }

    // we need to pass in the trip id as well since we re-use the same function
    // for both calibration and evaluation
    this.generateTransition = function(transition_data) {
        return $window.cordova.plugins.BEMUserCache.putMessage(EVAL_TRANSITION_KEY,
            transition_data);
    }

    var setTrackingState = function(targetTrackingState) {
        if (targetTrackingState) {
            return ControlCollectionHelper.forceTransitionWrapper('START_TRACKING');
        } else {
            return ControlCollectionHelper.forceTransitionWrapper('STOP_TRACKING');
        }
    };


    var xPlatformSync = function() {
        if (ionic.Platform.isAndroid()) {
            return new Promise(function(resolve, reject) {
                ControlSyncHelper.forceSync();
                $timeout(resolve(), 30000);
            });
        } else {
            return ControlSyncHelper.forceSync();
        }
    }

    var applyCollectionConfig = function(new_config) {
        return ControlCollectionHelper.setConfig(new_config).then(function() {
            $rootScope.$broadcast('control.update.complete', 'collection config');
        }).catch(function(err) {
            Logger.displayError("Error while setting collection config", err);
        });
    }

    /*
     * BEGIN: utility functions to fill in scope variables from elsewhere.
     * Moved in here so that we can reuse $window and ControlHelper
     */

    this.readConstants = function(scope) {
        // runs in the background; no dependencies on UI display
        scope.device_info = {
            "manufacturer": device.manufacturer,
            "model": device.model,
            "version": device.version,
        }
        $window.cordova.plugins.BEMDataCollection.getAccuracyOptions().then(function(accuracyOptions) {
            scope.accuracyOptions = accuracyOptions;
        });
    }

    this.readEmail = function(scope) {
        if (!angular.isDefined(scope.curr_phone.email)) {
            ControlHelper.getUserEmail().then(function(response) {
                scope.$apply(function() {
                    if (response == null) {
                        scope.curr_phone.email = "Not logged in";
                    } else {
                        scope.curr_phone.email = response;
                    }
                });
            }).catch(function(error) {
                Logger.displayError("Error while reading current login", error);
            });
        }
    }

    this.setNoExperimentConfig = function(no_exp_config) {
        this.NO_EXP_CONFIG = no_exp_config;
    }

    this.getTransitionData = function(transition_type, trip_id, scope) {
        var data = {
            transition: transition_type,
            trip_id: trip_id, // either calibration or evaluation
            spec_id: scope.sel_spec.full_spec.id,
            device_manufacturer: scope.device_info.manufacturer,
            device_model: scope.device_info.model,
            device_version: scope.device_info.version,
            ts: moment().valueOf() / 1000
        }
        return data;
    }

    this.startRange = function(transition_data, config, tracking_state) {
        return this.generateTransition(transition_data)
            .then(Promise.all([storeBatteryReading(),
                    applyCollectionConfig(config)
                        .then(setTrackingState(tracking_state))]))
        
    }

    this.endRange = function(transition_data) {
        return Promise.all([storeBatteryReading(),
                    setTrackingState(false)
                        .then(applyCollectionConfig(this.NO_EXP_CONFIG))])
            .then(this.generateTransition(transition_data))
            .then(xPlatformSync)
    }

    this.switchRange = function(old_transition_data, new_transition_data,
            new_config, new_tracking_state) {
        return storeBatteryReading()
            .then(this.generateTransition(old_transition_data))
            .then(this.generateTransition(new_transition_data))
            .then(storeBatteryReading())
            .then(setTrackingState(new_tracking_state))
            .then(applyCollectionConfig(new_config))
    }
})
