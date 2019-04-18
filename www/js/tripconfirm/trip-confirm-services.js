angular.module('emission.tripconfirm.services', [])
.factory("ConfirmHelper", function($http) {
    var ch = {};

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
            .catch(err => {
                console.log("error "+JSON.stringify(err)+" while reading confirm options, reverting to defaults");
                return $http.get(filename+".sample")
                     .then(fillInOptions)
                     .catch(err => {
                        console.log("error "+JSON.stringify(err)+" while reading default confirm options, giving up");
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

    return ch;
})
