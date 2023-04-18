'use strict';

/*
 * The general structure of this code is that all the timeline information for
 * a particular day is retrieved from the Timeline factory and put into the scope.
 * For best performance, all data should be loaded into the in-memory timeline,
 * and in addition to writing to storage, the data should be written to memory.
 * All UI elements should only use $scope variables.
 */

angular.module('emission.survey.enketo.trip.infscrollfilters',[
    'emission.survey.enketo.trip.button',
    'emission.plugin.logger'
  ])
.factory('EnketoTripInfScrollFilters', function(Logger, EnketoTripButtonService, $translate){
    var sf = {};
    var unlabeledCheck = function(t) {
       return !angular.isDefined(t.userInput[EnketoTripButtonService.SINGLE_KEY]);
    }

    sf.UNLABELED = {
        key: "unlabeled",
        text: $translate.instant(".unlabeled"),
        filter: unlabeledCheck
    }

    sf.TO_LABEL = {
        key: "to_label",
        text: $translate.instant(".to-label"),
        filter: unlabeledCheck
    }

    sf.configuredFilters = [
        sf.TO_LABEL,
        sf.UNLABELED,
    ];
    return sf;
});
