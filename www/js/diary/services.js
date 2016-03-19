'use strict';

angular.module('emission.main.diary.services', ['emission.services'])

.factory('Timeline', function(CommHelper, $http, $ionicLoading, $window, $ionicPopup, $rootScope) {
    var timeline = {};
    // corresponds to the old $scope.data. Contains all state for the current
    // day, including the indication of the current day
    timeline.data = {};
    timeline.UPDATE_DONE = "UPDATE_DONE";

    // Internal function, not publicly exposed
    var getKeyForDate = function(date) {
      var dateString = date.startOf('day').format('YYYY-MM-DD');
      return "diary/trips-"+dateString;
    };

    timeline.updateFromDatabase = function(day, foundFn, notFoundFn) {
        console.log("About to show 'Reading from cache'");
        $ionicLoading.show({
              template: 'Reading from cache...'
        });
        window.cordova.plugins.BEMUserCache.getDocument(getKeyForDate(day),
          function (tripListArray) {
             if (tripListArray.length > 0) {
               var tripListStr = tripListArray[0];
               var tripList = JSON.parse(tripListStr);
               console.log("About to hide 'Reading from cache'");
               $ionicLoading.hide();
               foundFn(day, tripList);
             } else {
               console.log("while reading data for "+day+" from database, no records found");
               console.log("About to hide 'Reading from cache'");
               $ionicLoading.hide();
               notFoundFn(day, "no matching record for key "+getKeyForDate(day));
             }
          }, function(error) {
            console.log("About to hide 'Reading from cache'");
            $ionicLoading.hide();
            $ionicPopup.alert({template: JSON.stringify(error)})
                .then(function(res) {console.log("finished showing alert");});
        });
    };

    timeline.updateFromServer = function(day, foundFn, notFoundFn) {
        console.log("About to show 'Reading from server'");
        $ionicLoading.show({
              template: 'Reading from server...'
        });
        CommHelper.getTimelineForDay(day, function(response) {
           var tripList = response.timeline;
           window.Logger.log(window.Logger.LEVEL_DEBUG,
                "while reading data for "+day+" from server, got nTrips = "+tripList.length);
           console.log("About to hide 'Reading from server'");
           $ionicLoading.hide();
           foundFn(day, tripList);
        }, function(error) {
           window.Logger.log(window.Logger.LEVEL_INFO,
                "while reading data for "+day
                +" from server, error = "+JSON.stringify(error));
           console.log("About to hide 'Reading from server'");
           $ionicLoading.hide();
           notFoundFn(day, error);
        });
    };

    /*
     * Used for quick debugging using the live updating server. But then I
     * can't use plugins, so we read from the local file system instead. Should
     * be replaced by a mock of the usercache instead, but this is code
     * movement, not restructuring, so it should stay here.
     */
    var readAndUpdateFromFile = function(day, foundFn, notFoundFn) {
        $http.get("test_data/"+getKeyForDate(day)).then(function(response) {
           console.log("while reading data for "+day+" from file, status = "+response.status);
           tripList = response.data;
           foundFn(day, tripList);
        }, function(response) {
           console.log("while reading data for "+day+" from file, status = "+response.status);
           notFoundFn(day, response);
        });
    };

    var localCacheReadFn = timeline.updateFromDatabase;

    // Functions
    timeline.updateForDay = function(day) { // currDay is a moment
        // First, we try the local cache
        // And if we don't find anything there, we fallback to the real server
        // processTripsForDay is the foundFn
        // the other function (that reads from the server) is the notFoundFn
        localCacheReadFn(day, processTripsForDay, function(day, error) {
            timeline.updateFromServer(day, processTripsForDay, function(day, error) {
                // showNoTripsAlert().then(function(res) {
                    console.log("Alerted user");
                    timeline.data.currDay = day;
                    timeline.data.currDayTrips = []
                    timeline.data.currDaySummary = {}
                    $rootScope.$emit(timeline.UPDATE_DONE, {'from': 'emit', 'status': 'error'});
                    $rootScope.$broadcast(timeline.UPDATE_DONE, {'from': 'broadcast', 'status': 'error'});
               // });
            });
        });
    };

    timeline.getTrip = function(tripId) {
        return timeline.data.tripMap[tripId];
    };

      /*
       Let us assume that we have recieved a list of trips for that date from somewhere
       (either local usercache or the internet). Now, what do we need to process them?
      */
      var processTripsForDay = function(day, tripListForDay) {
          console.log("About to show 'Processing trips'");
          $ionicLoading.show({
                template: 'Processing trips...'
          });
          tripListForDay.forEach(function(item, index, array) {
            console.log(index + ":" + item.properties.start_fmt_time+", "+item.properties.duration);
            
          });
          timeline.data.currDay = day;
          timeline.data.currDayTrips = tripListForDay;

          timeline.data.tripMap = {};

          timeline.data.currDayTrips.forEach(function(trip, index, array) {
            timeline.data.tripMap[trip.id] = trip;
          });

          timeline.data.currDayTrips.forEach(function(trip, index, array) {
              var tc = getTripComponents(trip);
              trip.start_place = tc[0];
              trip.end_place = tc[1];
              trip.stops = tc[2];
              trip.sections = tc[3];
          });

          timeline.data.currDayTrips.forEach(function(trip, index, array) {
              if (angular.isDefined(trip.start_place.properties.displayName)) {
                  console.log("Already have display name "+ dt.start_place.properties.displayName +" for start_place")
              } else {
                  console.log("Don't have display name for start place, going to query nominatim")
                  getDisplayName(trip.start_place)
              }
              if (angular.isDefined(trip.end_place.properties.displayName)) {
                  console.log("Already have display name " + dt.end_place.properties.displayName + " for end_place")
              } else {
                  console.log("Don't have display name for end place, going to query nominatim")
                  getDisplayName(trip.end_place)
              }
          });

          generateDaySummary();

          if (tripListForDay.length == 0) {
            handleZeroTrips();
          }

          console.log("currIndex = "+timeline.data.currDay+" currDayTrips = "+ timeline.data.currDayTrips.length);

            // Return to the top of the page. If we don't do this, then we will be stuck at the 
          $rootScope.$emit(timeline.UPDATE_DONE, {'from': 'emit', 'status': 'success'});
          $rootScope.$broadcast(timeline.UPDATE_DONE, {'from': 'broadcast', 'status': 'success'});
          console.log("About to hide 'Processing trips'");
          $ionicLoading.hide();
    };

    // TODO: Should this be in the factory or in the scope?
    var generateDaySummary = function() {
      var dayMovingTime = 0;
      var dayStoppedTime = 0;
      var dayDistance = 0;

      timeline.data.currDayTrips.forEach(function(trip, index, array) {
          trip.tripSummary = {}
          var movingTime = 0
          var stoppedTime = 0
          trip.stops.forEach(function(stop, index, array) {
            stoppedTime = stoppedTime + stop.properties.duration;
          });
          trip.sections.forEach(function(section, index, array) {
            movingTime = movingTime + section.properties.duration;
          });
          trip.tripSummary.movingTime = movingTime;
          trip.tripSummary.stoppedTime = stoppedTime;
          trip.tripSummary.movingPct = (movingTime / (movingTime + stoppedTime)) * 100;
          trip.tripSummary.stoppedPct = (stoppedTime / (movingTime + stoppedTime)) * 100;
          dayMovingTime = dayMovingTime + trip.tripSummary.movingTime;
          dayStoppedTime = dayStoppedTime + trip.tripSummary.stoppedTime;
          console.log("distance = "+trip.properties.distance);
          dayDistance = dayDistance + trip.properties.distance;
      });

      var dayInSecs = 24 * 60 * 60;

      timeline.data.currDaySummary = {
        breakdown: [
            ["moving", dayMovingTime],
            ["waiting", dayStoppedTime],
            ["in place", dayInSecs - (dayMovingTime + dayStoppedTime)],
        ]
      }
      timeline.data.currDaySummary.distance = dayDistance;
    };

    var handleZeroTrips = function() {
      // showNoTripsAlert();
      var dayInSecs = 24 * 60 * 60;
      timeline.data.currDayTrips = []
      timeline.data.currDaySummary = {}
      timeline.data.currDaySummary = {
          breakdown: [
              ["moving", 0],
              ["waiting", 0],
              ["in place", dayInSecs],
          ]
      }
      timeline.data.currDaySummary.distance = 0;
   };

   var getTripComponents = function(trip) {
        console.log("getSections("+trip+") called");
        var startPlace = null;
        var endPlace = null;
        var stopList = [];
        var sectionList = [];
        trip.features.forEach(function(feature, index, array) {
            // console.log("Considering feature " + JSON.stringify(feature));
            switch (feature.type) {
                case "Feature":
                    switch(feature.properties.feature_type) {
                        case "start_place":
                            startPlace = feature;
                            break;
                        case "end_place":
                            endPlace = feature;
                            break;
                        case "stop":
                            stopList.push(feature);
                            break;
                    }
                    break;
                case "FeatureCollection":
                    feature.features.forEach(function (item, index, array) {
                    if (angular.isDefined(item.properties) && angular.isDefined(item.properties.feature_type)) {
                        // console.log("Considering feature with type " + item.properties.feature_type);
                        if (item.properties.feature_type == "section") {
                            console.log("FOUND section" + item + ", appending");
                            sectionList.push(item);
                        }
                    }
                });
            }
        });
        return [startPlace, endPlace, stopList, sectionList];
    };

    var getDisplayName = function(place_feature) {
      var responseListener = function(data) {
        var address = data["address"];
        var name = "";
        if (address["road"]) {
          name = address["road"];
        } else if (address["neighbourhood"]) {
          name = address["neighbourhood"];
        }
          if (address["city"]) {
            name = name + ", " + address["city"];
          } else if (address["town"]) {
            name = name + ", " + address["town"];
          } else if (address["county"]) {
              name = name + ", " + address["county"];
          }

          console.log("got response, setting display name to "+name);
        place_feature.properties.displayName = name;
      };

      var url = "http://nominatim.openstreetmap.org/reverse?format=json&lat=" + place_feature.geometry.coordinates[1]
          + "&lon=" + place_feature.geometry.coordinates[0];
        console.log("About to make call "+url);
        $http.get(url).then(function(response) {
          console.log("while reading data from nominatim, status = "+response.status
            +" data = "+JSON.stringify(response.data));
          responseListener(response.data);
        }, function(error) {
          console.log("while reading data from nominatim, error = "+error);
        });
    };

    return timeline;
})

