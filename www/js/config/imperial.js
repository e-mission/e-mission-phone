'use strict';

angular.module('emission.config.imperial', ['emission.plugin.logger'])
.factory('ImperialConfig', function($rootScope) {
    // change to true if we want to use imperial units such as miles
    // I didn't want to do this since the US is one of the only countries that
    // still uses imperial units, but it looks like this will primarily be
    // funded by a US source, so I guess we have to support this for now.

    // TODO: Convert this to a config option when we use config stuff
    const USE_IMPERIAL = false;
    const KM_TO_MILES = 0.621371;

    var ic = {}

    ic.getFormattedDistanceInKm = function(dist_in_meters) {
      if (dist_in_meters > 1000) {
        return Number.parseFloat((dist_in_meters/1000).toFixed(0));
      } else {
        return Number.parseFloat((dist_in_meters/1000).toFixed(3));
      }
    }

    ic.getFormattedDistanceInMiles = function(dist_in_meters) {
        return Number.parseFloat((KM_TO_MILES * ic.getFormattedDistanceInKm(dist_in_meters)).toFixed(1));
    }

    ic.getKmph = function(metersPerSec) {
        return (metersPerSec * 3.6).toFixed(2);
    };

    ic.getMph = function(metersPerSecond) {
        return (KM_TO_MILES * Number.parseFloat(ic.getKmph(metersPerSecond))).toFixed(2);
    };

    ic.init = function() {
        ic.getFormattedDistance = ic.useImperial? ic.getFormattedDistanceInMiles : ic.getFormattedDistanceInKm;
        ic.getFormattedSpeed = ic.useImperial? ic.getMph : ic.getKmph;
        ic.getDistanceSuffix = ic.useImperial? "mi" : "km";
        ic.getSpeedSuffix = ic.useImperial? "mph" : "kmph";
    }
    console.log("Registering for the UI_CONFIG_READY notification");
    $rootScope.$on("UI_CONFIG_READY", function(event, newConfig) {
      Logger.log("Received UI_CONFIG_READY notification in intro.js, filling in templates");
      ic.useImperial = newConfig.display_config.use_imperial;
      ic.init();
    });
    return ic;
});
