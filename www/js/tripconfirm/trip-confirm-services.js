angular.module('emission.tripconfirm.services', ['ionic', "emission.plugin.logger"])
.factory("ConfirmHelper", function($http, $ionicPopup, Logger) {
    var ch = {};
    ch.otherDestinations = [];
    ch.otherPurposes = [];

    var fillInOptions = function(confirmConfig) {
        if(confirmConfig.data.length == 0) {
            throw "blank string instead of missing file on dynamically served app";
        }
        ch.destinationOptions = confirmConfig.data.destinationOptions;
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
    ch.getDestinationOptions = function() {
        if (!angular.isDefined(ch.destinationOptions)) {
            return loadAndPopulateOptions("json/trip_confirm_options.json")
                .then(function() { return ch.destinationOptions; });
        } else {
            return Promise.resolve(ch.destinationOptions);
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
        if(choice.value == 'other_destination' || choice.value == 'other_purpose') {
          var text = choice.value == 'other_destination' ? "destination" : "purpose";
          $ionicPopup.show({title: "Please fill in the " + text + " not listed.",
            scope: $scope,
            template: '<input type = "text" ng-model = "selected.other.text">',
            buttons: [
                { text: 'Cancel',
                  onTap: function(e) {
                    $scope.selected.destination = '';
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

    return ch;
})
