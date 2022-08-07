angular.module('emission.tripconfirm.services', ['ionic', 'emission.i18n.utils', "emission.plugin.logger"])
.factory("ConfirmHelper", function($http, $ionicPopup, $translate, i18nUtils, Logger) {
    var ch = {};
    ch.INPUTS = ["MODE", "PURPOSE"]
    ch.inputDetails = {
        "MODE": {
            labeltext: $translate.instant(".mode"),
            choosetext: $translate.instant(".choose-mode"),
            width: "col-50",
            key: "manual/mode_confirm",
            otherVals: {},
        },
        "PURPOSE": {
            labeltext: $translate.instant(".purpose"),
            choosetext: $translate.instant(".choose-purpose"),
            width: "col-50",
            key: "manual/purpose_confirm",
            otherVals: {},
        }
    }

    var fillInOptions = function(confirmConfig) {
        if(confirmConfig.data.length == 0) {
            throw "blank string instead of missing file on dynamically served app";
        }
        ch.INPUTS.forEach(function(i) {
            ch.inputDetails[i].options = confirmConfig.data[i]
        });
    }

    /*
     * Convert the array of {text, value} objects to a {value: text} map so that 
     * we can look up quickly without iterating over the list for each trip
     */

    var arrayToMap = function(optionsArray) {
        var text2entryMap = {};
        var value2entryMap = {};

        optionsArray.forEach(function(text2val) {
            text2entryMap[text2val.text] = text2val;
            value2entryMap[text2val.value] = text2val;
        });
        return [text2entryMap, value2entryMap];
    }

    var loadAndPopulateOptions = function () {
        return i18nUtils.geti18nFileName("json/", "trip_confirm_options", ".json")
            .then((optionFileName) => {
                console.log("Final option file = "+optionFileName);
                return $http.get(optionFileName)
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
            });
    }

    ch.getOptionsAndMaps = function(inputType) {
        return ch.getOptions(inputType).then(function(inputOptions) {
            var inputMaps = arrayToMap(inputOptions);
            return {
                options: inputOptions,
                text2entry: inputMaps[0],
                value2entry: inputMaps[1]
            };
        });
    };
    
    /*
     * Lazily loads the options and returns the chosen one. Using this option
     * instead of an in-memory data structure so that we can return a promise
     * and not have to worry about when the data is available.
     */
    ch.getOptions = function(inputType) {
        if (!angular.isDefined(ch.inputDetails[inputType].options)) {
            var lang = $translate.use();
            return loadAndPopulateOptions()
                .then(function () { 
                    return ch.inputDetails[inputType].options;
                });
        } else {
            return Promise.resolve(ch.inputDetails[inputType].options);
        }
    }

    ch.checkOtherOption = function(inputType, onTapFn, $scope) {
          $ionicPopup.show({title: $translate.instant("trip-confirm.services-please-fill-in",{text: inputType.toLowerCase()}),
            scope: $scope,
            template: '<input type = "text" ng-model = "selected.other.text">',
            buttons: [
                { text: $translate.instant('trip-confirm.services-cancel'),
                  onTap: function(e) {
                    ch.INPUTS.forEach(function(item) {
                        $scope.selected[item] = {value: ''};
                    });
                  }
                }, {
                   text: '<b>' + $translate.instant('trip-confirm.services-save') + '</b>',
                   type: 'button-positive',
                   onTap: onTapFn($scope, inputType)
                }
            ]
          });
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
});
