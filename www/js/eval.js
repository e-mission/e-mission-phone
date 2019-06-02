'use strict';

angular.module('emission.main.eval',['emission.plugin.logger', "emission.services"])

.controller('EvalCtrl', function($window, $scope, $ionicPlatform, $ionicModal,
                                 $ionicActionSheet, $http, ControlHelper, Logger) {

    $scope.sel_author_spec = {};
    $scope.curr_regime = {};
    $scope.curr_regime.calibration = {};
    $scope.curr_regime.evaluation = {};
    $scope.curr_regime.settings = {};

    var MILLISECONDS = Math.pow(10, 6)

    var ACCURACY_CONTROL_SETTINGS = {
        is_duty_cycling: false,
        accuracy: ["PRIORITY_HIGH_ACCURACY","kCLLocationAccuracyBest"],
        filter: 1,
    }

    var POWER_CONTROL_SETTINGS = {
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

    /*
     * START: Control the UX of the summary card
     */
    $scope.eval_settings_card_display = {};

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

    // Start out with shrunk card
    shrinkEvalCard();

    /*
     * END: Control the UX of the summary card
     */

    /*
     * Reading stuff from native code
     */

    $ionicPlatform.ready().then(function() {
        /*
         * Populate device information for sending and for display
         */
        $scope.device_info = {
            "manufacturer": device.manufacturer,
            "model": device.model,
            "version": device.version,
        }
        ControlHelper.getUserEmail().then(function(response) {
            $scope.$apply(function() {
                if (response == null) {
                    $scope.curr_regime.email = "Not logged in";
                } else {
                    $scope.curr_regime.email = response;
                }
            });
        }).catch(function(error) {
            Logger.displayError("Error while reading current login", error);
        });
        $window.cordova.plugins.BEMDataCollection.getAccuracyOptions().then(function(accuracyOptions) {
            $scope.accuracyOptions = accuracyOptions;
        });
    });

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
              "user": $scope.sel_author_spec.author_email
            };
            console.log("About to return message "+JSON.stringify(message));
            console.log("getRawEntries: about to get pushGetJSON for the timestamp");
            return $http.post(url+"/datastreams/find_entries/timestamp", message);
        })
    }

    $ionicModal.fromTemplateUrl("templates/eval/author-spec-sel.html", {
        scope: $scope,
        animation: "slide-in-up"
    }).then(function(modal) {
        $scope.author_spec_sel_modal = modal;
    })

    $scope.getExperimentsForAuthor = function() {
        // $scope.sel_author_spec.author_email = "shankari@eecs.berkeley.edu"
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
     * BEGIN: code to map labels to configuration settings
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
        console.log("Selected spec is "+JSON.stringify($scope.sel_author_spec));
        var phone_map = $scope.sel_author_spec.sel_spec.phones[ionic.Platform.platform()];
        $scope.curr_regime.profile = phone_map[$scope.curr_regime.email]
        $scope.curr_regime.registered = angular.isDefined($scope.curr_regime.profile);
        if (!$scope.curr_regime.registered) {
            $scope.curr_regime.profile = "unregistered";
            $scope.profile_item_style = {color: "red"};
        }
        if ($scope.curr_regime.profile == "accuracy_control") {
            $scope.curr_regime.isAccuracyControl = true;
            $scope.curr_regime.evaluation.sensing_settings = 
                expandForPlatform(ACCURACY_CONTROL_SETTINGS);
            $scope.curr_regime.evaluation.sensing_settings.label =
                "accuracy_control (fixed)";
        }
        if ($scope.curr_regime.profile == "power_control") {
            $scope.curr_regime.isPowerControl = true;
            $scope.curr_regime.evaluation.sensing_settings =
                expandForPlatform(POWER_CONTROL_SETTINGS);
            $scope.curr_regime.evaluation.sensing_settings.label = 
                "power_control (fixed)";
        }
        $scope.author_spec_sel_modal.hide()
    };

    var find_config = function(sensing_setting, profile) {
        // profile = "evaluation_a"
        var profile_parts = profile.split("_");
        // profile_parts = ["evaluation", "a"]
        if (profile_parts[0] == "evaluation") {
            // profile_parts[1] = "a"
            // config_label = config_a
            var config_label = "sensing_config_"+profile_parts[1]
            return sensing_setting[config_label]
        }
    }

    $scope.selectSensingSettings = function() {
        var evaluationButtons = $scope.sel_author_spec.sel_spec.sensing_settings.map(
            function(ss) {
                return {text: ss.label,
                    sensing_config: find_config(ss, $scope.curr_regime.profile)};
            });
        $ionicActionSheet.show({
            titleText: "Select sensing settings",
            cancelText: "Cancel",
            buttons: evaluationButtons,
            buttonClicked: function(index, button) {
                $scope.curr_regime.evaluation.sensing_settings = 
                    expandForPlatform(button.sensing_config);
                $scope.curr_regime.evaluation.sensing_settings.label = button.text;
                return true;
            }
        });
    }

    /*
     * END: code to map labels to configuration settings
     */

    /*
     * Select trips for calibration/evaluation.
     * We will use an actionsheet because the select on iOS moves the app up again
     */

    $scope.selectCalibrationTrip = function() {
        var calibrationButtons = $scope.sel_author_spec.sel_spec.calibration_trips.map(
            function(ct) {
                return {text: ct.label};
            });
        $ionicActionSheet.show({
            titleText: "Select calibration to perform",
            cancelText: "Cancel",
            buttons: calibrationButtons,
            buttonClicked: function(index, button) {
                $scope.curr_regime.calibration.curr_trip = button.text;
                return true;
            }
        });
    }


    /*
     * START: Control the UX of the summary card
     */
    $scope.sensing_settings_card_display = {};

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

    // Start out with shrunk card
    shrinkSensingCard();

    /*
     * END: Control the UX of the summary card
     */


    $scope.selectEvaluationTrip = function() {
        var evaluationButtons = $scope.sel_author_spec.sel_spec.evaluation_trips.map(
            function(ct) {
                return {text: ct.label};
            });
        $ionicActionSheet.show({
            titleText: "Select evaluation to perform",
            cancelText: "Cancel",
            buttons: evaluationButtons,
            buttonClicked: function(index, button) {
                $scope.curr_regime.evaluation.curr_trip = button.text;
                return true;
            }
        });
    }

})
