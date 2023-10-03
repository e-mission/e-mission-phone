import angular from 'angular';
import { getLabelOptions } from './survey/multilabel/confirmHelper';
import { getConfig } from './config/dynamicConfig';

angular.module('emission.main.metrics.mappings', ['emission.plugin.logger',
                                     'emission.plugin.kvstore'])

.service('CarbonDatasetHelper', function(KVStore) {
  var CARBON_DATASET_KEY = 'carbon_dataset_locale';

  // Values are in Kg/PKm (kilograms per passenger-kilometer)
  // Sources for EU values:
  //  - Tremod: 2017, CO2, CH4 and N2O in CO2-equivalent
  //  - HBEFA: 2020, CO2 (per country)
  // German data uses Tremod. Other EU countries (and Switzerland) use HBEFA for car and bus,
  // and Tremod for train and air (because HBEFA doesn't provide these).
  // EU data is an average of the Tremod/HBEFA data for the countries listed;
  // for this average the HBEFA data was used also in the German set (for car and bus).
  var carbonDatasets = {
    US: {
      regionName: "United States",
      footprintData: {
        WALKING:      0,
        BICYCLING:    0,
        CAR:        267/1609,
        BUS:        278/1609,
        LIGHT_RAIL: 120/1609,
        SUBWAY:      74/1609,
        TRAM:        90/1609,
        TRAIN:       92/1609,
        AIR_OR_HSR: 217/1609
      }
    },
    EU: {                   // Plain average of values for the countries below (using HBEFA for car and bus, Tremod for others)
      regionName: "European Union",
      footprintData: {
        WALKING:     0,
        BICYCLING:   0,
        CAR:         0.14515,
        BUS:         0.04751,
        LIGHT_RAIL:  0.064,
        SUBWAY:      0.064,
        TRAM:        0.064,
        TRAIN:       0.048,
        AIR_OR_HSR:  0.201
      }
    },
    DE: {
      regionName: "Germany",
      footprintData: {
        WALKING:     0,
        BICYCLING:   0,
        CAR:         0.139,   // Tremod (passenger car)
        BUS:         0.0535,  // Tremod (average city/coach)
        LIGHT_RAIL:  0.064,   // Tremod (DE tram, urban rail and subway)
        SUBWAY:      0.064,   // Tremod (DE tram, urban rail and subway)
        TRAM:        0.064,   // Tremod (DE tram, urban rail and subway)
        TRAIN:       0.048,   // Tremod (DE average short/long distance)
        AIR_OR_HSR:  0.201    // Tremod (DE airplane)
      }
    },
    FR: {
      regionName: "France",
      footprintData: {
        WALKING:     0,
        BICYCLING:   0,
        CAR:         0.13125, // HBEFA (passenger car, considering 1 passenger)
        BUS:         0.04838, // HBEFA (average short/long distance, considering 16/25 passengers)
        LIGHT_RAIL:  0.064,   // Tremod (DE tram, urban rail and subway)
        SUBWAY:      0.064,   // Tremod (DE tram, urban rail and subway)
        TRAM:        0.064,   // Tremod (DE tram, urban rail and subway)
        TRAIN:       0.048,   // Tremod (DE average short/long distance)
        AIR_OR_HSR:  0.201    // Tremod (DE airplane)
      }
    },
    AT: {
      regionName: "Austria",
      footprintData: {
        WALKING:     0,
        BICYCLING:   0,
        CAR:         0.14351, // HBEFA (passenger car, considering 1 passenger)
        BUS:         0.04625, // HBEFA (average short/long distance, considering 16/25 passengers)
        LIGHT_RAIL:  0.064,   // Tremod (DE tram, urban rail and subway)
        SUBWAY:      0.064,   // Tremod (DE tram, urban rail and subway)
        TRAM:        0.064,   // Tremod (DE tram, urban rail and subway)
        TRAIN:       0.048,   // Tremod (DE average short/long distance)
        AIR_OR_HSR:  0.201    // Tremod (DE airplane)
      }
    },
    SE: {
      regionName: "Sweden",
      footprintData: {
        WALKING:     0,
        BICYCLING:   0,
        CAR:         0.13458, // HBEFA (passenger car, considering 1 passenger)
        BUS:         0.04557, // HBEFA (average short/long distance, considering 16/25 passengers)
        LIGHT_RAIL:  0.064,   // Tremod (DE tram, urban rail and subway)
        SUBWAY:      0.064,   // Tremod (DE tram, urban rail and subway)
        TRAM:        0.064,   // Tremod (DE tram, urban rail and subway)
        TRAIN:       0.048,   // Tremod (DE average short/long distance)
        AIR_OR_HSR:  0.201    // Tremod (DE airplane)
      }
    },
    NO: {
      regionName: "Norway",
      footprintData: {
        WALKING:     0,
        BICYCLING:   0,
        CAR:         0.13265, // HBEFA (passenger car, considering 1 passenger)
        BUS:         0.04185, // HBEFA (average short/long distance, considering 16/25 passengers)
        LIGHT_RAIL:  0.064,   // Tremod (DE tram, urban rail and subway)
        SUBWAY:      0.064,   // Tremod (DE tram, urban rail and subway)
        TRAM:        0.064,   // Tremod (DE tram, urban rail and subway)
        TRAIN:       0.048,   // Tremod (DE average short/long distance)
        AIR_OR_HSR:  0.201    // Tremod (DE airplane)
      }
    },
    CH: {
      regionName: "Switzerland",
      footprintData: {
        WALKING:     0,
        BICYCLING:   0,
        CAR:         0.17638, // HBEFA (passenger car, considering 1 passenger)
        BUS:         0.04866, // HBEFA (average short/long distance, considering 16/25 passengers)
        LIGHT_RAIL:  0.064,   // Tremod (DE tram, urban rail and subway)
        SUBWAY:      0.064,   // Tremod (DE tram, urban rail and subway)
        TRAM:        0.064,   // Tremod (DE tram, urban rail and subway)
        TRAIN:       0.048,   // Tremod (DE average short/long distance)
        AIR_OR_HSR:  0.201    // Tremod (DE airplane)
      }
    }
  };

  var defaultCarbonDatasetCode = 'US';
  var currentCarbonDatasetCode = defaultCarbonDatasetCode;

  // we need to call the method from within a promise in initialize()
  // and using this.setCurrentCarbonDatasetLocale doesn't seem to work
  var setCurrentCarbonDatasetLocale = function(localeCode) {
    for (var code in carbonDatasets) {
      if (code == localeCode) {
        currentCarbonDatasetCode = localeCode;
        break;
      }
    }
  }

  this.loadCarbonDatasetLocale = function() {
    return KVStore.get(CARBON_DATASET_KEY).then(function(localeCode) {
      Logger.log("CarbonDatasetHelper.loadCarbonDatasetLocale() obtained value from storage [" + localeCode + "]");
      if (!localeCode) {
        localeCode = defaultCarbonDatasetCode;
        Logger.log("CarbonDatasetHelper.loadCarbonDatasetLocale() no value in storage, using [" + localeCode + "] instead");
      }
      setCurrentCarbonDatasetLocale(localeCode);
    });
  }

  this.saveCurrentCarbonDatasetLocale = function (localeCode) {
    setCurrentCarbonDatasetLocale(localeCode);
    KVStore.set(CARBON_DATASET_KEY, currentCarbonDatasetCode);
    Logger.log("CarbonDatasetHelper.saveCurrentCarbonDatasetLocale() saved value [" + currentCarbonDatasetCode + "] to storage");
  }

  this.getCarbonDatasetOptions = function() {
    var options = [];
    for (var code in carbonDatasets) {
      options.push({
        text: code, //carbonDatasets[code].regionName,
        value: code
      });
    }
    return options;
  };

  this.getCurrentCarbonDatasetCode = function () {
    return currentCarbonDatasetCode;
  };

  this.getCurrentCarbonDatasetFootprint = function () {
    return carbonDatasets[currentCarbonDatasetCode].footprintData;
  };
})
.service('METDatasetHelper', function(KVStore) {
  var standardMETs = {
    "WALKING": {
      "VERY_SLOW": {
        range: [0, 2.0],
        mets: 2.0
      },
      "SLOW": {
        range: [2.0, 2.5],
        mets: 2.8
      },
      "MODERATE_0": {
        range: [2.5, 2.8],
        mets: 3.0
      },
      "MODERATE_1": {
        range: [2.8, 3.2],
        mets: 3.5
      },
      "FAST": {
        range: [3.2, 3.5],
        mets: 4.3
      },
      "VERY_FAST_0": {
        range: [3.5, 4.0],
        mets: 5.0
      },
      "VERY_FAST_!": {
        range: [4.0, 4.5],
        mets: 6.0
      },
      "VERY_VERY_FAST": {
        range: [4.5, 5],
        mets: 7.0
      },
      "SUPER_FAST": {
        range: [5, 6],
        mets: 8.3
      },
      "RUNNING": {
        range: [6, Number.MAX_VALUE],
        mets: 9.8
      }
    },
    "BICYCLING": {
      "VERY_VERY_SLOW": {
        range: [0, 5.5],
        mets: 3.5
      },
      "VERY_SLOW": {
        range: [5.5, 10],
        mets: 5.8
      },
      "SLOW": {
        range: [10, 12],
        mets: 6.8
      },
      "MODERATE": {
        range: [12, 14],
        mets: 8.0
      },
      "FAST": {
        range: [14, 16],
        mets: 10.0
      },
      "VERT_FAST": {
        range: [16, 19],
        mets: 12.0
      },
      "RACING": {
        range: [20, Number.MAX_VALUE],
        mets: 15.8
      }
    },
    "UNKNOWN": {
      "ALL": {
        range: [0, Number.MAX_VALUE],
        mets: 0
      }
    },
    "IN_VEHICLE": {
      "ALL": {
        range: [0, Number.MAX_VALUE],
        mets: 0
      }
    },
    "CAR": {
      "ALL": {
        range: [0, Number.MAX_VALUE],
        mets: 0
      }
    },
    "BUS": {
      "ALL": {
        range: [0, Number.MAX_VALUE],
        mets: 0
      }
    },
    "LIGHT_RAIL": {
      "ALL": {
        range: [0, Number.MAX_VALUE],
        mets: 0
      }
    },
    "TRAIN": {
      "ALL": {
        range: [0, Number.MAX_VALUE],
        mets: 0
      }
    },
    "TRAM": {
      "ALL": {
        range: [0, Number.MAX_VALUE],
        mets: 0
      }
    },
    "SUBWAY": {
      "ALL": {
        range: [0, Number.MAX_VALUE],
        mets: 0
      }
    },
    "AIR_OR_HSR": {
      "ALL": {
        range: [0, Number.MAX_VALUE],
        mets: 0
      }
    }
  }
  this.getStandardMETs = function() {
    return standardMETs;
  }
})
.factory('CustomDatasetHelper', function(METDatasetHelper, Logger, $ionicPlatform) {
    var cdh = {};

    cdh.getCustomMETs = function() {
        console.log("Getting custom METs", cdh.customMETs);
        return cdh.customMETs;
    };

    cdh.getCustomFootprint = function() {
        console.log("Getting custom footprint", cdh.customPerKmFootprint);
        return cdh.customPerKmFootprint;
    };

    cdh.populateCustomMETs = function() {
        let standardMETs = METDatasetHelper.getStandardMETs();
        let modeOptions = cdh.inputParams["MODE"];
        let modeMETEntries = modeOptions.map((opt) => {
            if (opt.met_equivalent) {
                let currMET = standardMETs[opt.met_equivalent];
                return [opt.value, currMET];
            } else {
                if (opt.met) {
                    let currMET = opt.met;
                    // if the user specifies a custom MET, they can't specify
                    // Number.MAX_VALUE since it is not valid JSON
                    // we assume that they specify -1 instead, and we will
                    // map -1 to Number.MAX_VALUE here by iterating over all the ranges
                    for (const rangeName in currMET) {
                        // console.log("Handling range ", rangeName);
                        currMET[rangeName].range = currMET[rangeName].range.map((i) => i == -1? Number.MAX_VALUE : i);
                    }
                    return [opt.value, currMET];
                } else {
                    console.warn("Did not find either met_equivalent or met for "
                        +opt.value+" ignoring entry");
                    return undefined;
                }
            }
        });
        cdh.customMETs = Object.fromEntries(modeMETEntries.filter((e) => angular.isDefined(e)));
        console.log("After populating, custom METs = ", cdh.customMETs);
    };

    cdh.populateCustomFootprints = function() {
        let modeOptions = cdh.inputParams["MODE"];
        let modeCO2PerKm = modeOptions.map((opt) => {
            if (opt.range_limit_km) {
                if (cdh.range_limited_motorized) {
                    Logger.displayError("Found two range limited motorized options", {
                        first: cdh.range_limited_motorized, second: opt});
                }
                cdh.range_limited_motorized = opt;
                console.log("Found range limited motorized mode", cdh.range_limited_motorized);
            }
            if (angular.isDefined(opt.kgCo2PerKm)) {
                return [opt.value, opt.kgCo2PerKm];
            } else {
                return undefined;
            }
        }).filter((modeCO2) => angular.isDefined(modeCO2));;
        cdh.customPerKmFootprint = Object.fromEntries(modeCO2PerKm);
        console.log("After populating, custom perKmFootprint", cdh.customPerKmFootprint);
    }

    cdh.init = function(newConfig) {
      try {
        getLabelOptions(newConfig).then((inputParams) => {
          console.log("Input params = ", inputParams);
          cdh.inputParams = inputParams;
          cdh.populateCustomMETs();
          cdh.populateCustomFootprints();
        });
      } catch (e) {
        setTimeout(() => {
          Logger.displayError("Error in metrics-mappings while initializing custom dataset helper", e);
        }, 1000);
      }
    }

    $ionicPlatform.ready().then(function() {
      getConfig().then((newConfig) => cdh.init(newConfig));
    });

    return cdh;
});
