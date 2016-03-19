angular.module('emission.main.diary.list',['ui-leaflet', 'nvd3ChartDirectives',
                                      'ionic-datepicker'])

.controller("DiaryListCtrl", function($window, $scope, $ionicPlatform, $state,
                                    $ionicScrollDelegate, $ionicPopup,
                                    $ionicLoading,
                                    $ionicActionSheet,
                                    leafletData, Timeline) {
  console.log("controller DiaryListCtrl called");

  var readAndUpdateForDay = function(day) {
    // This just launches the update. The update can complete in the background
    // based on the time when the database finishes reading.
    // TODO: Convert the usercache calls into promises so that we don't have to
    // do this juggling
    Timeline.updateForDay(day);
  };

  // readAndUpdateForDay(moment().startOf('day'));

  angular.extend($scope, {
      defaults: {
          zoomControl: false,
          dragging: false,
          zoomAnimation: true,
          touchZoom: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          boxZoom: false,
          tileLayer: 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          tileLayerOptions: {
              opacity: 0.9,
              detectRetina: true,
              reuseTiles: true,
          }
      }
  });

  moment.locale('en', {
    relativeTime : {
        future: "in %s",
        past:   "%s ago",
        s:  "secs",
        m:  "a min",
        mm: "%d m",
        h:  "an hr",
        hh: "%d h",
        d:  "a day",
        dd: "%d days",
        M:  "a month",
        MM: "%d months",
        y:  "a year",
        yy: "%d years"
    }
});

    /*
     * While working with dates, note that the datepicker needs a javascript date because it uses
     * setHours here, while the currDay is a moment, since we use it to perform
     * +date and -date operations.
     */

    $scope.setCurrDay = function(val) {
        if (typeof(val) === 'undefined') {
          window.Logger.log(window.Logger.LEVEL_INFO, 'No date selected');
        } else {
          window.Logger.log(window.Logger.LEVEL_INFO, 'Selected date is :' + val);
          readAndUpdateForDay(moment(val));
        }
    }

    $scope.datepickerObject = {
      titleLabel: 'Title',  //Optional
      todayLabel: 'Today',  //Optional
      closeLabel: 'Close',  //Optional
      setLabel: 'Set',  //Optional
      setButtonType : 'button-assertive',  //Optional
      todayButtonType : 'button-assertive',  //Optional
      closeButtonType : 'button-assertive',  //Optional
      inputDate: new Date(),  //Optional
      mondayFirst: true,  //Optional
      templateType: 'popup', //Optional
      showTodayButton: 'true', //Optional
      modalHeaderColor: 'bar-positive', //Optional
      modalFooterColor: 'bar-positive', //Optional
      callback: $scope.setCurrDay, //Mandatory
      dateFormat: 'dd-MMMM-yyyy', //Optional
      closeOnSelect: true, //Optional
    };

    $scope.$on(Timeline.UPDATE_DONE, function(event, args) {
      console.log("Got event with args "+JSON.stringify(args));
      $scope.$apply(function() {
          $scope.data = Timeline.data;
          $scope.datepickerObject.inputDate = Timeline.data.currDay.toDate();
          $scope.data.currDayTripWrappers = Timeline.data.currDayTrips.map(
            directiveForTrip);
          $ionicScrollDelegate.scrollTop(true);
      });
    });

    var directiveForTrip = function(trip) { 
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
      // Hardcoding to avoid repeated nominatim calls
      // retVal.start_place.properties.displayName = "Start";
      // retVal.start_place.properties.displayName = "End";
      return retVal;
    };

    var showNoTripsAlert = function() {
        var buttons = [
            {text: 'New', type: 'button-balanced', onTap: function(e) { $state.go('root.main.recent.log'); }},
            {text: 'Force', type: 'button-balanced', onTap: function(e) { $state.go('root.main.control'); }},
            {text: 'OK', type: 'button-balanced', onTap: function(e) { return; }},
        ];
        console.log("No trips found for day ");
        var alertPopup = $ionicPopup.show({
             title: 'No trips found!',
             template: "This is probably because you didn't go anywhere. You can also check",
             buttons: buttons
        });
        return alertPopup;
    }

    /*
     * Disabling the reload of the page on background sync because it doesn't
     * work correctly.  on iOS, plugins are not loaded if backgroundFetch or
     * remote push are invoked, since they don't initialize the app. On
     * android, it looks like the thread ends before the maps are fully loaded,
     * so we have half displayed, frozen maps. We should really check the
     * status, reload here if active and reload everything on resume.
     * For now, we just add a refresh button to avoid maintaining state.
    window.broadcaster.addEventListener( "edu.berkeley.eecs.emission.sync.NEW_DATA", function( e ) {
        window.Logger.log(window.Logger.LEVEL_INFO,
            "new data received! reload data for the current day"+$scope.data.currDay);
        $window.location.reload();
        // readAndUpdateForDay($scope.data.currDay);
    });
    */

    $scope.refresh = function() {
       readAndUpdateForDay(Timeline.data.currDay);
    }

    /* For UI control */
    $scope.groups = [];
    for (var i=0; i<10; i++) {
      $scope.groups[i] = {
        name: i,
        items: ["good1", "good2", "good3"]
      };
      for (var j=0; j<3; j++) {
        $scope.groups[i].items.push(i + '-' + j);
      }
    }
    $scope.toggleGroup = function(group) {
      if ($scope.isGroupShown(group)) {
        $scope.shownGroup = null;
      } else {
        $scope.shownGroup = group;
      }
    };
    $scope.isGroupShown = function(group) {
      return $scope.shownGroup === group;
    };

   $scope.getHumanReadable = function(sensed_mode) {
        ret_string = sensed_mode.split('.')[1];
        if(ret_string == 'ON_FOOT') {
            return 'WALKING';
        } else {
            return ret_string;
        }
      };

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


    $scope.userModes = [
        "walk", "bicycle", "car", "bus", "train", "unicorn"
    ];

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
        };

        $scope.getTimeSplit = function(tripList) {
            var retVal = {};
            var tripTimes = tripList.map(function(dt) {
                return dt.data.properties.duration;
            });

        };

        $scope.getTripHeightPixels = function(trip) {
            return trip.sections.length * 20 + 300+"px";
        };

        $scope.prevDay = function() {
            console.log("Called prevDay when currDay = "+Timeline.data.currDay.format('YYYY-MM-DD'));
            var prevDay = moment(Timeline.data.currDay).subtract(1, 'days');
            console.log("prevDay = "+prevDay.format('YYYY-MM-DD'));
            readAndUpdateForDay(prevDay);
        };

        $scope.nextDay = function() {
            console.log("Called nextDay when currDay = "+Timeline.data.currDay.format('YYYY-MM-DD'));
            var nextDay = moment(Timeline.data.currDay).add(1, 'days');
            console.log("nextDay = "+nextDay);
            readAndUpdateForDay(nextDay);
        };

        $scope.toDetail = function() {
          $state.go('root.main.detail');
        };

    /*
     * BEGIN: Functions for customizing our geojson display
     */

    $scope.showModes = function(section) {
        return function() {
            currMode = $scope.getHumanReadable(section.properties.sensed_mode);
            currButtons = [{ text: "<b>"+currMode+"</b>"}];
            $scope.userModes.forEach(function(item, index, array) {
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
            case "section": layer.setText($scope.getHumanReadable(feature.properties.sensed_mode), {offset: 20});
                layer.on('click', $scope.showModes(feature)); break;
            // case "location": layer.bindPopup(JSON.stringify(feature.properties)); break
        }
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
        mode_string = $scope.getHumanReadable(feature.properties.sensed_mode);
        switch(mode_string) {
            case "WALKING": return getColoredStyle(baseDict, 'brown');
            case "BICYCLING": return getColoredStyle(baseDict, 'green');
            case "TRANSPORT": return getColoredStyle(baseDict, 'red');
            default: return getColoredStyle(baseDict, 'black');
        }
      };

   var style_stop = function(feature) {
        return {fillColor: 'yellow', fillOpacity: 0.8};
      };

      var pointIcon = L.divIcon({className: 'leaflet-div-icon', iconSize: [5, 5]});

      var startMarker = L.AwesomeMarkers.icon({
        icon: 'play',
        prefix: 'ion',
        markerColor: 'green'
      });

      var stopMarker = L.AwesomeMarkers.icon({
        icon: 'stop',
        prefix: 'ion',
        markerColor: 'red'
      });

    var pointFormat = function(feature, latlng) {
        switch(feature.properties.feature_type) {
            case "start_place": return L.marker(latlng, {icon: startMarker});
            case "end_place": return L.marker(latlng, {icon: stopMarker});
            case "stop": return L.circleMarker(latlng);
            case "location": return L.marker(latlng, {icon: pointIcon});
            default: alert("Found unknown type in feature"  + feature); return L.marker(latlng)
        }
      };

    /*
     * END: Functions for customizing our geojson display
     */
});
