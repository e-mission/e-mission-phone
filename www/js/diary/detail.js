'use strict';

angular.module('emission.main.diary.detail',['ui-leaflet', 'nvd3ChartDirectives',
                                      'ionic-datepicker'])

.controller("DiaryDetailCtrl", function($scope, $stateParams, Timeline) {
  console.log("controller DiaryDetailCtrl called with params = "+
    JSON.stringify($stateParams));

  $scope.mapCtrl = {};

  angular.extend($scope.mapCtrl, {
    defaults : {
      tileLayer: 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      tileLayerOptions: {
          opacity: 0.9,
          detectRetina: true,
          reuseTiles: true,
      }
    } 
  });
  $scope.getIcon = function(section) {
    var icons = {"BICYCLING":"ion-android-bicycle",
                  "WALKING":" ion-android-walk",
                  "RUNNING":" ion-android-walk",
                  "IN_VEHICLE":"ion-disc",}
    return icons[$scope.getHumanReadable(section.properties.sensed_mode)]; 
  }
 $scope.getHumanReadable = function(sensed_mode) {
      ret_string = sensed_mode.split('.')[1];
      if(ret_string == 'ON_FOOT') {
          return 'WALKING';
      } else {
          return ret_string;
      }
    };
    $scope.getPercentages = function(trip) {
      var rtn0 = []; // icons
      var rtn1 = []; //percentages
      var icons = {"BICYCLING":"ion-android-bicycle",
                    "WALKING":" ion-android-walk",
                    "RUNNING":" ion-android-walk",
                    "IN_VEHICLE":"ion-disc",}
      var total = 0;
      for (var i=0; i<trip.sections.length; i++) {
        if (rtn0.indexOf($scope.getHumanReadable(trip.sections[i].properties.sensed_mode)) == -1) {
          rtn0.push($scope.getHumanReadable(trip.sections[i].properties.sensed_mode));
          rtn1.push(trip.sections[i].properties.distance);
          total += trip.sections[i].properties.distance;
        } else {
          rtn1[rtn0.indexOf($scope.getHumanReadable(trip.sections[i].properties.sensed_mode))] += trip.sections[i].properties.distance;
          total += trip.sections[i].properties.distance;
        }
      }
      for (var i=0; i<rtn0.length; i++) {
        rtn0[i] = "icon " + icons[rtn0[i]];
        rtn1[i] = Math.floor((rtn1[i] / total) * 100);
      }
      return [rtn0, rtn1];
    }

    $scope.starColor = function(trip) {
      if (trip.common_count >= 3) {
        return 'yellow';
      } else {
        return 'transparent';
      }
    }
    $scope.allModes = function(trip) {
      var rtn = [];
      var icons = {"BICYCLING":"ion-android-bicycle",
                    "WALKING":" ion-android-walk",
                    "RUNNING":" ion-android-walk",
                    "IN_VEHICLE":"ion-disc",}
      for (var i=0; i<trip.sections.length; i++) {
        if (rtn.indexOf($scope.getHumanReadable(trip.sections[i].properties.sensed_mode)) == -1) {
          rtn.push($scope.getHumanReadable(trip.sections[i].properties.sensed_mode));
        }
      }
      for (var i=0; i<rtn.length; i++) {
        rtn[i] = "icon " + icons[rtn[i]];
      }

      return rtn;
    }

  $scope.trip = Timeline.getTrip($stateParams.tripId);
        $scope.getKmph = function(section) {
            metersPerSec = section.properties.distance / section.properties.duration;
            return (metersPerSec * 3.6).toFixed(2);
        };

        $scope.getFormattedDistance = function(dist_in_meters) {
            if (dist_in_meters > 1000) {
                return (dist_in_meters/1000).toFixed(0);
            } else {
                return (dist_in_meters/1000).toFixed(3);
            }
        }

        $scope.getSectionDetails = function(section) {
            startMoment = moment(section.properties.start_ts * 1000);
            endMoment = moment(section.properties.end_ts * 1000);
            retVal = [startMoment.format('LT'),
                    endMoment.format('LT'),
                    endMoment.to(startMoment, true),
                    formatDistance(section.properties.distance),
                    tokmph(section.properties.distance, section.properties.duration).toFixed(2),
                    $scope.getHumanReadable(section.properties.sensed_mode)];
            return retVal;
        };

        $scope.getFormattedTime = function(ts_in_secs) {
            if (angular.isDefined(ts_in_secs)) {
                return moment(ts_in_secs * 1000).format('LT');
            } else {
                return "---";
            }
        };

        $scope.getFormattedTimeRange = function(end_ts_in_secs, start_ts_in_secs) {
            startMoment = moment(start_ts_in_secs * 1000);
            endMoment = moment(end_ts_in_secs * 1000);
            return endMoment.to(startMoment, true);
        };

        $scope.getFormattedDuration = function(duration_in_secs) {
            return moment.duration(duration_in_secs * 1000).humanize()
        };

        $scope.getTripDetails = function(trip) {
            return (trip.sections.length) + " sections";
        };  $scope.tripgj = {}
  $scope.tripgj.data = $scope.trip;
  console.log("trip.start_place = " + JSON.stringify($scope.trip.start_place));
})
