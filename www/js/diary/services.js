'use strict';

angular.module('emission.main.diary.services', ['emission.services'])
.factory('DiaryHelper', function(Timeline, CommonGraph){
  var dh = {};
  dh.getIcon = function(section) {
    var icons = {"BICYCLING":"ion-android-bicycle",
    "WALKING":" ion-android-walk",
    "RUNNING":" ion-android-walk",
    "IN_VEHICLE":"ion-disc",}
    return icons[dh.getHumanReadable(section.properties.sensed_mode)]; 
  }
  dh.getHumanReadable = function(sensed_mode) {
    var ret_string = sensed_mode.split('.')[1];
    if (ret_string == 'ON_FOOT') {
      return 'WALKING';
    } else {
      return ret_string;
    }
  }
  // Temporary function to avoid repear in getPercentages ret val.
  var filterRunning = function(mode) {
    if (mode == 'RUNNING') {
      return 'WALKING';
    } else {
      return mode;
    }
  }
  dh.getPercentages = function(trip) {
    var rtn0 = []; // icons
    var rtn1 = []; //percentages
    
    var icons = {"BICYCLING":"ion-android-bicycle",
    "WALKING":"ion-android-walk",
    // "RUNNING":" ion-android-walk",
    //  RUNNING has been filtered in function above
    "IN_VEHICLE":"ion-disc",}
    var total = 0;
    for (var i=0; i<trip.sections.length; i++) {
      if (rtn0.indexOf(filterRunning(dh.getHumanReadable(trip.sections[i].properties.sensed_mode))) == -1) {
        rtn0.push(filterRunning(dh.getHumanReadable(trip.sections[i].properties.sensed_mode)));
        rtn1.push(trip.sections[i].properties.distance);
        total += trip.sections[i].properties.distance;
      } else {
        rtn1[rtn0.indexOf(filterRunning(dh.getHumanReadable(trip.sections[i].properties.sensed_mode)))] += trip.sections[i].properties.distance;
        total += trip.sections[i].properties.distance;
      }
    }
    for (var i=0; i<rtn0.length; i++) {
      rtn0[i] = "icon " + icons[rtn0[i]];
      rtn1[i] = Math.floor((rtn1[i] / total) * 100);
    }
    return [rtn0, rtn1];
  }
  dh.starColor = function(num) {
    if (num >= 3) {
      return 'yellow';
    } else {
      return 'transparent';
    }
  }
  dh.allModes = function(trip) {
    var rtn = [];
    var icons = {"BICYCLING":"ion-android-bicycle",
    "WALKING":"ion-android-walk",
    "RUNNING":"ion-android-walk",
    "IN_VEHICLE":"ion-disc",}
    for (var i=0; i<trip.sections.length; i++) {
      if (rtn.indexOf(dh.getHumanReadable(trip.sections[i].properties.sensed_mode)) == -1) {
        rtn.push(dh.getHumanReadable(trip.sections[i].properties.sensed_mode));
      }
    }
    for (var i=0; i<rtn.length; i++) {
      rtn[i] = "icon " + icons[rtn[i]];
    }
    return rtn;
  }

  dh.getKmph = function(section) {
    var metersPerSec = section.properties.distance / section.properties.duration;
    return (metersPerSec * 3.6).toFixed(2);
  };
  dh.getFormattedDistance = function(dist_in_meters) {
    if (dist_in_meters > 1000) {
      return (dist_in_meters/1000).toFixed(0);
    } else {
      return (dist_in_meters/1000).toFixed(3);
    }
  }
  dh.getSectionDetails = function(section) {
    var startMoment = moment(section.properties.start_ts * 1000);
    var endMoment = moment(section.properties.end_ts * 1000);
    var retVal = [startMoment.format('LT'),
    endMoment.format('LT'),
    endMoment.to(startMoment, true),
    formatDistance(section.properties.distance),
    tokmph(section.properties.distance, section.properties.duration).toFixed(2),
    dh.getHumanReadable(section.properties.sensed_mode)];
    return retVal;
  };
  dh.getFormattedTime = function(ts_in_secs) {
    if (angular.isDefined(ts_in_secs)) {
      return moment(ts_in_secs * 1000).format('LT');
    } else {
      return "---";
    }
  };  
  dh.getFormattedTimeRange = function(end_ts_in_secs, start_ts_in_secs) {
    var startMoment = moment(start_ts_in_secs * 1000);
    var endMoment = moment(end_ts_in_secs * 1000);
    return endMoment.to(startMoment, true);
  };
  dh.getFormattedDuration = function(duration_in_secs) {
    return moment.duration(duration_in_secs * 1000).humanize()
  };
  dh.getTripDetails = function(trip) {
    return (trip.sections.length) + " sections";
  }; 
  dh.getEarlierOrLater = function(ts, id) {
    var ctrip = CommonGraph.findCommon(id);
    if (!angular.isUndefined(ctrip)) {
      // assume probabilities array is Monday-indexed + 1-indexed
      var mostFrequestHour = ctrip.start_times[0].hour;    
      var thisHour = parseInt(dh.getFormattedTime(ts).split(':')[0]);
      if (thisHour == mostFrequestHour) {
        return '';
      } else {
        return (mostFrequestHour - thisHour).toString();
      }
    } else {
      return '';
    }
  }
  dh.getArrowClass = function(i) {
    if (i == -1) {
      return 'icon ion-arrow-down-c';
    } else if (i == 0) {
      return '';
    } else {
      return 'icon ion-arrow-up-c';
    }

  }
  dh.getLongerOrShorter = function(trip, id) {
    var noChangeReturn = [0, ''];
    var ctrip = CommonGraph.findCommon(id);
    if (!angular.isUndefined(ctrip)) {
      var cDuration = dh.average(ctrip.durations);
      if (cDuration == null) {
         return noChangeReturn;
      }
      var thisDuration = trip.properties.end_ts - trip.properties.start_ts;
      var diff = thisDuration - cDuration;
      if (diff < 60 && diff > -60) {
        return noChangeReturn;
      } else {
        if (diff > 0) {
          return [1, dh.getFormattedDuration(diff)]; 
        } else {
          return [-1, dh.getFormattedDuration(diff)]; 
        }
        
      }
    } else {
      return noChangeReturn;
    }
  }
  dh.average = function(array) {
     if (array.length == 0) {
       // We want to special case the handling of the array length because
       // otherwise we will get a divide by zero error and the dreaded nan
       return null;
     }
    // check out cool use of reduce and arrow functions!
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/Reduce
    // Hm, arrow functions don't work, but reduce does!
     var sum = array.reduce(function(previousValue, currentValue, currentIndex, array) {
          return previousValue + currentValue;
     });
     return sum/array.length
  }
  dh.arrowColor = function(pn) {
    if (pn == 0) {
      return 'transparent';
    } else if (pn == -1) {
      return '#72b026';
    } else {
      return '#d63e2a';
    }
  }
   dh.parseEarlierOrLater = function(val) {
      if (val[0] == '-') {
        if (parseInt(val.substring(1)) == 1) {
          return 'Started ' + val.substring(1) + ' hour earlier than usual'
        } else {
          return 'Started ' + val.substring(1) + ' hours earlier than usual'
        }
      } else {
        if (parseInt(val) == 1) {
          return 'Started ' + val + ' hour later than usual'
        } else {
          return 'Started ' + val + ' hours later than usual'
        }        
      }
    }
  
  dh.fillCommonTripCount = function(tripWrapper) {
      var cTrip = CommonGraph.findCommon(tripWrapper.data.id);
      if (!angular.isUndefined(cTrip)) {
          tripWrapper.common_count = cTrip.trips.length;
      }
  };
  dh.directiveForTrip = function(trip) { 
    var retVal = {};
    retVal.data = trip;
    retVal.style = style_feature;
    retVal.onEachFeature = onEachFeature;
    retVal.pointToLayer = pointFormat;
    retVal.start_place = trip.start_place;
    retVal.end_place = trip.end_place;
    retVal.stops = trip.stops;
    retVal.sections = trip.sections;
    retVal.tripSummary = trip.tripSummary;
    dh.fillCommonTripCount(retVal);
    // Hardcoding to avoid repeated nominatim calls
    // retVal.start_place.properties.displayName = "Start";
    // retVal.start_place.properties.displayName = "End";
    return retVal;
  };
  dh.userModes = [
        "walk", "bicycle", "car", "bus", "train", "unicorn"
    ];
  dh.showModes = function(section) {
    return function() {
      var currMode = dh.getHumanReadable(section.properties.sensed_mode);
      var currButtons = [{ text: "<b>"+currMode+"</b>"}];
      dh.userModes.forEach(function(item, index, array) {
        if (item != currMode) {
          currButtons.push({text: item});
        }
      });

      // Show the action sheet
       var modeSheet = $ionicActionSheet.show({
         buttons: currButtons,
         titleText: 'Trip Mode?',
         destructiveText: 'Delete',
         buttonClicked: function(index) {
          console.log("button "+index+" clicked for section "+JSON.stringify(section.properties));
          return true;
        },
        destructiveButtonClicked: function(index) {
         console.log("delete clicked for section "+JSON.stringify(section.properties));
         return true;
       }
     });
   }
 };
  var style_feature = function(feature) {
    switch(feature.properties.feature_type) {
      case "section": return style_section(feature);
      case "stop": return style_stop(feature);
      default: return {}
    }
  };
  var onEachFeature = function(feature, layer) {
    // console.log("onEachFeature called with "+JSON.stringify(feature));
    switch(feature.properties.feature_type) {
      case "stop": layer.bindPopup(""+feature.properties.duration); break;
      case "start_place": layer.on('click', layer.bindPopup(""+feature.properties.displayName)); break;
      case "end_place": layer.on('click', layer.bindPopup(""+feature.properties.displayName)); break;
      // case "section": layer.setText(dh.getHumanReadable(feature.properties.sensed_mode), {offset: 20});
          layer.on('click', dh.showModes(feature)); break;
      // case "location": layer.bindPopup(JSON.stringify(feature.properties)); break
    }
};
  var pointFormat = function(feature, latlng) {
    switch(feature.properties.feature_type) {
      case "start_place": return L.marker(latlng, {icon: startIcon});
      case "end_place": return L.marker(latlng, {icon: stopIcon});
      case "stop": return L.circleMarker(latlng);
      case "location": return L.marker(latlng, {icon: pointIcon});
      default: alert("Found unknown type in feature"  + feature); return L.marker(latlng)
    }
  };
    var pointIcon = L.divIcon({className: 'leaflet-div-icon', iconSize: [0, 0]});
    var startIcon = L.divIcon({className: 'leaflet-div-icon-start', iconSize: [12, 12], html: '<div class="inner-icon">'});
    var stopIcon = L.divIcon({className: 'leaflet-div-icon-stop', iconSize: [12, 12], html: '<div class="inner-icon">'});

    var style_stop = function(feature) {
      return {fillColor: 'yellow', fillOpacity: 0.8};
    };
    var getColoredStyle = function(baseDict, color) {
      baseDict.color = color;
      return baseDict
    };


    var style_section = function(feature) {
        var baseDict = {
                weight: 5,
                opacity: 1,
        };
        var mode_string = dh.getHumanReadable(feature.properties.sensed_mode);
        switch(mode_string) {
            case "WALKING": return getColoredStyle(baseDict, 'brown');
            case "RUNNING": return getColoredStyle(baseDict, 'brown');
            case "BICYCLING": return getColoredStyle(baseDict, 'green');
            case "TRANSPORT": return getColoredStyle(baseDict, 'red');
            default: return getColoredStyle(baseDict, 'black');
        }
      };

  return dh;

})
.factory('Timeline', function(CommHelper, $http, $ionicLoading, $window, $ionicPopup, $rootScope) {
  var timeline = {};
    // corresponds to the old $scope.data. Contains all state for the current
    // day, including the indication of the current day
    timeline.data = {};
    timeline.UPDATE_DONE = "TIMELINE_UPDATE_DONE";

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

