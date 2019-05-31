'use strict';

angular.module('emission.main.eval',['emission.plugin.logger', "emission.services"])

.controller('EvalCtrl', function($scope, $ionicPlatform, $ionicModal,
                                 $ionicActionSheet, $http, ControlHelper, Logger) {

    /*
     * START: Control the UX of the summary card
     */
    $scope.eval_settings_card_display = {};
    $scope.sel_author_spec = {};
    $scope.curr_regime = {};
    $scope.curr_regime.calibration = {};
    $scope.curr_regime.evaluation = {};
    $scope.curr_regime.settings = {};

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

    $scope.saveSelectedEval = function() {
        console.log("Selected spec is "+JSON.stringify($scope.sel_author_spec));
        $scope.curr_regime.profile = $scope.sel_author_spec.sel_spec.phones[$scope.curr_regime.email]
        $scope.curr_regime.registered = angular.isDefined($scope.curr_regime.profile);
        if (!$scope.curr_regime.registered) {
            $scope.curr_regime.profile = "unregistered";
            $scope.profile_item_style = {color: "red"};
        }
        if ($scope.curr_regime.profile == "accuracy_control") {
            $scope.curr_regime.isAccuracyControl = true;
        }
        $scope.author_spec_sel_modal.hide()
        /*
        var sel_spec = $scope.author_eval_spec_list.find(function(es) {
            return es.name == $scope.sel_author_spec.sel_spec_name;
        
        });
        $scope.sel_author_spec.sel_spec = sel_spec;
        console.log("After searching, selected spec object = "+
            JSON.stringify(sel_spec));
        */
    };

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

    $scope.selectSensingSettings = function() {
        var evaluationButtons = $scope.sel_author_spec.sel_spec.sensing_settings.map(
            function(ct) {
                return {text: ct.label, sensing_config: ct.sensing_config_a};
            });
        $ionicActionSheet.show({
            titleText: "Select sensing settings",
            cancelText: "Cancel",
            buttons: evaluationButtons,
            buttonClicked: function(index, button) {
                $scope.curr_regime.evaluation.sensing_settings = button.sensing_config;
                $scope.curr_regime.evaluation.sensing_settings.label = button.text;
                return true;
            }
        });
    }
})
