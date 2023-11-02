'use strict';

import angular from 'angular';
import { SurveyOptions } from '../survey/survey';
import { getConfig } from '../config/dynamicConfig';

angular.module('emission.main.diary.services', ['emission.plugin.logger',
                                                'emission.services'])
.factory('Timeline', function($http, $ionicLoading, $ionicPlatform, $window,
    $rootScope, Logger, $injector) {
    var timeline = {};
    // corresponds to the old $scope.data. Contains all state for the current
    // day, including the indication of the current day
    timeline.data = {};
    timeline.data.unifiedConfirmsResults = null;
    timeline.UPDATE_DONE = "TIMELINE_UPDATE_DONE";

    let manualInputFactory;
    $ionicPlatform.ready(function () {
      getConfig().then((configObj) => {
        const surveyOptKey = configObj.survey_info['trip-labels'];
        const surveyOpt = SurveyOptions[surveyOptKey];
        console.log('surveyOpt in services.js is', surveyOpt);
        manualInputFactory = $injector.get(surveyOpt.service);
      });
    });

    /*
     * Fill out place geojson after pulling trip location points.
     * Place is only partially filled out because we haven't linked the timeline yet
     */

      var localCacheReadFn = timeline.updateFromDatabase;

      timeline.getTrip = function(tripId) {
        return angular.isDefined(timeline.data.tripMap)? timeline.data.tripMap[tripId] : undefined;
      };

      timeline.getTripWrapper = function(tripId) {
        return angular.isDefined(timeline.data.tripWrapperMap)? timeline.data.tripWrapperMap[tripId] : undefined;
      };

      timeline.getCompositeTrip = function(tripId) {
        return angular.isDefined(timeline.data.infScrollCompositeTripMap)? timeline.data.infScrollCompositeTripMap[tripId] : undefined;
      };

    timeline.setInfScrollCompositeTripList = function(compositeTripList) {
        timeline.data.infScrollCompositeTripList = compositeTripList;

        timeline.data.infScrollCompositeTripMap = {};

        timeline.data.infScrollCompositeTripList.forEach(function(trip, index, array) {
          timeline.data.infScrollCompositeTripMap[trip._id.$oid] = trip;
        });
    }

    return timeline;
  })
