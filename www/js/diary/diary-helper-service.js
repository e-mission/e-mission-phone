'use strict';

angular.module('emission.main.diary.helper.service', [
  'emission.plugin.logger',
  'emission.services', 'emission.main.common.services',
  'emission.enketo-survey.services',
  'emission.incident.posttrip.manual',
])
.factory('DiaryHelper', function (CommonGraph, PostTripManualMarker) {
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

  dh.getFormattedDate = function (ts) {
    var d = moment(ts * 1000).format("DD MMMM YYYY");
    return d;
  };

  dh.isCommon = function (id) {
    var ctrip = CommonGraph.trip2Common(id);
    return !angular.isUndefined(ctrip);
  };

  dh.getIcon = function (section) {
    var icons = {
      "BICYCLING": "ion-android-bicycle",
      "WALKING": " ion-android-walk",
      "RUNNING": " ion-android-walk",
      "IN_VEHICLE": "ion-speedometer",
      "BUS": "ion-android-bus",
      "TRAIN": "ion-android-train",
      "CAR": "ion-android-car",
      "UNKNOWN": "ion-ios-help",
      "UNPROCESSED": "ion-ios-help",
      "AIR_OR_HSR": "ion-plane",
    };
    return icons[dh.getHumanReadable(section.properties.sensed_mode)];
  };

  dh.getHumanReadable = function (sensed_mode) {
    var ret_string = sensed_mode.split('.')[1];
    if (ret_string == 'ON_FOOT') {
      return 'WALKING';
    } else {
      return ret_string;
    }
  };

  // Temporary function to avoid repear in getPercentages ret val.
  var filterRunning = function (mode) {
    if (mode == 'RUNNING') {
      return 'WALKING';
    } else {
      return mode;
    }
  };

  dh.getPercentages = function (trip) {
    var rtn0 = []; // icons
    var rtn1 = []; //percentages

    var icons = {
      "BICYCLING": "ion-android-bicycle",
      "WALKING": "ion-android-walk",
      // "RUNNING":" ion-android-walk",
      //  RUNNING has been filtered in function above
      "IN_VEHICLE": "ion-speedometer",
      "BUS": "ion-android-bus",
      "TRAIN": "ion-android-train",
      "CAR": "ion-android-car",
      "UNKNOWN": "ion-ios-help",
      "UNPROCESSED": "ion-ios-help",
      "AIR_OR_HSR": "ion-plane",
    }
    var total = 0;
    for (var i = 0; i < trip.sections.length; i++) {
      if (rtn0.indexOf(filterRunning(dh.getHumanReadable(trip.sections[i].properties.sensed_mode))) == -1) {
        rtn0.push(filterRunning(dh.getHumanReadable(trip.sections[i].properties.sensed_mode)));
        rtn1.push(trip.sections[i].properties.distance);
        total += trip.sections[i].properties.distance;
      } else {
        rtn1[rtn0.indexOf(filterRunning(dh.getHumanReadable(trip.sections[i].properties.sensed_mode)))] += trip.sections[i].properties.distance;
        total += trip.sections[i].properties.distance;
      }
    }
    for (var i = 0; i < rtn0.length; i++) {
      rtn0[i] = "icon " + icons[rtn0[i]];
      rtn1[i] = Math.floor((rtn1[i] / total) * 100);
    }
    return [rtn0, rtn1];
  };

  dh.starColor = function (num) {
    if (num >= 3) {
      return 'yellow';
    } else {
      return 'transparent';
    }
  };

  dh.isDraft = function (tripgj) {
    if (// tripgj.data.features.length == 3 && // reinstate after the local and remote paths are unified
      angular.isDefined(tripgj.data.features[2].features) &&
      tripgj.data.features[2].features[0].properties.feature_type == "section" &&
      tripgj.data.features[2].features[0].properties.sensed_mode == "MotionTypes.UNPROCESSED") {
      return true;
    } else {
      return false;
    }
  };

  dh.getTripBackground = function (tripgj) {
    var background = "bg-light";
    if (dh.isDraft(tripgj)) {
      background = "bg-unprocessed";
    }
    return background;
  };

  dh.allModes = function (trip) {
    var rtn = [];
    var icons = {
      "BICYCLING": "ion-android-bicycle",
      "WALKING": "ion-android-walk",
      "RUNNING": "ion-android-walk",
      "IN_VEHICLE": "ion-speedometer",
      "CAR": "ion-android-car",
      "BUS": "ion-android-bus",
      "TRAIN": "ion-android-train",
      "UNKNOWN": "ion-ios-help",
      "UNPROCESSED": "ion-ios-help",
      "AIR_OR_HSR": "ion-plane"
    }
    for (var i = 0; i < trip.sections.length; i++) {
      if (rtn.indexOf(dh.getHumanReadable(trip.sections[i].properties.sensed_mode)) == -1) {
        rtn.push(dh.getHumanReadable(trip.sections[i].properties.sensed_mode));
      }
    }
    for (var i = 0; i < rtn.length; i++) {
      rtn[i] = "icon " + icons[rtn[i]];
    }
    return rtn;
  };

  dh.getKmph = function (section) {
    var metersPerSec = section.properties.distance / section.properties.duration;
    return (metersPerSec * 3.6).toFixed(2);
  };

  dh.getFormattedDistance = function (dist_in_meters) {
    if (dist_in_meters > 1000) {
      return (dist_in_meters / 1000).toFixed(0);
    } else {
      return (dist_in_meters / 1000).toFixed(3);
    }
  };

  dh.getSectionDetails = function (section) {
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

  dh.getLocalTimeString = function (dt) {
    var hr = ((dt.hour > 12)) ? dt.hour - 12 : dt.hour;
    var post = ((dt.hour >= 12)) ? " pm" : " am";
    var min = (dt.minute.toString().length == 1) ? "0" + dt.minute.toString() : dt.minute.toString();
    return hr + ":" + min + post;
  };

  dh.getFormattedTime = function (ts_in_secs) {
    if (angular.isDefined(ts_in_secs)) {
      return moment(ts_in_secs * 1000).format('LT');
    } else {
      return "---";
    }
  };

  dh.getFormattedTimeRange = function (end_ts_in_secs, start_ts_in_secs) {
    var startMoment = moment(start_ts_in_secs * 1000);
    var endMoment = moment(end_ts_in_secs * 1000);
    return endMoment.to(startMoment, true);
  };

  dh.getFormattedDuration = function (duration_in_secs) {
    return moment.duration(duration_in_secs * 1000).humanize()
  };

  dh.getTripDetails = function (trip) {
    return (trip.sections.length) + " sections";
  };

  dh.getEarlierOrLater = function (ts, id) {
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
  };

  dh.getArrowClass = function (i) {
    if (i == -1) {
      return 'icon ion-arrow-down-c';
    } else if (i == 0) {
      return '';
    } else {
      return 'icon ion-arrow-up-c';
    }
  };

  dh.getLongerOrShorter = function (trip, id) {
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
  };

  dh.average = function (array) {
    if (array.length == 0) {
      // We want to special case the handling of the array length because
      // otherwise we will get a divide by zero error and the dreaded nan
      return null;
    }
    // check out cool use of reduce and arrow functions!
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/Reduce
    // Hm, arrow functions don't work, but reduce does!
    var sum = array.reduce(function (previousValue, currentValue, currentIndex, array) {
      return previousValue + currentValue;
    });
    return sum / array.length
  };

  dh.arrowColor = function (pn) {
    if (pn == 0) {
      return 'transparent';
    } else if (pn == -1) {
      return '#33e0bb';
    } else {
      return '#ff5251';
    }
  };

  dh.parseEarlierOrLater = function (val) {
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
  };

  dh.fillCommonTripCount = function (tripWrapper) {
    var cTrip = CommonGraph.trip2Common(tripWrapper.data.id);
    if (!angular.isUndefined(cTrip)) {
      tripWrapper.common.count = cTrip.trips.length;
    }
  };

  dh.directiveForTrip = function (trip) {
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
    "walk", "bicycle", "car", "bus", "train", "unicorn"
  ];

  dh.showModes = function (section) {
    return function () {
      var currMode = dh.getHumanReadable(section.properties.sensed_mode);
      var currButtons = [{ text: "<b>" + currMode + "</b>" }];
      dh.userModes.forEach(function (item, index, array) {
        if (item != currMode) {
          currButtons.push({ text: item });
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

  var style_feature = function (feature) {
    switch (feature.properties.feature_type) {
      case "section": return style_section(feature);
      case "stop": return style_stop(feature);
      default: return {}
    }
  };

  var showClickTime = function (feature, layer) {
    return layer.bindPopup("click: " + dh.getFormattedTime(feature.properties.ts));
  };

  var onEachFeature = function (feature, layer) {
    // console.log("onEachFeature called with "+JSON.stringify(feature));
    switch (feature.properties.feature_type) {
      case "stop": layer.bindPopup("" + feature.properties.duration); break;
      case "start_place": layer.bindPopup("" + feature.properties.display_name); break;
      case "end_place": layer.bindPopup("" + feature.properties.display_name); break;
      case "section": layer.on('click',
        PostTripManualMarker.startAddingIncidentToSection(feature, layer)); break;
      case "incident": PostTripManualMarker.displayIncident(feature, layer); break;
    }
  };

  dh.pointFormat = function (feature, latlng) {
    switch (feature.properties.feature_type) {
      case "start_place": return L.marker(latlng, { icon: startIcon });
      case "end_place": return L.marker(latlng, { icon: stopIcon });
      case "stop": return L.circleMarker(latlng);
      case "incident": return PostTripManualMarker.incidentMarker(feature, latlng);
      case "location": return L.marker(latlng, { icon: pointIcon });
      default: alert("Found unknown type in feature" + feature); return L.marker(latlng)
    }
  };

  var pointIcon = L.divIcon({ className: 'leaflet-div-icon', iconSize: [0, 0] });
  var startIcon = L.divIcon({ className: 'leaflet-div-icon-start', iconSize: [12, 12], html: '<div class="inner-icon">' });
  var stopIcon = L.divIcon({ className: 'leaflet-div-icon-stop', iconSize: [12, 12], html: '<div class="inner-icon">' });

  var style_stop = function (feature) {
    return { fillColor: 'yellow', fillOpacity: 0.8 };
  };

  var getColoredStyle = function (baseDict, color) {
    baseDict.color = color;
    return baseDict
  };

  var style_section = function (feature) {
    var baseDict = {
      weight: 5,
      opacity: 1,
    };
    var mode_string = dh.getHumanReadable(feature.properties.sensed_mode);
    switch (mode_string) {
      case "WALKING": return getColoredStyle(baseDict, 'brown');
      case "RUNNING": return getColoredStyle(baseDict, 'brown');
      case "BICYCLING": return getColoredStyle(baseDict, 'green');
      case "IN_VEHICLE": return getColoredStyle(baseDict, 'purple');
      case "TRAIN": return getColoredStyle(baseDict, 'skyblue');
      case "BUS": return getColoredStyle(baseDict, 'navy');
      case "CAR": return getColoredStyle(baseDict, 'salmon');
      case "UNKNOWN": return getColoredStyle(baseDict, 'orange');
      case "UNPROCESSED": return getColoredStyle(baseDict, 'orange');
      case "AIR_OR_HSR": return getColoredStyle(baseDict, 'red');
      default: return getColoredStyle(baseDict, 'black');
    }
  };

  var printUserInput = function (ui) {
    // Type: Survey Answer
    if (angular.isDefined(ui.data.trip_properties)) {
      return ui.data.trip_properties.start_ts + " -> " + ui.data.trip_properties.end_ts +
        " logged at " + ui.metadata.write_ts;
    }

    // Default: Mode / Purpose
    return ui.data.start_ts + " -> " + ui.data.end_ts +
      " " + ui.data.label + " logged at " + ui.metadata.write_ts;
  };

  dh.getUserInputForTrip = function (tripProp, userInputList) {
    var potentialCandidates = userInputList.filter(function (userInput) {
      // Type: Survey Answer
      if (angular.isDefined(userInput.data.trip_properties)) {
        return userInput.data.trip_properties.start_ts >= tripProp.start_ts &&
          userInput.data.trip_properties.end_ts <= tripProp.end_ts;
      }

      // Default: Mode / Purpose
      return userInput.data.start_ts >= tripProp.start_ts &&
        userInput.data.end_ts <= tripProp.end_ts;
    });
    if (potentialCandidates.length === 0) {
      Logger.log("In getUserInputForTripStartEnd, no potential candidates, returning []");
      return undefined;
    }

    if (potentialCandidates.length === 1) {
      Logger.log("In getUserInputForTripStartEnd, one potential candidate, returning  " + printUserInput(potentialCandidates[0]));
      return potentialCandidates[0];
    }

    Logger.log("potentialCandidates are " + potentialCandidates.map(printUserInput));
    var sortedPC = potentialCandidates.sort(function (pc1, pc2) {
      return pc2.metadata.write_ts - pc1.metadata.write_ts;
    });
    var mostRecentEntry = sortedPC[0];
    Logger.log("Returning mostRecentEntry " + printUserInput(mostRecentEntry));
    return mostRecentEntry;
  };

  return dh;
});
