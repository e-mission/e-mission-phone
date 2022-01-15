'use strict';

angular.module('emission.main.metrics.factory',
        ['emission.main.metrics.mappings',
        'emission.plugin.kvstore'])

.factory('FootprintHelper', function(CarbonDatasetHelper, CustomDatasetHelper) {
  var fh = {};
  var highestFootprint = 0;

  var mtokm = function(v) {
    return v / 1000;
  }
  fh.useCustom = false;

  fh.setUseCustomFootprint = function () {
    fh.useCustom = true;
  }

  fh.getFootprint = function() {
    if (this.useCustom == true) {
        return CustomDatasetHelper.getCustomFootprint();
    } else {
        return CarbonDatasetHelper.getCurrentCarbonDatasetFootprint();
    }
  }

  fh.readableFormat = function(v) {
    return v > 999? Math.round(v / 1000) + 'k kg CO₂' : Math.round(v) + ' kg CO₂';
  }
  fh.getFootprintForMetrics = function(userMetrics, defaultIfMissing=0) {
    var footprint = fh.getFootprint();
    var result = 0;
    for (var i in userMetrics) {
      var mode = userMetrics[i].key;
      if (mode == 'ON_FOOT') {
        mode = 'WALKING';
      }
      if (mode in footprint) {
        result += footprint[mode] * mtokm(userMetrics[i].values);
      }
      else if (mode == 'IN_VEHICLE') {
        result += ((footprint['CAR'] + footprint['BUS'] + footprint["LIGHT_RAIL"] + footprint['TRAIN'] + footprint['TRAM'] + footprint['SUBWAY']) / 6) * mtokm(userMetrics[i].values);
      }
      else {
        console.warn('WARNING FootprintHelper.getFootprintFromMetrics() was requested for an unknown mode: ' + mode + " metrics JSON: " + JSON.stringify(userMetrics));
        result += defaultIfMissing * mtokm(userMetrics[i].values);
      }
    }
    return result;
  }
  fh.getLowestFootprintForDistance = function(distance) {
    var footprint = fh.getFootprint();
    var lowestFootprint = Number.MAX_SAFE_INTEGER;
    for (var mode in footprint) {
      if (mode == 'WALKING' || mode == 'BICYCLING') {
        // these modes aren't considered when determining the lowest carbon footprint
      }
      else {
        lowestFootprint = Math.min(lowestFootprint, footprint[mode]);
      }
    }
    return lowestFootprint * mtokm(distance);
  }

  fh.getHighestFootprint = function() {
    if (!highestFootprint) {
        var footprint = fh.getFootprint();
        let footprintList = [];
        for (var mode in footprint) {
            footprintList.push(footprint[mode]);
        }
        highestFootprint = Math.max(...footprintList);
    }
    return highestFootprint;
  }

  fh.getHighestFootprintForDistance = function(distance) {
    return fh.getHighestFootprint() * mtokm(distance);
  }

  var getLowestMotorizedNonAirFootprint = function(footprint, rlmCO2) {
    var lowestFootprint = Number.MAX_SAFE_INTEGER;
    for (var mode in footprint) {
      if (mode == 'AIR_OR_HSR' || mode == 'air') {
        console.log("Air mode, ignoring");
      }
      else {
        if (footprint[mode] == 0 || footprint[mode] <= rlmCO2) {
            console.log("Non motorized mode or footprint <= range_limited_motorized", mode, footprint[mode], rlmCO2);
        } else {
            lowestFootprint = Math.min(lowestFootprint, footprint[mode]);
        }
      }
    }
    return lowestFootprint;
  }

  fh.getOptimalDistanceRanges = function() {
    const FIVE_KM = 5 * 1000;
    const SIX_HUNDRED_KM = 600 * 1000;
    if (!fh.useCustom) {
        const defaultFootprint = CarbonDatasetHelper.getCurrentCarbonDatasetFootprint();
        const lowestMotorizedNonAir = getLowestMotorizedNonAirFootprint(defaultFootprint);
        const airFootprint = defaultFootprint["AIR_OR_HSR"];
        return [
            {low: 0, high: FIVE_KM, optimal: 0},
            {low: FIVE_KM, high: SIX_HUNDRED_KM, optimal: lowestMotorizedNonAir},
            {low: SIX_HUNDRED_KM, high: Number.MAX_VALUE, optimal: airFootprint}];
    } else {
        // custom footprint, let's get the custom values
        const customFootprint = CustomDatasetHelper.getCustomFootprint();
        let airFootprint = customFootprint["air"]
        if (!airFootprint) {
            // 2341 BTU/PMT from
            // https://tedb.ornl.gov/wp-content/uploads/2021/02/TEDB_Ed_39.pdf#page=68
            // 159.25 lb per million BTU from EIA
            // https://www.eia.gov/environment/emissions/co2_vol_mass.php
            // (2341 * (159.25/1000000))/(1.6*2.2) = 0.09975, rounded up a bit
            console.log("No entry for air in ", customFootprint," using default");
            airFootprint = 0.1;
        }
        const rlm = CustomDatasetHelper.range_limited_motorized;
        if (!rlm) {
            return [
                {low: 0, high: FIVE_KM, optimal: 0},
                {low: FIVE_KM, high: SIX_HUNDRED_KM, optimal: lowestMotorizedNonAir},
                {low: SIX_HUNDRED_KM, high: Number.MAX_VALUE, optimal: airFootprint}];
        } else {
            console.log("Found range_limited_motorized mode", rlm);
            const lowestMotorizedNonAir = getLowestMotorizedNonAirFootprint(customFootprint, rlm.co2PerMeter);
            return [
                {low: 0, high: FIVE_KM, optimal: 0},
                {low: FIVE_KM, high: rlm.range_limit_km * 1000, optimal: rlm.co2PerMeter},
                {low: rlm.range_limit_km * 1000, high: SIX_HUNDRED_KM, optimal: lowestMotorizedNonAir},
                {low: SIX_HUNDRED_KM, high: Number.MAX_VALUE, optimal: airFootprint}];
        }
    }
  }

  return fh;
})

