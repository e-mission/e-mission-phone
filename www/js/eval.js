'use strict';

angular.module('emission.main.eval',['emission.plugin.logger',"emission.plugin.kvstore",
    "emission.services", "emission.main.control.collection",
    "emission.main.control.sync"])

.controller('EvalCtrl', function($window, $rootScope, $scope, $ionicPlatform,
                                 $ionicModal, $ionicPopup, $ionicActionSheet,
                                 $http, $timeout, KVStore, Config, ControlHelper,
                                 ControlCollectionHelper, ControlSyncHelper,
                                 Logger) {

    const MILLISECONDS = Math.pow(10, 6)

    const ACCURACY_CONTROL_SETTINGS = {
        is_duty_cycling: false,
        accuracy: ["PRIORITY_HIGH_ACCURACY","kCLLocationAccuracyBest"],
        filter: 1,
    }

    const POWER_CONTROL_SETTINGS = {
        is_duty_cycling: false,
        accuracy: ["PRIORITY_NO_POWER","kCLLocationAccuracyThreeKilometers"],
        filter: 1200,
    }

    const DEFAULT_CONFIG = {
        is_duty_cycling: true,
        simulate_user_interaction: false,
        accuracy: ["PRIORITY_HIGH_ACCURACY","kCLLocationAccuracyBest"],
        accuracy_threshold: 200,
        geofence_radius: 100,
        filter: [30,50]
    }

    const SEL_SPEC_KEY = "local/sel_spec";
    const CURR_PHONE_KEY = "local/curr_phone";
    const CALIBRATION_KEY = "local/calibration";
    const EVAL_SETTINGS_KEY = "local/eval_settings";
    const EVAL_TRIP_KEY = "local/eval_trip";

    const EVAL_TRANSITION_KEY = "manual/evaluation_transition";
    const ETENUM = {
        START_CALIBRATION_PERIOD: "START_CALIBRATION_PERIOD",
        STOP_CALIBRATION_PERIOD: "STOP_CALIBRATION_PERIOD",
        START_EVALUATION_PERIOD: "START_EVALUATION_PERIOD",
        STOP_EVALUATION_PERIOD: "STOP_EVALUATION_PERIOD",
        START_EVALUATION_TRIP: "START_EVALUATION_TRIP",
        STOP_EVALUATION_TRIP: "STOP_EVALUATION_TRIP"
    }

    /*
     * START: Control the UX of the summary card
     */
    var shrinkEvalCard = function() {
        $scope.expandedEval = false;
        $scope.eval_settings_card_display.class = "small-eval-settings-card";
        $scope.eval_settings_card_display.icon = "icon ion-chevron-down";
    }

    var expandEvalCard = function() {
        $scope.expandedEval = true;
        $scope.eval_settings_card_display.class = "expanded-eval-settings-card";
        $scope.eval_settings_card_display.icon = "icon ion-chevron-up";
    }

    $scope.toggleEvalCardDisplay = function() {
        if (!$scope.expandedEval) {
            expandEvalCard();
        } else {
            shrinkEvalCard();
        }
    }

    /*
     * END: Control the UX of the summary card
     */


    /*
     * Read experiment info and populate it. Since one author could have
     * multiple experiments, we also store the selected experiment locally
     */

    /* This introduces a function to read information submitted by a different
     * user (the evaluation author).
     * This is not in services.js since:
     * a) it goes against the recommendation that users can only access their
     * own raw data
     * b) it won't work in general because user A won't have the authentication
     * credentials for user B
     */
    var getRawEntriesForAuthor = function(key_list, start_ts, end_ts) {
      return $http.get("json/connectionConfig.json")
        .then(function(result) { return result.data})
        .then(function(connectionConfig) {
            return connectionConfig.connectUrl;
        })
        .then(function(url) {
            var message = {
              "key_list": key_list,
              "start_time": start_ts,
              "end_time": end_ts,
              "user": $scope.sel_spec.author_email
            };
            console.log("About to return message "+JSON.stringify(message));
            console.log("getRawEntries: about to get pushGetJSON for the timestamp");
            return $http.post(url+"/datastreams/find_entries/timestamp", message);
        })
    }

    $scope.getExperimentsForAuthor = function() {
        // $scope.sel_spec.author_email = "shankari@eecs.berkeley.edu"
        return getRawEntriesForAuthor(["config/evaluation_spec"], 0, moment().unix())
            .then(function(result) { return result.data})
            .then(function(serverResponse) { return serverResponse.phone_data; })
            .then(function(eval_spec_entry_list) {
               return eval_spec_entry_list.map(function(es) { return es.data; });
            })
            .then(function(eval_spec_list) {
               $scope.author_eval_spec_list = eval_spec_list;
            })
    }

    /*
     * BEGIN: code to map ids to configuration settings
     */

    var fillFilterValue = function(config, filter_vals) {
        if (typeof filter_vals == "number") {
            var android_val = filter_vals;
            var ios_val = filter_vals;
        } else {
            var android_val = filter_vals[0];
            var ios_val = filter_vals[1];
        }
        if (ionic.Platform.isAndroid()) {
            config.filter_time = android_val;
        } else {
            config.filter_distance = ios_val;
        }
    }

    var fillAccuracyValue = function(config, accuracy_vals) {
        var android_val = accuracy_vals[0];
        var ios_val = accuracy_vals[1];
        if (ionic.Platform.isAndroid()) {
            config.accuracy = $scope.accuracyOptions[android_val];
        } else {
            config.accuracy = $scope.accuracyOptions[ios_val];
        }
    }

    var getPlatformSpecificDefaultConfig = function() {
        var platformSpecificDC = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
        console.log(DEFAULT_CONFIG);
        console.log(platformSpecificDC);
        fillFilterValue(platformSpecificDC, platformSpecificDC.filter);
        delete platformSpecificDC.filter;
        fillAccuracyValue(platformSpecificDC, platformSpecificDC.accuracy);
        console.log(platformSpecificDC);
        return platformSpecificDC;
    }

    var expandForPlatform = function(spec_diffs) {
        var new_config = getPlatformSpecificDefaultConfig();
        Object.keys(spec_diffs).forEach(function(k) {
            if (k == "filter") {
                fillFilterValue(new_config, spec_diffs.filter)
                delete new_config.filter;
            }
            else if (k == "accuracy") {
                fillAccuracyValue(new_config, spec_diffs.accuracy);
            } else {
                new_config[k] = spec_diffs[k]
            }
        });
        console.log(JSON.stringify(new_config));
        return new_config;
    }

    $scope.saveSelectedEval = function() {
        console.log("Selected spec is "+JSON.stringify($scope.sel_spec));
        var phone_map = $scope.sel_spec.full_spec.phones[ionic.Platform.platform()];
        $scope.curr_phone.profile = phone_map[$scope.curr_phone.email]
        $scope.curr_phone.registered = angular.isDefined($scope.curr_phone.profile);
        if (!$scope.curr_phone.registered) {
            $scope.curr_phone.profile = "unregistered";
            $scope.profile_item_style = {color: "red"};
        }
        if ($scope.curr_phone.profile == "accuracy_control") {
            $scope.curr_phone.isAccuracyControl = true;
        }
        if ($scope.curr_phone.profile == "power_control") {
            $scope.curr_phone.isPowerControl = true;
        }
        KVStore.set(SEL_SPEC_KEY, $scope.sel_spec);
        KVStore.set(CURR_PHONE_KEY, $scope.curr_phone);
        $scope.author_spec_sel_modal.hide()
    };

    var find_config = function(sensing_setting, profile) {
        // profile = "evaluation_0"
        var profile_parts = profile.split("_");
        // profile_parts = ["evaluation", "0"]
        if (profile_parts[0] == "evaluation") {
            // profile_parts[1] = "0"
            // config_id = 0
            var config_id = parseInt(profile_parts[1]);
            return sensing_setting["sensing_configs"][config_id]
        }
    }

    $scope.selectSensingSettings = function() {
        var evaluationButtons = [];
        if ($scope.curr_phone.isAccuracyControl) {
            evaluationButtons.push({text: "fixed:ACCURACY_CONTROL",
                config_wrapper: {
                    id: "ACCURACY_CONTROL",
                    name: "Highest possible accuracy",
                    sensing_config: ACCURACY_CONTROL_SETTINGS
                }
            });
        } else if ($scope.curr_phone.isPowerControl) {
            evaluationButtons.push({text: "fixed:POWER_CONTROL",
                config_wrapper: {
                    id: "POWER_CONTROL",
                    name: "Lowest possible power",
                    sensing_config: POWER_CONTROL_SETTINGS
                }
            });
        } else {
            evaluationButtons = $scope.sel_spec.full_spec.sensing_settings.map(
                function(ss) {
                    var cw = find_config(ss, $scope.curr_phone.profile)
                    return {text: ss.name + ":"+cw.id,
                        config_wrapper: cw};
                });
        };
        var RESTORE_DEFAULTS_TEXT = "Restore defaults";
        $ionicActionSheet.show({
            titleText: "Select sensing settings",
            destructiveText: "Restore defaults",
            cancelText: "Cancel",
            buttons: evaluationButtons,
            buttonClicked: function(index, button) {
                if (angular.isDefined($scope.eval_settings.name)) {
                    $scope.generateTransition(ETENUM.STOP_EVALUATION_PERIOD,
                        $scope.eval_settings.name);
                }
                $scope.eval_settings.config_wrapper = button.config_wrapper;
                $scope.eval_settings.full_config = expandForPlatform(button.config_wrapper.sensing_config);
                $scope.eval_settings.name = button.text;
                $scope.generateTransition(ETENUM.START_EVALUATION_PERIOD,
                    $scope.eval_settings.name);
                KVStore.set(EVAL_SETTINGS_KEY, $scope.eval_settings);
                $scope.applyCollectionConfig($scope.eval_settings.full_config);
                return true;
            },
            destructiveButtonClicked: function() {
                if (angular.isDefined($scope.eval_settings.name)) {
                    $scope.generateTransition(ETENUM.STOP_EVALUATION_PERIOD,
                        $scope.eval_settings.name);
                }
                $scope.eval_settings = {};
                KVStore.set(EVAL_SETTINGS_KEY, $scope.eval_settings);
                $scope.applyCollectionConfig(getPlatformSpecificDefaultConfig());
                return true;
            }
        });
    }

    /*
     * END: code to map ids to configuration settings
     */

    /*
     * Select trips for calibration/evaluation.
     * We will use an actionsheet because the select on iOS moves the app up again
     */

    /*
     * START: Control the UX of the calibration card
     */
    var shrinkCalibrationCard = function() {
        $scope.expandedCalibration = false;
        $scope.calibration_settings_card_display.class = "small-calibration-settings-card";
        $scope.calibration_settings_card_display.icon = "icon ion-chevron-down";
    }

    var expandCalibrationCard = function() {
        $scope.expandedCalibration = true;
        $scope.calibration_settings_card_display.class = "expanded-calibration-settings-card";
        $scope.calibration_settings_card_display.icon = "icon ion-chevron-up";
    }

    $scope.toggleCalibrationCardDisplay = function() {
        if (!$scope.expandedCalibration) {
            expandCalibrationCard();
        } else {
            shrinkCalibrationCard();
        }
    }

    /*
     * END: Control the UX of the calibration card
     */

    var pointFormat = function(feature, latlng) {
      return L.marker(latlng, {icon: L.divIcon(feature.properties.icon_style)})
    };

    var toGeojsonCT = function(calibration_test) {
        var featureList = [
            GeoJSON.parse(calibration_test.start_loc, {Point: "coordinates", extra: {
                icon_style: {className: 'leaflet-div-icon-start', iconSize: [12, 12], html: "<div class='inner-icon'>"}
            }}),
            GeoJSON.parse(calibration_test.end_loc, {Point: "coordinates", extra: {
                icon_style: {className: 'leaflet-div-icon-stop', iconSize: [12, 12], html: "<div class='inner-icon'>"}
            }}),
        ]
        featureList.push({
            type: "Feature",
            geometry: {
                type: "LineString",
                coordinates: [calibration_test.start_loc.coordinates, calibration_test.end_loc.coordinates]
            }
        });
        return {
            type: "FeatureCollection",
            features: featureList,
            properties: {
                id: calibration_test.id,
                mode: calibration_test.mode,
            }
        }
    }

    $scope.selectCalibrationTest = function() {
        var calibrationButtons = $scope.sel_spec.full_spec.calibration_tests.map(
            function(ct) {
                return {text: ct.id, test: ct};
            });
        $ionicActionSheet.show({
            titleText: "Select calibration to perform",
            destructiveText: "Restore defaults",
            cancelText: "Cancel",
            buttons: calibrationButtons,
            buttonClicked: function(index, button) {
                if ((angular.isDefined($scope.calibration.curr_test) &&
                     angular.isDefined($scope.calibration.curr_test.id))) {
                    $scope.generateTransition(ETENUM.STOP_CALIBRATION_PERIOD,
                        $scope.calibration.curr_test.id);
                }
                $scope.calibration.curr_test = button.test;
                $scope.calibration.full_config = expandForPlatform($scope.calibration.curr_test.config.sensing_config);
                expandCalibrationCard();
                $scope.calibration.expandedView = angular.undefined;
                if ($scope.calibration.curr_test.start_loc != null &&
                    $scope.calibration.curr_test.end_loc != null) {
                    $scope.calibration.moving = true;
                    $scope.calibration.gj = {data: toGeojsonCT($scope.calibration.curr_test)};
                    $scope.calibration.gj.pointToLayer = pointFormat;
                }
                $scope.generateTransition(ETENUM.START_CALIBRATION_PERIOD,
                    $scope.calibration.curr_test.id);
                KVStore.set(CALIBRATION_KEY, $scope.calibration);
                $scope.applyCollectionConfig($scope.calibration.full_config);
                return true;
            },
            destructiveButtonClicked: function() {
                // This should always be there, but what if the user clicks
                // "Restore defaults" without having selected a calibration
                // test earlier.
                if (angular.isDefined($scope.calibration.curr_test.id)) {
                    $scope.generateTransition(ETENUM.STOP_CALIBRATION_PERIOD,
                        $scope.calibration.curr_test.id);
                }
                $scope.calibration = {};
                shrinkCalibrationCard();
                KVStore.set(CALIBRATION_KEY, $scope.calibration);
                $scope.applyCollectionConfig(getPlatformSpecificDefaultConfig());
                return true;
            }
        });
    }

    /*
     * START: Control the UX of the sensing settings
     */

    var shrinkSensingCard = function() {
        $scope.expandedSensing = false;
        $scope.sensing_settings_card_display.class = "small-sensing-settings-card";
        $scope.sensing_settings_card_display.icon = "icon ion-chevron-down";
    }

    var expandSensingCard = function() {
        $scope.expandedSensing = true;
        $scope.sensing_settings_card_display.class = "expanded-sensing-settings-card";
        $scope.sensing_settings_card_display.icon = "icon ion-chevron-up";
    }

    $scope.toggleSensingCardDisplay = function() {
        if (!$scope.expandedSensing) {
            expandSensingCard();
        } else {
            shrinkSensingCard();
        }
    }

    /*
     * END: Control the UX of the sensing settings
     */

    /*
     * START: Control the UX of the trip settings
     */

    var shrinkTripCard = function() {
        $scope.expandedTrip = false;
        $scope.trip_settings_card_display.class = "small-trip-settings-card";
        $scope.trip_settings_card_display.icon = "icon ion-chevron-down";
    }

    var expandTripCard = function() {
        $scope.expandedTrip = true;
        $scope.trip_settings_card_display.class = "expanded-trip-settings-card";
        $scope.trip_settings_card_display.icon = "icon ion-chevron-up";
    }

    $scope.toggleTripCardDisplay = function() {
        if (!$scope.expandedTrip) {
            expandTripCard();
        } else {
            shrinkTripCard();
        }
    }

    /*
     * END: Control the UX of the trip settings
     */


    var toGeojsonFC = function(eval_trip) {
        var featureList = [
            GeoJSON.parse(eval_trip.start_loc, {Point: "coordinates", extra: {
                icon_style: {className: 'leaflet-div-icon-start', iconSize: [12, 12], html: "<div class='inner-icon'>"}
            }}),
            GeoJSON.parse(eval_trip.end_loc, {Point: "coordinates", extra: {
                icon_style: {className: 'leaflet-div-icon-stop', iconSize: [12, 12], html: "<div class='inner-icon'>"},
            }}),
            GeoJSON.parse(eval_trip, {LineString: "route_coords"})
        ]
        return {
            type: "FeatureCollection",
            features: featureList,
            properties: {
                id: eval_trip.id,
                name: eval_trip.name,
                mode: eval_trip.mode,
                waypoints: eval_trip.route_waypoints
            }
        }
    }

    $scope.selectEvaluationTrip = function() {
        var evaluationButtons = $scope.sel_spec.full_spec.evaluation_trips.map(
            function(ct) {
                return {text: ct.name,
                        trip: ct};
            });
        $ionicActionSheet.show({
            titleText: "Select evaluation to perform",
            cancelText: "Cancel",
            buttons: evaluationButtons,
            buttonClicked: function(index, button) {
                $scope.eval_trip.waiting_for_trip_start = true;
                $scope.eval_trip.raw = button.trip;
                var curr_fc = toGeojsonFC(button.trip);
                $scope.eval_trip.gj = {data: curr_fc}
                $scope.eval_trip.gj.pointToLayer = pointFormat;
                KVStore.set(EVAL_TRIP_KEY, $scope.eval_trip);
                return true;
            }
        });
    }

    $scope.startEvalTrip = function() {
        $scope.eval_trip.ongoing_trip = true;
        $scope.eval_trip.waiting_for_trip_start = false;
        $scope.generateTransition(ETENUM.START_EVALUATION_TRIP,
            $scope.eval_trip.raw.id);
        KVStore.set(EVAL_TRIP_KEY, $scope.eval_trip);
    }

    $scope.endEvalTrip = function() {
        $scope.generateTransition(ETENUM.STOP_EVALUATION_TRIP,
            $scope.eval_trip.raw.id);
        $scope.eval_trip.ongoing_trip = false;
        $scope.eval_trip = {};
        KVStore.set(EVAL_TRIP_KEY, $scope.eval_trip);
    }

    /*
     * BEGIN: persistence code. Everything above this that does not invoke one of these
     * deals only with local state.
     */

    $scope.applyCollectionConfig = function(new_config) {
        return ControlCollectionHelper.getConfig().then(function(curr_config) {
            if (!curr_config.is_duty_cycling && new_config.is_duty_cycling) {
                // we want to be careful here because now that we are duty cycling,
                // we won't push this data until the next trip is complete
                // so let's force sync while we still can
                return $ionicPopup.alert({template: "Moving from always on -> duty cycling, forcing sync"})
                .then(function(result) {
                    if (ionic.Platform.isAndroid()) {
                        return new Promise(function(resolve, reject) {
                            ControlSyncHelper.forceSync();
                            $timeout(resolve(), 5000);
                        });
                    } else {
                        return ControlSyncHelper.forceSync();
                    }
                });
            } else {
                return Promise.resolve();
            }
        }).then(function() {
            return ControlCollectionHelper.setConfig(new_config).then(function() {
                $rootScope.$broadcast('control.update.complete', 'collection config');
            }).catch(function(err) {
                Logger.displayError("Error while setting collection config", err);
            });
        }).catch(function(err) {
            Logger.displayError("Error while forcing sync", err);
        });
    }

    // we need to pass in the trip id as well since we re-use the same function
    // for both calibration and evaluation
    $scope.generateTransition = function(eval_transition_type, trip_id) {
        var data = {
            transition: eval_transition_type,
            trip_id: trip_id, // either calibration or evaluation
            spec_id: $scope.sel_spec.full_spec.id,
            device_manufacturer: $scope.device_info.manufacturer,
            device_model: $scope.device_info.model,
            device_version: $scope.device_info.version,
            ts: moment().unix()
        }
        return $window.cordova.plugins.BEMUserCache.putMessage(EVAL_TRANSITION_KEY, data);
    }

    $scope.readConstants = function() {
        // returns a promise, so it can be used in both reset and restore cases
        /*
         * Populate device information for sending and for display
         */
        $scope.device_info = {
            "manufacturer": device.manufacturer,
            "model": device.model,
            "version": device.version,
        }
        $window.cordova.plugins.BEMDataCollection.getAccuracyOptions().then(function(accuracyOptions) {
            $scope.accuracyOptions = accuracyOptions;
        });
    }

    $scope.readEmail = function() {
        if (!angular.isDefined($scope.curr_phone.email)) {
            ControlHelper.getUserEmail().then(function(response) {
                $scope.$apply(function() {
                    if (response == null) {
                        $scope.curr_phone.email = "Not logged in";
                    } else {
                        $scope.curr_phone.email = response;
                    }
                });
            }).catch(function(error) {
                Logger.displayError("Error while reading current login", error);
            });
        }
    }

    /*
     * All the initialization that is not relevant to the current stored state.
     * This is mainly display stuff since we don't currently persist display state.
     */
    $scope.nonStateInit = function() {
        $scope.author_eval_spec_list = [];

        $scope.mapCtrl = {};
        angular.extend($scope.mapCtrl, { defaults : {} });
        angular.extend($scope.mapCtrl.defaults, Config.getMapTiles())

        $scope.eval_settings_card_display = {};
        $scope.calibration_settings_card_display = {};
        $scope.sensing_settings_card_display = {};
        $scope.trip_settings_card_display = {};

        // Start out with shrunk card
        shrinkEvalCard();
        shrinkCalibrationCard();
        shrinkSensingCard();
        expandTripCard();

        if (angular.isDefined($scope.author_spec_sel_modal)) {
            $scope.author_spec_sel_modal.remove();
        }
        $ionicModal.fromTemplateUrl("templates/eval/author-spec-sel.html", {
            scope: $scope,
            animation: "slide-in-up"
        }).then(function(modal) {
            $scope.author_spec_sel_modal = modal;
        })
    }

    /*
     * Move everything that is run in the main body of the controller into a reset
     * function to make it easier to reset state.
     * since we now load/store state, this is now split up into three main parts:
     * - the constants that always need to be initialized
     * - the version that loads initial state
     * - the version that resets initial state
     */

    $scope.resetAndRefresh = function() {
        $scope.sel_spec = {};
        $scope.curr_phone = {}
        $scope.calibration = {};
        $scope.eval_settings = {};
        $scope.eval_trip = {};

        $scope.nonStateInit();

        /*
         * Reading stuff from native code
         */

        $ionicPlatform.ready().then(function() {
            $scope.readConstants();
            $scope.readEmail();
            KVStore.remove(SEL_SPEC_KEY);
            KVStore.remove(CURR_PHONE_KEY);
            KVStore.remove(CALIBRATION_KEY);
            KVStore.remove(EVAL_SETTINGS_KEY);
            KVStore.remove(EVAL_TRIP_KEY);
        });
    }

    var readOrBlank = function(key, scopevar) {
        return KVStore.get(key).then(function(val) {
            $scope.$apply(function() {
                if (val != null) {
                    $scope[scopevar] = val;
                } else {
                    $scope[scopevar] = {};
                }
            });
        });
    }

    $scope.reloadAndRefresh = function() {
        $scope.nonStateInit();

        /*
         * Reading stuff from native code
         */

        $ionicPlatform.ready().then(function() {
            $scope.readConstants();
            readOrBlank(SEL_SPEC_KEY, "sel_spec");
            readOrBlank(CURR_PHONE_KEY, "curr_phone").then($scope.readEmail);
            readOrBlank(CALIBRATION_KEY, "calibration");
            readOrBlank(EVAL_SETTINGS_KEY, "eval_settings");
            readOrBlank(EVAL_TRIP_KEY, "eval_trip");
        });
    }

    // Initialize on controller creation
    $scope.reloadAndRefresh();

})
