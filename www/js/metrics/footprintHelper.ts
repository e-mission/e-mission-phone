import { displayErrorMsg } from '../plugin/logger';
import { getCustomFootprint } from './CustomMetricsHelper';

var highestFootprint = 0;
let useCustom = false;

const mtokm = function (v) {
  return v / 1000;
};
export const setUseCustomFootprint = function (val: boolean) {
  useCustom = val;
};

export const clearHighestFootprint = function () {
  //need to clear for testing
  highestFootprint = undefined;
};

const getFootprint = function () {
  if (useCustom == true) {
    return getCustomFootprint();
  } else {
    //TODO: check through configs and ensure they all have custom lables
    displayErrorMsg('Error in Footprint Calculatons', 'issue with data or default labels');
    return;
  }
};

export const getFootprintForMetrics = function (userMetrics, defaultIfMissing = 0) {
  var footprint = getFootprint();
  var result = 0;
  for (var i in userMetrics) {
    var mode = userMetrics[i].key;
    if (mode == 'ON_FOOT') {
      mode = 'WALKING';
    }

    if (mode in footprint) {
      result += footprint[mode] * mtokm(userMetrics[i].values);
    } else if (mode == 'IN_VEHICLE') {
      result +=
        ((footprint['CAR'] +
          footprint['BUS'] +
          footprint['LIGHT_RAIL'] +
          footprint['TRAIN'] +
          footprint['TRAM'] +
          footprint['SUBWAY']) /
          6) *
        mtokm(userMetrics[i].values);
    } else {
      console.warn(
        'WARNING getFootprintFromMetrics() was requested for an unknown mode: ' +
          mode +
          ' metrics JSON: ' +
          JSON.stringify(userMetrics),
      );
      result += defaultIfMissing * mtokm(userMetrics[i].values);
    }
  }
  return result;
};

export const getHighestFootprint = function () {
  if (!highestFootprint) {
    var footprint = getFootprint();
    let footprintList = [];
    for (var mode in footprint) {
      footprintList.push(footprint[mode]);
    }
    highestFootprint = Math.max(...footprintList);
  }
  return highestFootprint;
};

export const getHighestFootprintForDistance = function (distance) {
  return getHighestFootprint() * mtokm(distance);
};
