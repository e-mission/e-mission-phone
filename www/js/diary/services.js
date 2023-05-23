'use strict';

const MotionTypes = {
  0: {name: "IN_VEHICLE", icon: "ion-speedometer", color: "purple"},
  1: {name: "BICYCLING", icon: "ion-android-bicycle", color: "green"},
  2: {name: "ON_FOOT", icon: "ion-android-walk", color: "brown"},
  3: {name: "STILL", icon: "ion-android-walk", color: "brown"},
  4: {name: "UNKNOWN", icon: "ion-ios-help", color: "orange"},
  5: {name: "TILTING", icon: "ion-ios-help", color: "orange"},
  7: {name: "WALKING", icon: "ion-android-walk", color: "brown"},
  8: {name: "RUNNING", icon: "ion-android-walk", color: "brown"},
  9: {name: "NONE", icon: "ion-ios-help", color: "orange"},
  10: {name: "STOPPED_WHILE_IN_VEHICLE", icon: "ion-speedometer", color: "purple"},
  11: {name: "AIR_OR_HSR", icon: "ion-plane", color: "red"}
}

angular.module('emission.main.diary.services', ['emission.plugin.logger',
    'emission.services', 'emission.main.common.services',
    'emission.incident.posttrip.manual'])
.factory('DiaryHelper', function(CommonGraph, PostTripManualMarker, $translate){
  var dh = {};
  // dh.expandEarlierOrLater = function(id) {
  //   document.querySelector('#hidden-' + id.toString()).setAttribute('style', 'display: block;');
  //   dh.increaseRestElementsTranslate3d(id);
  // }
  // dh.increaseRestElementsTranslate3d = function(id) {
  //   var handle = document.querySelector('#hidden-' + id.toString());
  //   var arr = handle.parentElement.parentElement.parentElement.style.transform.split(',');
  //   var oldVal = parseInt(arr[1].substring(1, arr[1].length - 2));
  //   var newVal = oldVal + 40;

  //   var oldVal1 = parseInt(handle.parentElement.parentElement.parentElement.style.height);
  //   var oldVal2 = parseInt(handle.parentElement.parentElement.parentElement.style.width);
  //   arr[1] = newVal.toString();
  //   document.querySelector('#hidden-' + id.toString()).parentElement.parentElement.parentElement
  //   .setAttribute('style', 'transform: '+arr.join(','));
  //   document.querySelector('#hidden-' + id.toString()).parentElement.parentElement.parentElement
  //   .setAttribute('style', 'height: '+oldVal1);
  //   document.querySelector('#hidden-' + id.toString()).parentElement.parentElement.parentElement
  //   .setAttribute('style', 'width: '+oldVal2);
  // }

  dh.isMultiDay = function(beginTs, endTs) {
    if (!beginTs || !endTs) return false;
    return moment(beginTs * 1000).format('YYYYMMDD') != moment(endTs * 1000).format('YYYYMMDD');
  }

  /* returns a formatted range if both params are defined, 
    one formatted date if only one is defined */
  dh.getFormattedDate = function(beginTs, endTs=null) {
    if (!beginTs && !endTs) return;
    if (dh.isMultiDay(beginTs, endTs)) {
      return `${dh.getFormattedDate(beginTs)} - ${dh.getFormattedDate(endTs)}`;
    }
    let t = beginTs || endTs;    // whichever is defined. may be timestamp or dt object
    if (typeof t == 'number') t = t*1000; // if timestamp, convert to ms
    if (!t._isAMomentObject) t = moment(t);
   // We use ddd LL to get Wed, May 3, 2023 or equivalent
   // LL only has the date, month and year
   // LLLL has the day of the week, but also the time
    return t.format('ddd LL');
  }

  /* returns a formatted range if both params are defined, 
    one formatted date if only one is defined */
  dh.getFormattedDateAbbr = function(beginTs, endTs=null) {
    if (!beginTs && !endTs) return;
    if (dh.isMultiDay(beginTs, endTs)) {
      return `${dh.getFormattedDateAbbr(beginTs)} - ${dh.getFormattedDateAbbr(endTs)}`;
    }
    let t = beginTs || endTs;    // whichever is defined. may be timestamp or object
    if (typeof t == 'number') t = t*1000; // if timestamp, convert to ms
    if (!t._isAMomentObject) t = moment(t);
    const opts = { weekday: 'short', month: 'short', day: 'numeric' };
    return Intl.DateTimeFormat($translate.use(), opts)
      .format(new Date(t.format('LLL')));
  }

  dh.isCommon = function(id) {
    var ctrip = CommonGraph.trip2Common(id);
    return !angular.isUndefined(ctrip);
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
    if (mode == 'MotionTypes.RUNNING') {
      return 'MotionTypes.WALKING';
    } else {
      return mode;
    }
  }
  dh.getPercentages = function(trip) {
    if (!trip.sections?.length) return {};
    // we use a Map here to make it easier to work with the for loop below
    let dists = {};

    var totalDist = 0;
    for (var i=0; i<trip.sections.length; i++) {
      let filteredMode = filterRunning(trip.sections[i].sensed_mode);
      if (filteredMode in dists) {
        dists[filteredMode] += trip.sections[i].distance;
        totalDist += trip.sections[i].distance;
      } else {
        dists[filteredMode] = trip.sections[i].distance;
        totalDist += trip.sections[i].distance;
      }
    }
    // sort modes by the distance traveled (descending)
    const sortedKeys = Object.entries(dists).sort((a, b) => b[1] - a[1]).map(e => e[0]);
    let sectionPcts = sortedKeys.map(function(mode) {
        const fract = dists[mode] / totalDist;
        return {
            mode: mode,
            icon: "icon " + MotionTypes[mode]?.icon,
            color: MotionTypes[mode]?.color || 'black',
            pct: Math.round(fract * 100) || '<1' // if rounds to 0%, show <1%
        };
    });

    return sectionPcts;
  }

  dh.getFormattedSectionProperties = (trip, ImperialConfig) => {
    return trip.sections?.map((s) => ({
      fmt_time: dh.getLocalTimeString(s.start_local_dt),
      fmt_time_range: dh.getFormattedTimeRange(s.end_ts, s.start_ts),
      fmt_distance: ImperialConfig.getFormattedDistance(s.distance),
      fmt_distance_suffix: ImperialConfig.getDistanceSuffix,
      icon: "icon " + MotionTypes[s.sensed_mode]?.icon,
      color: MotionTypes[s.sensed_mode]?.color || "#333",
    }));
  };

  dh.starColor = function(num) {
    if (num >= 3) {
      return 'yellow';
    } else {
      return 'transparent';
    }
  }
  dh.isDraft = function(tripgj) {
    return false; // TODO: reinstate once trip structure is unified
    if (// tripgj.data.features.length == 3 && // reinstate after the local and remote paths are unified
      angular.isDefined(tripgj.data.features[2].features) &&
      tripgj.data.features[2].features[0].properties.feature_type == "section" &&
      tripgj.data.features[2].features[0].properties.sensed_mode == "MotionTypes.UNPROCESSED") {
        return true;
    } else {
        return false;
    }
  }

  dh.getTripBackground = function(tripgj) {
      var background = "bg-light";
      if (dh.isDraft(tripgj)) {
        background = "bg-unprocessed";
      }
      return background;
  }

  dh.getLocalTimeString = function (dt) {
    if (!dt) return;
    //correcting the date of the processed trips knowing that local_dt months are from 1 -> 12 and for the moment function they need to be between 0 -> 11
    let mdt = angular.copy(dt)
    mdt.month = mdt.month - 1
    return moment(mdt).format("LT");
  };

  dh.getFormattedTime = function(ts_in_secs) {
    if (isNaN(ts_in_secs)) return;
    if (angular.isDefined(ts_in_secs)) {
      return moment(ts_in_secs * 1000).format('LT');
    } else {
      return "---";
    }
  };
  dh.getFormattedTimeRange = function(end_ts_in_secs, start_ts_in_secs) {
    if (isNaN(end_ts_in_secs) || isNaN(start_ts_in_secs)) return;
    var startMoment = moment(start_ts_in_secs * 1000);
    var endMoment = moment(end_ts_in_secs * 1000);
    return endMoment.to(startMoment, true);
  };
  dh.getFormattedDuration = function(duration_in_secs) {
    if (isNaN(duration_in_secs)) return;
    return moment.duration(duration_in_secs * 1000).humanize()
  };
  dh.getTripDetails = function(trip) {
    return (trip.sections.length) + " sections";
  };
  dh.getEarlierOrLater = function(ts, id) {
    if (!angular.isDefined(id)) {
      return '';
    }
    var ctrip = CommonGraph.trip2Common(id);
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
    if (!angular.isDefined(id)) {
      return false;
    }
    var noChangeReturn = [0, ''];
    var ctrip = CommonGraph.trip2Common(id);
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
      return '#33e0bb';
    } else {
      return '#ff5251';
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
      var cTrip = CommonGraph.trip2Common(tripWrapper.data.id);
      if (!angular.isUndefined(cTrip)) {
          tripWrapper.common.count = cTrip.trips.length;
      }
  };
  dh.directiveForTrip = function(trip) {
    var retVal = {};
    retVal.data = trip;
    retVal.style = style_feature;
    retVal.onEachFeature = onEachFeature;
    retVal.pointToLayer = dh.pointFormat;
    retVal.start_place = trip.start_place;
    retVal.end_place = trip.end_place;
    retVal.stops = trip.stops;
    retVal.sections = trip.sections;
    retVal.tripSummary = trip.tripSummary;
    // Hardcoding to avoid repeated nominatim calls
    // retVal.start_place.properties.display_name = "Start";
    // retVal.start_place.properties.display_name = "End";
    return retVal;
  };

  dh.userModes = [
        "walk", "bicycle", "car", "bus", "light_rail", "train", "tram", "subway", "unicorn"
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
      /*
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
     */
   }
 };
  var style_feature = function(feature) {
    switch(feature.properties.feature_type) {
      case "section": return style_section(feature);
      case "stop": return style_stop(feature);
      default: return {}
    }
  };

  var showClickTime = function(feature, layer) {
    return layer.bindPopup("click: "+dh.getFormattedTime(feature.properties.ts));
  };

  var onEachFeature = function(feature, layer) {
    // console.log("onEachFeature called with "+JSON.stringify(feature));
    switch(feature.properties.feature_type) {
      case "stop": layer.bindPopup(""+feature.properties.duration); break;
      case "start_place": layer.bindPopup(""+feature.properties.display_name); break;
      case "end_place": layer.bindPopup(""+feature.properties.display_name); break;
      case "section": layer.on('click',
        PostTripManualMarker.startAddingIncidentToSection(feature, layer)); break;
      case "incident": PostTripManualMarker.displayIncident(feature, layer); break;
    }
};

  dh.pointFormat = function(feature, latlng) {
    switch(feature.properties.feature_type) {
      case "start_place": return L.marker(latlng, {icon: startIcon});
      case "end_place": return L.marker(latlng, {icon: stopIcon});
      case "stop": return L.circleMarker(latlng);
      case "incident": return PostTripManualMarker.incidentMarker(feature, latlng);
      case "location": return L.marker(latlng, {icon: pointIcon});
      default: alert("Found unknown type in feature"  + feature); return L.marker(latlng)
    }
  };
    var pointIcon = L.divIcon({className: 'leaflet-div-icon', iconSize: [0, 0]});
    var startIcon = L.divIcon({className: 'leaflet-div-icon-start', iconSize: [18, 18], html: '<div class="leaflet-div-ionicon leaflet-div-ionicon-start"><i class="ion-location"></i></div>'});
    var stopIcon = L.divIcon({className: 'leaflet-div-icon-stop', iconSize: [18, 18], html: '<div class="leaflet-div-ionicon leaflet-div-ionicon-stop"><i class="ion-flag"></i></div>'});

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
        return getColoredStyle(baseDict, dh.getColor(feature.properties.sensed_mode));
      };

  return dh;
})
.factory('Timeline', function(CommHelper, SurveyOptions, DynamicConfig, $http, $ionicLoading, $ionicPlatform, $window,
    $rootScope, CommonGraph, UnifiedDataLoader, Logger, $injector, $translate) {
    var timeline = {};
    // corresponds to the old $scope.data. Contains all state for the current
    // day, including the indication of the current day
    timeline.data = {};
    timeline.data.unifiedConfirmsResults = null;
    timeline.UPDATE_DONE = "TIMELINE_UPDATE_DONE";

    let manualInputFactory;
    $ionicPlatform.ready(function () {
      DynamicConfig.configReady().then((configObj) => {
        const surveyOptKey = configObj.survey_info['trip-labels'];
        const surveyOpt = SurveyOptions[surveyOptKey];
        console.log('surveyOpt in services.js is', surveyOpt);
        manualInputFactory = $injector.get(surveyOpt.service);
      });
    });

    // Internal function, not publicly exposed
    var getKeyForDate = function(date) {
      var dateString = date.startOf('day').format('YYYY-MM-DD');
      return "diary/trips-"+dateString;
    };

    timeline.getUnprocessedLabels = function(manualFactory, enbs) {
        /*
         Because with the confirmed trips, all prior labels have been
         incorporated into the trip.
         */
        return CommHelper.getPipelineRangeTs().then(function(result) {
            const pendingLabelQuery = {key: "write_ts",
                startTs: result.end_ts - 10,
                endTs: moment().unix() + 10
            }
            var manualPromises = manualFactory.MANUAL_KEYS.map(function(inp_key) {
              return UnifiedDataLoader.getUnifiedMessagesForInterval(
                  inp_key, pendingLabelQuery).then(manualFactory.extractResult);
            });
            var enbsPromises = enbs.MANUAL_KEYS.map(function(inp_key) {
              return UnifiedDataLoader.getUnifiedMessagesForInterval(
                  inp_key, pendingLabelQuery).then(enbs.extractResult);
            });
            const manualConfirmResults = {};
            const enbsConfirmResults = {};
            return Promise.all([...manualPromises, ...enbsPromises]).then((comboResults) => {
                const manualResults = comboResults.slice(0, manualPromises.length);
                const enbsResults = comboResults.slice(manualPromises.length);
                manualFactory.processManualInputs(manualResults, manualConfirmResults);
                enbs.processManualInputs(enbsResults, enbsConfirmResults);
                return [result, manualConfirmResults, enbsConfirmResults];
            });
        }).catch((err) => {
            Logger.displayError("while reading confirmed trips", err);
            return [{}, {}];
        });
    };

    // DB entries retrieved from the server have '_id', 'metadata', and 'data' fields.
    // This function returns a shallow copy of the obj, which flattens the
    // 'data' field into the top level, while also including '_id' and 'metadata.key'
    const unpack = (obj) => ({
      ...obj.data,
      _id: obj._id,
      key: obj.metadata.key
    });

    timeline.readAllCompositeTrips = function(startTs, endTs) {
      $ionicLoading.show({
        template: $translate.instant('service.reading-server')
      });
      const readPromises = [
        CommHelper.getRawEntries(["analysis/composite_trip"],
            startTs, endTs, "data.end_ts"),
      ];
      return Promise.all(readPromises)
        .then(([ctList]) => {
            $ionicLoading.hide();
            return ctList.phone_data.map((ct) => {
              const unpackedCt = unpack(ct);
              return {
                ...unpackedCt,
                origin_key: ct.metadata.origin_key,
                start_confirmed_place: unpack(unpackedCt.start_confirmed_place),
                end_confirmed_place: unpack(unpackedCt.end_confirmed_place),
                locations: unpackedCt.locations?.map(unpack),
                sections: unpackedCt.sections?.map(unpack),
              }
            });
        })
        .catch((err) => {
            Logger.displayError("while reading confirmed trips", err);
            $ionicLoading.hide();
            return [];
        });
    };

    timeline.updateFromDatabase = function(day) {
      console.log("About to show 'Reading from cache'");
      $ionicLoading.show({
        template: $translate.instant('service.reading-cache')
      });
      return window.cordova.plugins.BEMUserCache.getDocument(getKeyForDate(day), false)
      .then(function (timelineDoc) {
         if (!window.cordova.plugins.BEMUserCache.isEmptyDoc(timelineDoc)) {
           var tripList = timelineDoc;
           console.log("About to hide 'Reading from cache'");
           $ionicLoading.hide();
           return tripList;
         } else {
           console.log("while reading data for "+day+" from database, no records found");
           console.log("About to hide 'Reading from cache'");
           $ionicLoading.hide();
           return [];
         }
       });
    };

    timeline.updateFromServer = function(day) {
      console.log("About to show 'Reading from server'");
      $ionicLoading.show({
        template: $translate.instant('service.reading-server')
      });
      return CommHelper.getTimelineForDay(day).then(function(response) {
        var tripList = response.timeline;
        window.Logger.log(window.Logger.LEVEL_DEBUG,
          "while reading data for "+day+" from server, got nTrips = "+tripList.length);
        console.log("About to hide 'Reading from server'");
        $ionicLoading.hide();
        console.log("Finished hiding ionicLoading, returning list of size "+tripList.length);
        return tripList;
     });
    };

    /*
     * Used for quick debugging using the live updating server. But then I
     * can't use plugins, so we read from the local file system instead. Should
     * be replaced by a mock of the usercache instead, but this is code
     * movement, not restructuring, so it should stay here.
     */
     var readAndUpdateFromFile = function(day, foundFn, notFoundFn) {
      console.log("About to show 'Reading from local file'");
      $ionicLoading.show({
        template: 'Debugging: Reading from local file...'
      });
      return $http.get("test_data/"+getKeyForDate(day)).then(function(response) {
       console.log("while reading data for "+day+" from file, status = "+response.status);
       tripList = response.data;
       return tripList;
     });
    };

    timeline.isProcessingComplete = function(day) {
      return CommHelper.getPipelineCompleteTs().then(function(result) {
          var eod = moment(day).endOf("day").unix();
          var retVal = (result.complete_ts > eod);
          Logger.log("complete_ts = "
              +result.complete_ts+"("+moment.unix(result.complete_ts).toString()+")"
              +" end of current day = "
              +eod+"("+moment.unix(eod).toString()+")"
              +" retVal = "+retVal);
          return [result.complete_ts, retVal];
      });
    }

    /*
     * This is going to be a bit tricky. As we can see from
     * https://github.com/e-mission/e-mission-phone/issues/214#issuecomment-286279163,
     * when we read local transitions, they have a string for the transition
     * (e.g. `T_DATA_PUSHED`), while the remote transitions have an integer
     * (e.g. `2`).
     * See https://github.com/e-mission/e-mission-phone/issues/214#issuecomment-286338606
     * 
     * Also, at least on iOS, it is possible for trip end to be detected way
     * after the end of the trip, so the trip end transition of a processed
     * trip may actually show up as an unprocessed transition.
     * See https://github.com/e-mission/e-mission-phone/issues/214#issuecomment-286279163
     * 
     * Let's abstract this out into our own minor state machine.
     */
    var transitions2Trips = function(transitionList) {
        var inTrip = false;
        var tripList = []
        var currStartTransitionIndex = -1;
        var currEndTransitionIndex = -1;
        var processedUntil = 0;
       
        while(processedUntil < transitionList.length) { 
          // Logger.log("searching within list = "+JSON.stringify(transitionList.slice(processedUntil)));
          if(inTrip == false) {
              var foundStartTransitionIndex = transitionList.slice(processedUntil).findIndex(isStartingTransition);
              if (foundStartTransitionIndex == -1) {
                  Logger.log("No further unprocessed trips started, exiting loop");
                  processedUntil = transitionList.length;
              } else {
                  currStartTransitionIndex = processedUntil + foundStartTransitionIndex;
                  processedUntil = currStartTransitionIndex;
                  Logger.log("Unprocessed trip started at "+JSON.stringify(transitionList[currStartTransitionIndex]));
                  inTrip = true;
              }
          } else {
              // Logger.log("searching within list = "+JSON.stringify(transitionList.slice(processedUntil)));
              var foundEndTransitionIndex = transitionList.slice(processedUntil).findIndex(isEndingTransition);
              if (foundEndTransitionIndex == -1) {
                  Logger.log("Can't find end for trip starting at "+JSON.stringify(transitionList[currStartTransitionIndex])+" dropping it");
                  processedUntil = transitionList.length;
              } else {
                  currEndTransitionIndex = processedUntil + foundEndTransitionIndex;
                  processedUntil = currEndTransitionIndex;
                  Logger.log("currEndTransitionIndex = "+currEndTransitionIndex);
                  Logger.log("Unprocessed trip starting at "+JSON.stringify(transitionList[currStartTransitionIndex])+" ends at "+JSON.stringify(transitionList[currEndTransitionIndex]));
                  tripList.push([transitionList[currStartTransitionIndex],
                                 transitionList[currEndTransitionIndex]])  
                  inTrip = false;
              }
          }
        }
        return tripList;
    }

    var isStartingTransition = function(transWrapper) {
        // Logger.log("isStartingTransition: transWrapper.data.transition = "+transWrapper.data.transition);
        if(transWrapper.data.transition == 'local.transition.exited_geofence' ||
            transWrapper.data.transition == 'T_EXITED_GEOFENCE' ||
            transWrapper.data.transition == 1) {
            // Logger.log("Returning true");
            return true;
        }
        // Logger.log("Returning false");
        return false;
    }

    var isEndingTransition = function(transWrapper) {
        // Logger.log("isEndingTransition: transWrapper.data.transition = "+transWrapper.data.transition);
        if(transWrapper.data.transition == 'T_TRIP_ENDED' ||
            transWrapper.data.transition == 'local.transition.stopped_moving' || 
            transWrapper.data.transition == 2) {
            // Logger.log("Returning true");
            return true;
        }
        // Logger.log("Returning false");
        return false;
    }

    /*
     * Fill out place geojson after pulling trip location points.
     * Place is only partially filled out because we haven't linked the timeline yet
     */

    var moment2localdate = function(currMoment, tz) {
        return {
            timezone: tz,
            year: currMoment.year(),
            //the months of the draft trips match the one format needed for
            //moment function however now that is modified we need to also
            //modify the months value here
            month: currMoment.month() + 1,
            day: currMoment.date(),
            weekday: currMoment.weekday(),
            hour: currMoment.hour(),
            minute: currMoment.minute(),
            second: currMoment.second()
        };
    }

    var startPlacePropertyFiller = function(locationPoint) {
      var locationMoment = moment.unix(locationPoint.data.ts).tz(locationPoint.metadata.time_zone);
      // properties that need to be filled in while stitching together
      // duration, ending_trip, enter_*
      return {
        "exit_fmt_time": locationMoment.format(),
        "exit_local_dt": moment2localdate(locationMoment, locationPoint.metadata.time_zone),
        "exit_ts": locationPoint.data.ts,
        "feature_type": "start_place",
        "raw_places": [],
        "source": "unprocessed"
      }
    }

    var endPlacePropertyFiller = function(locationPoint) {
      var locationMoment = moment.unix(locationPoint.data.ts).tz(locationPoint.metadata.time_zone);
      // properties that need to be filled in while stitching together
      // duration, starting_trip, exit_*
      return {
        "enter_fmt_time": locationMoment.format(),
        "enter_local_dt": moment2localdate(locationMoment, locationPoint.metadata.time_zone),
        "enter_ts": locationPoint.data.ts,
        "feature_type": "end_place",
        "raw_places": [],
        "source": "unprocessed"
      }
    }

    var place2Geojson = function(trip, locationPoint, propertyFiller) {
      var place_gj = {
        "id": "unprocessed_"+locationPoint.data.ts,
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [locationPoint.data.longitude, locationPoint.data.latitude]
        },
        "properties": propertyFiller(locationPoint)
      }
      return place_gj;
    }

    var points2TripProps = function(locationPoints) {
      var startPoint = locationPoints[0];
      var endPoint = locationPoints[locationPoints.length - 1];
      var tripAndSectionId = "unprocessed_"+startPoint.data.ts+"_"+endPoint.data.ts;
      var startMoment = moment.unix(startPoint.data.ts).tz(startPoint.metadata.time_zone);
      var endMoment = moment.unix(endPoint.data.ts).tz(endPoint.metadata.time_zone);

      const speeds = [], dists = [];
      let loc, locLatLng;
      locationPoints.forEach((pt) => {
        const ptLatLng = L.latLng([pt.data.latitude, pt.data.longitude]);
        if (loc) {
          const dist = locLatLng.distanceTo(ptLatLng);
          const timeDelta = pt.data.ts - loc.data.ts;
          dists.push(dist);
          speeds.push(dist / timeDelta);
        }
        loc = pt;
        locLatLng = ptLatLng;
      });
      
      const locations = locationPoints.map((point, i) => ({
          loc: {
            coordinates: [point.data.longitude, point.data.latitude]
          },
          ts: point.data.ts,
          speed: speeds[i],
      }));

      return {
        _id: {$oid: tripAndSectionId},
        key: "UNPROCESSED_trip",
        origin_key: "UNPROCESSED_trip",
        additions: [],
        distance: dists.reduce((a, b) => a + b, 0),
        duration: endPoint.data.ts - startPoint.data.ts,
        end_fmt_time: endMoment.format(),
        end_local_dt: moment2localdate(endMoment),
        end_ts: endPoint.data.ts,
        locations: locations,
        sensed_mode: "UNPROCESSED",
        source: "unprocessed",
        // speeds: speeds,
        start_fmt_time: startMoment.format(),
        start_local_dt: moment2localdate(startMoment),
        start_ts: startPoint.data.ts,
        // times: times,
        inferred_labels: [],
        expectation: 0,
        confidence_threshold: 0,
        user_input: {},
      }
    }

    var tsEntrySort = function(e1, e2) {
      // compare timestamps
      return e1.data.ts - e2.data.ts;
    }

    var confirmedPlace2Geojson = function(trip, locationPoint, featureType) {
        var place_gj = {
        "type": "Feature",
        "geometry": locationPoint,
        "properties": {
            "feature_type": featureType
        }
      }
      return place_gj;
    }

    var confirmedPoints2Geojson = function(trip, locationList) {
      let sectionsPoints;
      if (!trip.sections) {
        sectionsPoints = [locationList];
      } else {
        sectionsPoints = trip.sections.map((s) =>
            trip.locations.filter((l) =>
              l.ts >= s.start_ts && l.ts <= s.end_ts
            )
        );
      }

      return sectionsPoints.map((sectionPoints, i) => {
        const section = trip.sections?.[i];
        return {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: sectionPoints.map((pt) => pt.loc.coordinates)
          },
          style: {
            color: MotionTypes[section?.sensed_mode]?.color || "#333",
          }
        }
      });
    }

    timeline.compositeTrip2Geojson = function(trip) {
      if (trip == undefined) {
        return undefined;
      }

      Logger.log("Reading trip's " + trip.locations.length + " location points at " + (new Date()));
      var features = [
        confirmedPlace2Geojson(trip, trip.start_loc, "start_place"),
        confirmedPlace2Geojson(trip, trip.end_loc, "end_place"),
        ...confirmedPoints2Geojson(trip, trip.locations)
      ];

      return {
        data: {
          id: "confirmed" + trip.start_ts,
          type: "FeatureCollection",
          features: features,
          properties: {
            start_ts: trip.start_ts,
            end_ts: trip.end_ts
          }
        },
        style: (feature) => feature.style
      }
    }

    var transitionTrip2TripObj = function(trip) {
      var tripStartTransition = trip[0];
      var tripEndTransition = trip[1];
      var tq = {key: "write_ts",
         startTs: tripStartTransition.data.ts,
         endTs: tripEndTransition.data.ts
      }
      Logger.log("About to pull location data for range "
        + moment.unix(tripStartTransition.data.ts).toString() + " -> " 
        + moment.unix(tripEndTransition.data.ts).toString());
      return UnifiedDataLoader.getUnifiedSensorDataForInterval("background/filtered_location", tq).then(function(locationList) {
          if (locationList.length == 0) {
            return undefined;
          }
          var sortedLocationList = locationList.sort(tsEntrySort);
          var retainInRange = function(loc) {
            return (tripStartTransition.data.ts <= loc.data.ts) && 
                    (loc.data.ts <= tripEndTransition.data.ts)
          }

          var filteredLocationList = sortedLocationList.filter(retainInRange);

          // Fix for https://github.com/e-mission/e-mission-docs/issues/417
          if (filteredLocationList.length == 0) {
            return undefined;
          }

          var tripStartPoint = filteredLocationList[0];
          var tripEndPoint = filteredLocationList[filteredLocationList.length-1];
          Logger.log("tripStartPoint = "+JSON.stringify(tripStartPoint)+"tripEndPoint = "+JSON.stringify(tripEndPoint));
          // if we get a list but our start and end are undefined
          // let's print out the complete original list to get a clue
          // this should help with debugging 
          // https://github.com/e-mission/e-mission-docs/issues/417
          // if it ever occurs again
          if (angular.isUndefined(tripStartPoint) || angular.isUndefined(tripEndPoint)) {
            Logger.log("BUG 417 check: locationList = "+JSON.stringify(locationList));
            Logger.log("transitions: start = "+JSON.stringify(tripStartTransition.data)
                + " end = "+JSON.stringify(tripEndTransition.data.ts));
          }

          const tripProps = points2TripProps(filteredLocationList);

          return {
            ...tripProps,
            start_loc: tripStartPoint.data.loc,
            end_loc: tripEndPoint.data.loc,
          }
        });
    }

    var linkTrips = function(trip1, trip2) {
        // complete trip1
        trip1.starting_trip = {$oid: trip2.id};
        trip1.exit_fmt_time = trip2.enter_fmt_time;
        trip1.exit_local_dt = trip2.enter_local_dt;
        trip1.exit_ts = trip2.enter_ts;

        // start trip2
        trip2.ending_trip = {$oid: trip1.id};
        trip2.enter_fmt_time = trip1.exit_fmt_time;
        trip2.enter_local_dt = trip1.exit_local_dt;
        trip2.enter_ts = trip1.exit_ts;
    }

    timeline.readUnprocessedTrips = function(startTs, endTs, processedTripList) {
        $ionicLoading.show({
          template: $translate.instant('service.reading-unprocessed-data')
        });

       var tq = {key: "write_ts",
          startTs,
          endTs
       }
       Logger.log("about to query for unprocessed trips from "
         +moment.unix(tq.startTs).toString()+" -> "+moment.unix(tq.endTs).toString());
       return UnifiedDataLoader.getUnifiedMessagesForInterval("statemachine/transition", tq)
        .then(function(transitionList) {
          if (transitionList.length == 0) {
            Logger.log("No unprocessed trips. yay!");
            $ionicLoading.hide();
            return [];
          } else {
            Logger.log("Found "+transitionList.length+" transitions. yay!");
            var sortedTransitionList = transitionList.sort(tsEntrySort);
            /*
            sortedTransitionList.forEach(function(transition) {
                console.log(moment(transition.data.ts * 1000).format()+":" + JSON.stringify(transition.data));
            });
            */
            var tripsList = transitions2Trips(transitionList);
            Logger.log("Mapped into"+tripsList.length+" trips. yay!");
            tripsList.forEach(function(trip) {
                console.log(JSON.stringify(trip));
            });
            var tripFillPromises = tripsList.map(transitionTrip2TripObj);
            return Promise.all(tripFillPromises).then(function(raw_trip_gj_list) {
                // Now we need to link up the trips. linking unprocessed trips
                // to one another is fairly simple, but we need to link the
                // first unprocessed trip to the last processed trip.
                // This might be challenging if we don't have any processed
                // trips for the day. I don't want to go back forever until 
                // I find a trip. So if this is the first trip, we will start a
                // new chain for now, since this is with unprocessed data
                // anyway.

                Logger.log("mapped trips to trip_gj_list of size "+raw_trip_gj_list.length);
                var trip_gj_list = raw_trip_gj_list.filter(angular.isDefined);
                Logger.log("after filtering undefined, trip_gj_list size = "+raw_trip_gj_list.length);
                // Link 0th trip to first, first to second, ...
                for (var i = 0; i < trip_gj_list.length-1; i++) {
                    linkTrips(trip_gj_list[i], trip_gj_list[i+1]);
                }
                Logger.log("finished linking trips for list of size "+trip_gj_list.length);
                if (processedTripList.length != 0 && trip_gj_list.length != 0) {
                    // Need to link the entire chain above to the processed data
                    Logger.log("linking unprocessed and processed trip chains");
                    var last_processed_trip = processedTripList.slice(-1);
                    linkTrips(last_processed_trip, trip_gj_list[0]);
                }
                $ionicLoading.hide();
                Logger.log("Returning final list of size "+trip_gj_list.length);
                return trip_gj_list;
            });
          }
        });
    }

    var processOrDisplayNone = function(day, tripList) {
      if (angular.isDefined(tripList) && tripList.length != 0) {
        console.log("trip count = "+tripList.length+", calling processTripsForDay");
        processTripsForDay(day, tripList);
      } else {
        console.log("No trips found, alerting user");
        timeline.data.currDay = day;
        timeline.data.currDayTrips = []
        timeline.data.currDaySummary = {}
        $rootScope.$emit(timeline.UPDATE_DONE, {'from': 'emit', 'status': 'error'});
        $rootScope.$broadcast(timeline.UPDATE_DONE, {'from': 'broadcast', 'status': 'error'});
      }
    }

    var localCacheReadFn = timeline.updateFromDatabase;

    var addUnprocessedTrips = function(processedTripList, day, completeStatus) {
        var tripList = processedTripList;
        if (!completeStatus) {
          return timeline.readUnprocessedTrips(day, processedTripList)
            .then(function(unprocessedTripList) {
              Logger.log("tripList.length = "+tripList.length
                         +"unprocessedTripList.length = "+unprocessedTripList.length);
              Array.prototype.push.apply(tripList, unprocessedTripList);
              console.log("After merge, returning trip list of size "+tripList.length);
              return tripList;
            });
        } else {
            return tripList;
        }
    }

    var readTripsAndUnprocessedInputs = function(day, tripReadFn, completeStatus, tq) {
      console.log("Reading values for list ", manualInputFactory.MANUAL_KEYS);
      var manualPromises = manualInputFactory.MANUAL_KEYS.map(function(inp_key) {
        return UnifiedDataLoader.getUnifiedMessagesForInterval(
            inp_key, tq).then(manualInputFactory.extractResult);
      });
      let tripsReadPromise = tripReadFn(day);
      timeline.data.unifiedConfirmsResults = {};
      let allManualPromise = Promise.all(manualPromises).then((manualResults) =>
        manualInputFactory.processManualInputs(manualResults, timeline.data.unifiedConfirmsResults));

      let allTripsPromise = tripsReadPromise.then((processedTripList) => {
        console.log("Reading trips from server finished successfully with length "
          +processedTripList.length+" completeStatus = "+completeStatus);
        return addUnprocessedTrips(processedTripList, day, completeStatus);
      }).then((combinedTripList) => processOrDisplayNone(day, combinedTripList));
      return Promise.all([allManualPromise, allTripsPromise]).then(() => {
        console.log("Finished reading processed/unprocessed trips with length "
            +timeline.data.currDayTrips.length);
      });
    }

    // Functions
    timeline.updateForDay = function(day) { // currDay is a moment
      // First, we try the server
      var isProcessingCompletePromise = timeline.isProcessingComplete(day);

      // First get the pipeline complete timestamp
      isProcessingCompletePromise.then(([completeTs, completeStatus]) => {
          // then, in parallel, read unprocessed user inputs
          // and trips
          // Also mode/purpose and (currently disabled) survey answers
          var pendingTq = {
             key: "write_ts",
             startTs: completeTs,
             endTs: moment().unix()
          };
          readTripsAndUnprocessedInputs(day, timeline.updateFromServer,
                completeStatus, pendingTq)
          .catch(function(error) {
            // If there is any error reading from the server, we fallback on the local cache
            Logger.log("while reading data from server for "+day +" error = "+JSON.stringify(error));
            console.log("About to hide loading overlay");
            $ionicLoading.hide();

            // Also mode/purpose and (currently disabled) survey answers
            let allTq = $window.cordova.plugins.BEMUserCache.getAllTimeQuery();
            readTripsAndUnprocessedInputs(day, localCacheReadFn, undefined, allTq)
            .catch(function(error) {
              console.log("About to hide loading overlay");
              $ionicLoading.hide();
              Logger.displayError("while reading data from cache for "+day, error);
            })
        });
     });
    }

      timeline.getTrip = function(tripId) {
        return angular.isDefined(timeline.data.tripMap)? timeline.data.tripMap[tripId] : undefined;
      };

      timeline.getTripWrapper = function(tripId) {
        return angular.isDefined(timeline.data.tripWrapperMap)? timeline.data.tripWrapperMap[tripId] : undefined;
      };

      timeline.getCompositeTrip = function(tripId) {
        return angular.isDefined(timeline.data.infScrollCompositeTripMap)? timeline.data.infScrollCompositeTripMap[tripId] : undefined;
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
          if (angular.isDefined(trip.start_place.properties.display_name)) {
            if (trip.start_place.properties.display_name != ", ") {
                console.log("Already have display name "+ trip.start_place.properties.display_name +" for start_place")
            } else {
                console.log("Got display name "+ trip.start_place.properties.display_name +" for start_place, but it is blank, trying OSM nominatim now...");
                CommonGraph.getDisplayName(trip.start_place.geometry).then((name) => {trip.start_place.properties.display_name = name;});
            }
          } else {
            console.log("Don't have display name for start place, going to query nominatim")
            CommonGraph.getDisplayName(trip.start_place.geometry).then((name) => {trip.start_place.properties.display_name = name;});
          }
          if (angular.isDefined(trip.end_place.properties.display_name)) {
            if (trip.end_place.properties.display_name != ", ") {
                console.log("Already have display name " + trip.end_place.properties.display_name + " for end_place")
            } else {
                console.log("Got display name "+ trip.end_place.properties.display_name +" for end_place, but it is blank, trying OSM nominatim now...");
                CommonGraph.getDisplayName(trip.end_place.geometry).then((name) => {trip.end_place.properties.display_name = name;});
            }
          } else {
            console.log("Don't have display name for end place, going to query nominatim")
            CommonGraph.getDisplayName(trip.end_place.geometry).then((name) => {trip.end_place.properties.display_name = name;});
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

    timeline.setTripWrappers = function(tripWrapperList) {
        timeline.data.currDayTripWrappers = tripWrapperList;

        timeline.data.tripWrapperMap = {};

        timeline.data.currDayTripWrappers.forEach(function(tripw, index, array) {
          timeline.data.tripWrapperMap[tripw.data.id] = tripw;
        });
    }

    timeline.setInfScrollCompositeTripList = function(compositeTripList) {
        timeline.data.infScrollCompositeTripList = compositeTripList;

        timeline.data.infScrollCompositeTripMap = {};

        timeline.data.infScrollCompositeTripList.forEach(function(trip, index, array) {
          timeline.data.infScrollCompositeTripMap[trip._id.$oid] = trip;
        });
    }

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

    return timeline;
  })

