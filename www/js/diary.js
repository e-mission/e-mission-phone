angular.module('emission.main.diary',['ui-leaflet', 'nvd3ChartDirectives',
                                      'ionic-datepicker'])

.controller("TripsCtrl", function($scope, $http, $ionicPlatform, $state,
                                    $ionicScrollDelegate, $ionicPopup,
                                    $ionicActionSheet,
                                    leafletData, CommHelper) {
  console.log("controller TripsCtrl called");


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

      $scope.data = {};

      // $scope.data.currDay = moment("2015-09-16").startOf('day');
      $scope.data.currDay = moment().startOf('day');

      var getKeyForDate = function(date) {
        dateString = date.startOf('day').format('YYYY-MM-DD');
          return "diary/trips-"+dateString;
      };


        /*
         Let us assume that we have recieved a list of trips for that date from somewhere
         (either local usercache or the internet). Now, what do we need to process them?
         */
  var processTripsForDay = function(day, tripListForDay) {
      tripListForDay.forEach(function(item, index, array) {
        console.log(index + ":" + item.properties.start_fmt_time+", "+item.properties.duration);
      });

      directiveTripListForDay = tripListForDay.map(function(trip) {
            retVal = {};
            retVal.data = trip;
            retVal.style = style_feature;
            retVal.onEachFeature = onEachFeature;
            retVal.pointToLayer = pointFormat;
            var tc = getTripComponents(trip);
            retVal.start_place = tc[0];
            retVal.end_place = tc[1];
            retVal.stops = tc[2];
            retVal.sections = tc[3];
            // Hardcoding to avoid repeated nominatim calls
            // retVal.start_place.properties.displayName = "Start";
            // retVal.start_place.properties.displayName = "End";
            return retVal;
      });

      $scope.data.currDay = day;
      $scope.datepickerObject.inputDate = day.toDate();
      $scope.data.currDayTrips = directiveTripListForDay;

      $scope.data.currDayTrips.forEach(function(dt, index, array) {
          if (angular.isDefined(dt.start_place.properties.displayName)) {
              console.log("Already have display name "+ dt.start_place.properties.displayName +" for start_place")
          } else {
              console.log("Don't have display name for start place, going to query nominatim")
              $scope.getDisplayName(dt.start_place)
          }
          if (angular.isDefined(dt.end_place.properties.displayName)) {
              console.log("Already have display name " + dt.end_place.properties.displayName + " for end_place")
          } else {
              console.log("Don't have display name for end place, going to query nominatim")
              $scope.getDisplayName(dt.end_place)
          }
      });

      var dayMovingTime = 0;
      var dayStoppedTime = 0;
      var dayDistance = 0;

      $scope.data.currDayTrips.forEach(function(dt, index, array) {
          dt.tripSummary = {}
          var movingTime = 0
          var stoppedTime = 0
          dt.stops.forEach(function(stop, index, array) {
            stoppedTime = stoppedTime + stop.properties.duration;
          });
          dt.sections.forEach(function(section, index, array) {
            movingTime = movingTime + section.properties.duration;
          });
          dt.tripSummary.movingTime = movingTime;
          dt.tripSummary.stoppedTime = stoppedTime;
          dt.tripSummary.movingPct = (movingTime / (movingTime + stoppedTime)) * 100;
          dt.tripSummary.stoppedPct = (stoppedTime / (movingTime + stoppedTime)) * 100;
          dayMovingTime = dayMovingTime + dt.tripSummary.movingTime;
          dayStoppedTime = dayStoppedTime + dt.tripSummary.stoppedTime;
          console.log("distance = "+dt.data.properties.distance);
          dayDistance = dayDistance + dt.data.properties.distance;
      });

      var dayInSecs = 24 * 60 * 60;

      $scope.data.currDaySummary = {
        breakdown: [
            ["moving", dayMovingTime],
            ["waiting", dayStoppedTime],
            ["in place", dayInSecs - (dayMovingTime + dayStoppedTime)],
        ]
      }
      $scope.data.currDaySummary.distance = dayDistance;

      console.log("currIndex = "+$scope.data.currDay+" currDayTrips = "+ $scope.data.currDayTrips.length);

        // Return to the top of the page. If we don't do this, then we will be stuck at the 
      $ionicScrollDelegate.scrollTop(true);
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



        var readAndUpdateFromDatabase = function(day, foundFn, notFoundFn) {
            window.cordova.plugins.BEMUserCache.getDocument(getKeyForDate(day),
                function (tripListArray) {
                    $scope.$apply(function () {
                        /*
                         * Take the version with the most data
                         */
                        if (tripListArray.length > 0) {
                            tripListStr = tripListArray[0];
                            tripList = JSON.parse(tripListStr);
                            foundFn(day, tripList);
                        } else {
                            console.log("while reading data for "+day+" from database, no records found");
                            notFoundFn(day, "no matching record for key "+getKeyForDate(day));
                        }
                    });
            }, function(error) {
              $ionicPopup.alert({template: JSON.stringify(error)})
                  .then(function(res) {console.log("finished showing alert");});
            });
        };

        /*
         * Used for quick debugging using the live updating server. But then I can't use plugins, so we read from
         * the local file system instead.
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

        var readAndUpdateFromServer = function(day, foundFn, notFoundFn) {
            CommHelper.getTimelineForDay(day, function(response) {
               tripList = response.timeline;
               window.Logger.log(window.Logger.LEVEL_DEBUG,
                    "while reading data for "+day+" from server, got nTrips = "+tripList.length);
               foundFn(day, tripList);
            }, function(error) {
               window.Logger.log(window.Logger.LEVEL_INFO,
                    "while reading data for "+day
                    +" from server, error = "+JSON.stringify(error));
               notFoundFn(day, error);
            });
        };

        /*
   BEGIN DEVICE VERSION
        */

          // Read cached trips for the current day
  var db = window.sqlitePlugin.openDatabase({
    name: "userCacheDB",
    location: 0,
    createFromLocation: 1
  });

        var localCacheReadFn = readAndUpdateFromDatabase;

        /*
   BEGIN BROWSER VERSION
         */
    // var localCacheReadFn = readAndUpdateFromFile;

    var readAndUpdateForDay = function(day) {
        // First, we try the local cache
        // And if we don't find anything there, we fallback to the real server
        // processTripsForDay is the foundFn
        // the other function (that reads from the server) is the notFoundFn
        localCacheReadFn(day, processTripsForDay, function(day, error) {
            readAndUpdateFromServer(day, processTripsForDay, function(day, error) {
                console.log("No trips found for day "+error);
                var alertPopup = $ionicPopup.alert({
                     title: 'No trips found!',
                     template: "This is probably because you didn't go anywhere, but it because we messed up tracking, please let us know!"
                   });
                alertPopup.then(function(res) {
                    console.log("Alerted user");
                    $scope.datepickerObject.inputDate = day.toDate();
                    $scope.data.currDay = day;
                    $scope.data.currDayTrips = []
                    $scope.data.currDaySummary = {}
                });
            });
        });
    }

    // Initial read for the current day. We expect this to be in the cache.
    localCacheReadFn($scope.data.currDay, processTripsForDay, function() {
                console.log("No trips found for day "+$scope.data.currDay.format('YYYY-MM-DD'));
                var alertPopup = $ionicPopup.alert({
                    title: "You don't have any trips for today. Yet.",
                    template: "This is probably because you didn't go anywhere yet, but if it is because we messed up tracking, please let us know!"
                });
                alertPopup.then(function(res) {
                    console.log("Alerted user");
                    $scope.data.currDayTrips = []
                    $scope.data.currDaySummary = {}
                });
    });

        /*
    $scope.to_directive = function(trip) {
        retVal = {};
        retVal.data = trip;
        retVal.style = style_feature;
        retVal.onEachFeature = onEachFeature;
        retVal.pointToLayer = pointFormat;
        return retVal;
    };
    */


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

        $scope.getCurrDay = function() {
            retVal = $scope.data.days.slice($scope.data.currIndex, $scope.data.currIndex+1)[0];
            console.log("getCurrDay: returning "+retVal.fmt_time);
            return retVal;
        };

        $scope.prevDay = function() {
            console.log("Called prevDay when currDay = "+$scope.data.currDay.format('YYYY-MM-DD'));
            var prevDay = moment($scope.data.currDay).subtract(1, 'days');
            console.log("prevDay = "+prevDay.format('YYYY-MM-DD'));
            readAndUpdateForDay(prevDay);
        };

        $scope.nextDay = function() {
            console.log("Called nextDay when currDay = "+$scope.data.currDay.format('YYYY-MM-DD'));
            var nextDay = moment($scope.data.currDay).add(1, 'days');
            console.log("nextDay = "+nextDay);
            readAndUpdateForDay(nextDay);
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

   $scope.getHumanReadable = function(sensed_mode) {
        ret_string = sensed_mode.split('.')[1];
        if(ret_string == 'ON_FOOT') {
            return 'WALKING';
        } else {
            return ret_string;
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

    var getStartTs = function(trip) {
        return trip.features[0].properties.exit_ts
    };

    var getDateOfTrip = function(date) {
      var month;
      var date;

      /*
       * In order to be consistent with the spec, these need to be
       * date.getMonth() + 1 and date.getDay() + 1. However, that doesn't
       * actually work, probably because the date is being parsed incorrectly.
       *
       * Working around this for now since we should switch to timestamps
       * anyway.
       */
      switch (date.getMonth()) {
        case 1:
          month = "January";
          break;
        case 2:
          month = "February";
          break;
        case 3:
          month = "March";
          break;
        case 4:
          month = "April";
          break;
        case 5:
          month = "May";
          break;
        case 6:
          month = "June";
          break;
        case 7:
          month = "July";
          break;
        case 8:
          month = "August";
          break;
        case 9:
          month = "September";
          break;
        case 10:
          month = "October";
          break;
        case 11:
          month = "November";
          break;
        case 12:
          month = "December";
          break;

      }
        switch (date.getDay()) {
        case 1:
          day = "Sunday";
          break;
        case 2:
          day = "Monday";
          break;
        case 3:
          day = "Tuesday";
          break;
        case 4:
          day = "Wednesday";
          break;
        case 5:
          day = "Thursday";
          break;
        case 6:
          day = "Friday";
          break;
        case 7:
          day = "Saturday";
          break;
      }
        return (day + ", " + month + " " + date.getDate() + ", " + date.getFullYear());
    };


    $scope.getTime = function(date) {
      var min = (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
      return ("" + date.getHours() + ":" + min);
    };

    $scope.notSingleOrLast = function(index, list) {
      if (index == list.length - 1) {
        return false;
      } else {
        return true;
      }
    };

    $scope.slideHasChanged = function(index) {
      console.log("slide changed to index: " + index+" when ionic delegate index = "+$ionicSlideBoxDelegate.currentIndex+
          " and our cached index is "+$scope.currIndex);
      $scope.days = $scope.allDays.slice($scope.currIndex, $scope.currIndex+1);
        $scope.currIndex = $scope.currIndex + 1;
        $ionicSlideBoxDelegate.update();
    };

    $scope.mapCreated = function(map) {
      console.log("maps here");
      console.log(map);
      $scope.map = map;
      $scope.setupMap($scope.data.slides[0]["trip_val"][0]);
    };

    $scope.centerOnMe = function() {
      console.log("Centering");
      if (!$scope.map) {
        return;
      }

      $scope.loading = $ionicLoading.show({
        content: 'Getting current location...',
        showBackdrop: false
      });

      navigator.geolocation.getCurrentPosition(function(pos) {
        console.log('Got pos', pos);
        $scope.map.setCenter(new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude));
        $scope.loading.hide();
      }, function(error) {
        alert('Unable to get location: ' + error.message);
      });
    };

    $scope.getDisplayName = function(place_feature) {
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
            }, function(response) {
               console.log("while reading data from nominatim, status = "+response.status);
               notFoundFn(day, response);
            });
    };

    $scope.nextSlide = function() {
      console.log("next");
      $ionicSlideBoxDelegate.next();
    };

    $scope.pickImage = function(item) {
      if (item.predictedMode != null) {
        var item_mode = item.predictedMode;
      } else {
        var item_mode = item.autoMode;
      }

      if (item_mode == 'walking') {
        return 'img/walking.jpg';
      }
      if (item_mode == 'car') {
        return 'img/car.jpg';
      }
      if (item_mode == 'cycling') {
        return 'img/cycling.jpg';
      }
      if (item_mode == 'air') {
        return 'img/air.jpg';
      }
      if (item_mode == 'bus') {
        return 'img/bus.jpg';
      }
      if (item_mode == 'train') {
        return 'img/train.jpg';
      }
    };

    $scope.setupMap = function(item) {
      console.log(JSON.stringify(item));
      if ($scope.path) {
        $scope.path.setMap(null)
      }
      if ($scope.startMarker) {
        $scope.startMarker.setMap(null)
      }
      if ($scope.endMarker) {
        $scope.endMarker.setMap(null)
      }
      var points = item["trackPoints"];
      var latitude = points[0]["coordinate"][1];
      var longitude = points[0]["coordinate"][0];
      var endLat = points[points.length - 1]["coordinate"][1];
      var endLng = points[points.length - 1]["coordinate"][0];
      $scope.startMarker = new google.maps.Marker({
        position: new google.maps.LatLng(latitude, longitude),
        icon: 'img/maps-markera.png'
      });
      $scope.startMarker.setMap($scope.map);
      $scope.endMarker = new google.maps.Marker({
        position: new google.maps.LatLng(endLat, endLng),
        icon: 'img/maps-markerb.png'
      });
      $scope.endMarker.setMap($scope.map);
      $scope.map.setCenter({
        lat: latitude,
        lng: longitude
      });
      var coordinates = [];
      for (var i = 0; i < points.length; i++) {
        coordinates.push(new google.maps.LatLng(points[i]["coordinate"][1], points[i]["coordinate"][0]))
      }
      var path = new google.maps.Polyline({
        path: coordinates,
        geodesic: true,
        strokeColor: '#FF0000',
        strokeOpacity: 1.0,
        strokeWeight: 2
      });
      $scope.path = path;
      path.setMap($scope.map);
      var bounds = new google.maps.LatLngBounds();
      for (var i = 0; i < coordinates.length; i++) {
        bounds.extend(coordinates[i]);
      }
      $scope.map.fitBounds(bounds);
    };

    //Change according to datatype in actual data object and the intervals set in the app.
    // Intervals: Green - confidence > 80 ; Yellow: 80 > confidence > 70; Red: 70 > confidence
    $scope.getConfidenceColor = function(item) {
      if (item.userClassification != null && item.userClassification.length > 0) {
        return "confidence-certain";
      } else if (item.confidence >= 0.9) {
        return "confidence-certain";
      } else if (item.confidence >= 0.7) {
        return "confidence-medium";
      } else {
        return "confidence-low";
      }
    };

    $scope.getDisplayMode = function(item) {
      var item_mode = "";
      if (item.userClassification != null && item.userClassification.length > 0) {
        item_mode = item.userClassification;
      } else if (item.predictedMode != null) {
        item_mode = item.predictedMode;
      } else {
        item_mode = item.autoMode;
      }
      if (item_mode == 'walking') {
        return 'ion-android-walk'
      }
      if (item_mode == 'car') {
        return 'ion-android-car';
      }
      if (item_mode == 'cycling') {
        return 'ion-android-bicycle';
      }
      if (item_mode == 'air') {
        return 'ion-android-plane';
      }
      if (item_mode == 'bus') {
        return 'ion-android-bus';
      }
      if (item_mode == 'train') {
        return 'ion-android-subway';
      }
    };

    $scope.modes = [{
      mode: "walking",
      show: "Walk"
    }, {
      mode: "cycling",
      show: "Bike"
    }, {
      mode: "car",
      show: "Car"
    }, {
      mode: "air",
      show: "Fly"
    }, {
      mode: "bus",
      show: "Bus"
    }, {
      mode: "train",
      show: "Train"
    }];

    $scope.modeUpdate = function(trip, newMode) {
      console.log("selected new mode " + newMode + " with tripId " + trip.tripId);
      var db = window.sqlitePlugin.openDatabase({
        name: "TripSections.db",
        location: 2,
        createFromLocation: 1
      });
      db.transaction(function(tx) {
        var mDate = new Date();
        tx.executeSql("UPDATE currTrips SET userClassification = ? WHERE tripId = ?", [newMode, trip.tripId], function(tx, r) {
          console.log("Your SQLite query was successful!");
        }, function(tx, e) {
          console.log("SQLite Error: " + e.message);
        });
      });
    };

    $scope.modeChange = function(newMode) {
      $scope.modes[0].newMode;
    };
});
