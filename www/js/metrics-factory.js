'use strict';

angular.module('emission.main.metrics.factory', ['angularLocalStorage'])

.factory('FootprintHelper', function() {
  var fh = {};
  var footprint = {
    train: 92/1609,
    car: 287/1609,
    ON_FOOT: 0,
    BICYCLING: 0
  }
  var readable = function(v) {
    return v > 9999? Math.round(v / 1000) + 'k kg CO₂' : Math.round(v) + ' kg CO₂';
  }
  var mtokm = function(v) {
    return v / 1000;
  }
  fh.getFootprintRaw = function(distance, mode) {
    if (mode === "IN_VEHICLE") {
      return [footprint.train * mtokm(distance), footprint.car * mtokm(distance)];
    } else {
      return footprint[mode] * mtokm(distance);
    }
  }
  fh.getFootprint = function(distance, mode) {
    if (mode === "IN_VEHICLE") {
      return readable(footprint.train * mtokm(distance)) + ' ~ ' + readable(footprint.car * mtokm(distance));
    } else {
      return readable(footprint[mode] * mtokm(distance));
    }
  }
  return fh;
})

.factory('CalorieCal', function(storage){

  var cc = {}; 
  cc.set = function(info) {
    for(var key in info){
      storage.set(key, info[key])
    }
  };
  cc.get = function() {
    var userData = {
        'gender': storage.get('gender'),
        'heightUnit': storage.get('heightUnit'),
        'height': storage.get('height'),
        'weightUnit': storage.get('weightUnit'),
        'weight': storage.get('weight'),
        'age': storage.get('age'),
        'userDataSaved': storage.get('userDataSaved')
      }
      return userData;
  };
  cc.delete = function() {
    storage.remove('gender');
        storage.remove('height');
        storage.remove('heightUnit');
        storage.remove('weight');
        storage.remove('weightUnit');
        storage.remove('age');
        storage.remove('userDataSaved');
  };
  Number.prototype.between = function (min, max) {
    return this >= min && this <= max;
  };
  cc.getMet = function(mode, speed) {
    if (!standardMETs[mode]) {
      console.log("Illegal mode");
      return 0; //So the calorie sum does not break with wrong return type
    }
    for (var i in standardMETs[mode]) {
      if (mpstomph(speed).between(standardMETs[mode][i].range[0], standardMETs[mode][i].range[1])) {
        return standardMETs[mode][i].mets;
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
  var standardMETs = {
    "ON_FOOT": {
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
    "IN_VEHICLE": {
      "ALL": {
        range: [0, Number.MAX_VALUE],
        mets: 0
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
    }
  }
  return cc;

});