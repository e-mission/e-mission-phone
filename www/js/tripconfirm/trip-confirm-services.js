angular.module('emission.tripconfirm.services', ['ionic', "emission.plugin.logger"])
.factory("ConfirmHelper", function($http, $ionicPopup, $translate, Logger) {
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

    var loadAndPopulateOptions = function (lang) {
        if (lang != "en") {
            return $http.get("i18n/trip_confirm_options-" + lang + ".json")
            .then(fillInOptions)
            .catch(function (err) {
                console.log("error "+JSON.stringify(err)+" while reading confirm options in your language, reverting to english options");
                return loadAndPopulateOptions("en");
            });
        }

        return $http.get("json/trip_confirm_options.json")
        .then(fillInOptions)
        .catch(function(err) {
           // no prompt here since we have a fallback
           console.log("error "+JSON.stringify(err)+" while reading confirm options, reverting to defaults");
           return $http.get("json/trip_confirm_options.json.sample")
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
            var lang = $translate.use();
            return loadAndPopulateOptions(lang)
                .then(function () { return ch.modeOptions; });
        } else {
            return Promise.resolve(ch.modeOptions);
        }
    }

    ch.getPurposeOptions = function() {
        if (!angular.isDefined(ch.purposeOptions)) {
            var lang = $translate.use();
            return loadAndPopulateOptions(lang)
                .then(function () { return ch.purposeOptions; });
        } else {
            return Promise.resolve(ch.purposeOptions);
        }
    }

    ch.checkOtherOption = function(choice, onTapFn, $scope) {
        if(choice.value == 'other_mode' || choice.value == 'other_purpose') {
          var text = choice.value == 'other_mode' ? "mode" : "purpose";
          $ionicPopup.show({title: $translate.instant("trip-confirm.services-please-fill-in",{text: text}),
            scope: $scope,
            template: '<input type = "text" ng-model = "selected.other.text">',
            buttons: [
                { text: $translate.instant('trip-confirm.services-cancel'),
                  onTap: function(e) {
                    $scope.selected.mode = '';
                    $scope.selected.purpose = '';
                  }
                }, {
                   text: '<b>' + $translate.instant('trip-confirm.services-save') + '</b>',
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
