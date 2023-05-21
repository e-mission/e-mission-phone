angular.module('emission.survey.multilabel.services', ['ionic', 'emission.i18n.utils',
    "emission.plugin.logger", "emission.config.dynamic"])
.factory("ConfirmHelper", function($http, $ionicPopup, $ionicPlatform, $translate, i18nUtils, DynamicConfig, Logger) {
    var ch = {};
    ch.init = function(ui_config) {
        Logger.log("About to start initializing the confirm helper for " + ui_config.intro.program_or_study);
        const labelWidth = {"base": "col-50", "intervention": "col-33"};
        const btnWidth = {"base": "115", "intervention": "80"};
        ch.INPUTS = ["MODE", "PURPOSE"];
        ch.inputDetails = {
            "MODE": {
                name: "MODE",
                labeltext: $translate.instant(".mode"),
                choosetext: $translate.instant(".choose-mode"),
                width: labelWidth["base"],
                btnWidth: btnWidth["base"],
                key: "manual/mode_confirm",
                otherVals: {},
            },
            "PURPOSE": {
                name: "PURPOSE",
                labeltext: $translate.instant(".purpose"),
                choosetext: $translate.instant(".choose-purpose"),
                width: labelWidth["base"],
                btnWidth: btnWidth["base"],
                key: "manual/purpose_confirm",
                otherVals: {},
            }
        }
        if (ui_config.intro.program_or_study == 'program') {
            ch.isProgram = true;
            ch.mode_studied = ui_config.intro.mode_studied;
            // store a copy of the base input details
            ch.baseInputDetails = angular.copy(ch.inputDetails);
            ch.BASE_INPUTS = angular.copy(ch.INPUTS);

            // then add the program specific information by adding the REPLACED_MODE
            // and resetting the widths
            ch.INPUTS.push("REPLACED_MODE");
            for (const [key, value] of Object.entries(ch.inputDetails)) {
                value.width = labelWidth["intervention"];
                value.btnWidth = btnWidth["intervention"];
            };
            console.log("Finished resetting label widths ",ch.inputDetails);
            ch.inputDetails["REPLACED_MODE"] = {
                name: "REPLACED_MODE",
                labeltext: $translate.instant(".replaces"),
                choosetext: $translate.instant(".choose-replaced-mode"),
                width: labelWidth["intervention"],
                btnWidth: btnWidth["intervention"],
                key: "manual/replaced_mode",
                otherVals: {}
            }
        }
        Logger.log("Finished initializing ch.INPUTS and ch.inputDetails" + ch.INPUTS);
        ch.inputParamsPromise = new Promise(function(resolve, reject) {
          inputParams = {};
          console.log("Starting promise execution with ", inputParams);
          omPromises = ch.INPUTS.map((item) => ch.getOptionsAndMaps(item));
          console.log("Promise list ", omPromises);
          Promise.all(omPromises).then((omObjList) =>
              ch.INPUTS.forEach(function(item, index) {
                  inputParams[item] = omObjList[index];
              })).catch((err) => {
                    Logger.displayError("Error while loading input params in "+ch.INPUTS, err)
                    reject(err);
              });
              console.log("Read all inputParams, resolving with ", inputParams);
              resolve(inputParams);
        });
        Logger.log("Finished creating inputParamsPromise" + ch.inputParamsPromise);

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
            console.log("About to map option for inputType"+inputType);
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

    $ionicPlatform.ready().then(function() {
        Logger.log("UI_CONFIG: about to call configReady function in trip-confirm-services.js");
        DynamicConfig.configReady().then((newConfig) => {
            Logger.log("UI_CONFIG: about to call ch.init() with the new config");
            ch.init(newConfig);
        }).catch((err) => Logger.displayError("Error while handling config in trip-confirm-services.js", err));
    });


    return ch;
});
