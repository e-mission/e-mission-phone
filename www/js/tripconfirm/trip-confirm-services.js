angular.module('emission.tripconfirm.service', ['ionic', "emission.plugin.logger"])
.factory("ConfirmHelper", function($http, $ionicPopup, Logger) {
    var ch = {};
    ch.otherModes = [];
    ch.otherPurposes = [];

    var fillInOptions = function(confirmConfig) {
        if(confirmConfig.data.length == 0) {
            throw "blank string instead of missing file on dynamically served app";
        }
        ch.modeOptions = confirmConfig.data.modeOptions;
        ch.purposeOptions = confirmConfig.data.purposeOptions;
    }

    var loadAndPopulateOptions = function(filename) {
        return $http.get(filename)
            .then(fillInOptions)
            .catch(function(err) {
                // no prompt here since we have a fallback
                console.log("error "+JSON.stringify(err)+" while reading confirm options, reverting to defaults");
                return $http.get(filename+".sample")
                     .then(fillInOptions)
                     .catch(function(err) {
                        // prompt here since we don't have a fallback
                        Logger.displayError("Error while reading default confirm options", err);
                     });
            });
    }
    
    /*
     * Lazily loads the options and returns the chosen one. Using this option
     * instead of an in-memory data structure so that we can return a promise
     * and not have to worry about when the data is available.
     */
    ch.getModeOptions = function() {
        if (!angular.isDefined(ch.modeOptions)) {
            return loadAndPopulateOptions("json/trip_confirm_options.json")
                .then(function() { return ch.modeOptions; });
        } else {
            return Promise.resolve(ch.modeOptions);
        }
    }

    ch.getPurposeOptions = function() {
        if (!angular.isDefined(ch.purposeOptions)) {
            return loadAndPopulateOptions("json/trip_confirm_options.json")
                .then(function() { return ch.purposeOptions; });
        } else {
            return Promise.resolve(ch.purposeOptions);
        }
    }

    ch.checkOtherOption = function(choice, onTapFn, $scope) {
        if(choice.value == 'other_mode' || choice.value == 'other_purpose') {
          var text = choice.value == 'other_mode' ? "mode" : "purpose";
          $ionicPopup.show({title: "Please fill in the " + text + " not listed.",
            scope: $scope,
            template: '<input type = "text" ng-model = "selected.other.text">',
            buttons: [
                { text: 'Cancel',
                  onTap: function(e) {
                    $scope.selected.mode = '';
                    $scope.selected.purpose = '';
                  }
                }, {
                   text: '<b>Save</b>',
                   type: 'button-positive',
                   onTap: onTapFn($scope, choice)
                }
            ]
          });
        }
    }

    ch.otherTextToValue = function(otherText) {
        return otherText.toLowerCase().replace(" ", "_");
    }

    ch.otherValueToText = function(otherValue) {
        var words = otherValue.replace("_", " ").split(" ");
        if (words.length == 0) {
            return "";
        }
        return words.map(function(word) {
            return word[0].toUpperCase() + word.slice(1);
        }).join(" ");
    }

    ch.getFakeEntry = function(otherValue) {
        return {text: ch.otherValueToText(otherValue),
            value: otherValue};
    }

    // copied over from www/js/diary/services.js
    // for previous blame, please look at that history prior to 2019-05-26
    var fmtTs = function(ts_in_secs, tz) {
        return moment(ts_in_secs * 1000).tz(tz).format();
    }
    
    var printUserInput = function(ui) {
    return fmtTs(ui.data.start_ts, ui.metadata.time_zone) + "("+ui.data.start_ts + ") -> "+
            fmtTs(ui.data.end_ts, ui.metadata.time_zone) + "("+ui.data.end_ts + ")"+
            " " + ui.data.label + " logged at "+ ui.metadata.write_ts;
    }

    ch.isDraft = function(tripgj) {
      if (// tripgj.data.features.length == 3 && // reinstate after the local and remote paths are unified
        angular.isDefined(tripgj.data.features[2].features) &&
        tripgj.data.features[2].features[0].properties.feature_type == "section" &&
        tripgj.data.features[2].features[0].properties.sensed_mode == "MotionTypes.UNPROCESSED") {
          return true;
      } else {
          return false;
      }
    }

    ch.getUserInputForTrip = function(tripgj, userInputList) {
    console.log("Input list = "+userInputList.map(printUserInput));
    var tripProp = tripgj.data.properties;
    var isDraft = ch.isDraft(tripgj);
    var potentialCandidates = userInputList.filter(function(userInput) {
        /*
        console.log("startDelta "+userInput.data.label+
            "= user("+fmtTs(userInput.data.start_ts, userInput.metadata.time_zone)+
            ") - trip("+fmtTs(userInput.data.start_ts, userInput.metadata.time_zone)+") = "+
            (userInput.data.start_ts - tripProp.start_ts)+" should be positive");
        console.log("endDelta = "+userInput.data.label+
            "user("+fmtTs(userInput.data.end_ts, userInput.metadata.time_zone)+
            ") - trip("+fmtTs(tripProp.end_ts, userInput.metadata.time_zone)+") = "+
            (userInput.data.end_ts - tripProp.end_ts)+" should be negative");
        */
        // logic described in
        // https://github.com/e-mission/e-mission-docs/issues/423
        if (isDraft) {
            var logStr = "Draft trip: comparing user = "+fmtTs(userInput.data.start_ts, userInput.metadata.time_zone)
                +" -> "+fmtTs(userInput.data.end_ts, userInput.metadata.time_zone)
                +" trip = "+fmtTs(tripProp.start_ts, userInput.metadata.time_zone)
                +" -> "+fmtTs(tripProp.end_ts, userInput.metadata.time_zone)
                +" checks are ("+(userInput.data.start_ts >= tripProp.start_ts)
                +" || "+(-(userInput.data.start_ts - tripProp.start_ts) <= 5 * 60)
                +") && "+(userInput.data.end_ts <= tripProp.end_ts);
            console.log(logStr);
            // Logger.log(logStr);
            return (userInput.data.start_ts >= tripProp.start_ts
                    || -(userInput.data.start_ts - tripProp.start_ts) <= 5 * 60)
                && userInput.data.end_ts <= tripProp.end_ts;
        } else {
            // we know that the trip is cleaned so we can use the fmt_time
            // but the confirm objects are not necessarily filled out
            var logStr = "Cleaned trip: comparing user = "
                +fmtTs(userInput.data.start_ts, userInput.metadata.time_zone)
                +" -> "+fmtTs(userInput.data.end_ts, userInput.metadata.time_zone)
                +" trip = "+tripProp.start_fmt_time
                +" -> "+tripProp.end_fmt_time
                +" checks are "+(userInput.data.start_ts >= tripProp.start_ts)
                +" && ("+(userInput.data.end_ts <= tripProp.end_ts)
                +" || "+((userInput.data.end_ts - tripProp.end_ts) <= 5 * 60)+")";
            Logger.log(logStr);
            return userInput.data.start_ts >= tripProp.start_ts
                && (userInput.data.end_ts <= tripProp.end_ts ||
                    (userInput.data.end_ts - tripProp.end_ts) <= 5 * 60);
        }
    });
    if (potentialCandidates.length === 0)  {
        Logger.log("In getUserInputForTripStartEnd, no potential candidates, returning []");
        return undefined;
    }

    if (potentialCandidates.length === 1)  {
        Logger.log("In getUserInputForTripStartEnd, one potential candidate, returning  "+ printUserInput(potentialCandidates[0]));
        return potentialCandidates[0];
    }

    Logger.log("potentialCandidates are "+potentialCandidates.map(printUserInput));
    var sortedPC = potentialCandidates.sort(function(pc1, pc2) {
        return pc2.metadata.write_ts - pc1.metadata.write_ts;
    });
    var mostRecentEntry = sortedPC[0];
    Logger.log("Returning mostRecentEntry "+printUserInput(mostRecentEntry));
    return mostRecentEntry;
    };

    return ch;
});