.factory('CalorieCal', function(KVStore, METDatasetHelper, CustomDatasetHelper) {

  var cc = {};
  var highestMET = 0;
  var USER_DATA_KEY = "user-data";
  cc.useCustom = false;

  cc.setUseCustomFootprint = function () {
    cc.useCustom = true;
  }

  cc.getMETs = function() {
    if (this.useCustom == true) {
        return CustomDatasetHelper.getCustomMETs();
    } else {
        return METDatasetHelper.getStandardMETs();
    }
  }

  cc.set = function(info) {
    return KVStore.set(USER_DATA_KEY, info);
  };
  cc.get = function() {
    return KVStore.get(USER_DATA_KEY);
  };
  cc.delete = function() {
    return KVStore.remove(USER_DATA_KEY);
  };
  Number.prototype.between = function (min, max) {
    return this >= min && this <= max;
  };
  cc.getHighestMET = function() {
    if (!highestMET) {
        var met = cc.getMETs();
        let metList = [];
        for (var mode in met) {
            var rangeList = met[mode];
            for (var range in rangeList) {
                metList.push(rangeList[range].mets);
            }
        }
        highestMET = Math.max(...metList);
    }
    return highestMET;
  }
  cc.getMet = function(mode, speed, defaultIfMissing) {
    if (mode == 'ON_FOOT') {
      console.log("CalorieCal.getMet() converted 'ON_FOOT' to 'WALKING'");
      mode = 'WALKING';
    }
    let currentMETs = cc.getMETs();
    if (!currentMETs[mode]) {
      console.warn("CalorieCal.getMet() Illegal mode: " + mode);
      return defaultIfMissing; //So the calorie sum does not break with wrong return type
    }
    for (var i in currentMETs[mode]) {
      if (mpstomph(speed).between(currentMETs[mode][i].range[0], currentMETs[mode][i].range[1])) {
        return currentMETs[mode][i].mets;
      } else if (mpstomph(speed) < 0 ) {
        console.log("CalorieCal.getMet() Negative speed: " + mpstomph(speed));
        return 0;
      }
    }
  }
  var mpstomph = function(mps) {
    return 2.23694 * mps;
  }
  var lbtokg = function(lb) {
    return lb * 0.453592;
  }
  var fttocm = function(ft) {
    return ft * 30.48;
  }
  cc.getCorrectedMet = function(met, gender, age, height, heightUnit, weight, weightUnit) {
    var height = heightUnit == 0? fttocm(height) : height;
    var weight = weightUnit == 0? lbtokg(weight) : weight;
    if (gender == 1) { //male
      var met = met*3.5/((66.4730+5.0033*height+13.7516*weight-6.7550*age)/ 1440 / 5 / weight * 1000);
      return met;
    } else if (gender == 0) { //female
      var met = met*3.5/((655.0955+1.8496*height+9.5634*weight-4.6756*age)/ 1440 / 5 / weight * 1000);
      return met;
    }
  }
  cc.getuserCalories = function(durationInMin, met) {
    return 65 * durationInMin * met;
  }
  cc.getCalories = function(weightInKg, durationInMin, met) {
    return weightInKg * durationInMin * met;
  }
  return cc;
});
