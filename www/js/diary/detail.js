'use strict';
angular.module('emission.main.diary.detail',['ui-leaflet',
                                      'ionic-datepicker', 'nvd3',
                                      'emission.services', 'emission.plugin.logger'])

.controller("DiaryDetailCtrl", function($scope, $window, $stateParams, $ionicActionSheet,
                                        leafletData, leafletMapEvents, Logger,
                                        Timeline, DiaryHelper,Config) {
  var MULTI_PASS_THRESHOLD = 90;
  console.log("controller DiaryDetailCtrl called with params = "+
    JSON.stringify($stateParams));

  $scope.mapCtrl = {};
  angular.extend($scope.mapCtrl, {
    defaults : Config.getMapTiles()
  });

  /*
  var mapEvents = leafletMapEvents.getAvailableMapEvents();
  for (var k in mapEvents) {
    var eventName = 'leafletDirectiveMap.detail.' + mapEvents[k];
    $scope.$on(eventName, function(event, data){
        console.log("in mapEvents, event = "+JSON.stringify(event.name)+
              " leafletEvent = "+JSON.stringify(data.leafletEvent.type)+
              " leafletObject = "+JSON.stringify(data.leafletObject.getBounds()));
        $scope.eventDetected = event.name;
    });
  }

  leafletData.getMap('detail').then(function(map) {
    map.on('click', function(ev) {
      alert("click" + ev.latlng); // ev is an event object (MouseEvent in this case)
    });
  });

  leafletData.getMap('detail').then(function(map) {
    map.on('touch', function(ev) {
      alert("touch" + ev.latlng); // ev is an event object (MouseEvent in this case)
    });
  });
  */

  /*
   * Returns objects of the form: {
   * gj: geojson representation,
   * latlng: latlng representation,
   * ts: timestamp
   * }
   */

  var getSectionPoints = function(section) {
    var mappedPoints = section.geometry.coordinates.map(function(currCoords, index) {
      var currMappedPoint = {gj: currCoords,
        latlng: L.GeoJSON.coordsToLatLng(currCoords),
        ts: section.properties.times[index]}
      if (index % 100 == 0) {
        Logger.log("Mapped point "+ JSON.stringify(currCoords)+" to "+currMappedPoint);
      }
      return currMappedPoint;
    });
    return mappedPoints;
  }

  var getAllPoints = function() {
    var allPoints = [];
    $scope.tripgj.sections.forEach(function(s) {
        Array.prototype.push.apply(allPoints, getSectionPoints(s));
    });
    return allPoints;
  }

  var sortPointsByDistance = function(a, b) {
    return a.selDistance - b.selDistance;
  }

  var sortPointsByTime = function(a, b) {
    return a.ts - b.ts;
  }

  var getClosestPoints = function(selPoint, allPoints)  {
    var selPointLatLng = L.GeoJSON.coordsToLatLng(selPoint.geometry.coordinates);
    // Add distance to the selected point to the properties
    var sortedPoints = angular.copy(allPoints);
    sortedPoints.forEach(function(currPoint) {
        currPoint.selDistance = selPointLatLng.distanceTo(currPoint.latlng);
    });
    sortedPoints.sort(sortPointsByDistance);
    return sortedPoints;
  }

  /* It would be great to just use the timestamp of the closest point.
   * HOWEVER, we could have round trips in which we pass by the same point
   * multiple times. So first we need to see how many times we go through
   * the point. We do this by determining the time difference between the n
   * closest points. If we pass by the point only once, we expect that all
   * of the points will be from the same section and will be 30 secs apart
   * But if we pass by the point multiple times, the points will be from
   * different sections and will be greater than 30 secs apart
   */

  var getTimeBins = function(closestPoints) {
      var sortedTsList = angular.copy(closestPoints).sort(sortPointsByTime);
      sortedTsList.forEach(function(currItem, i) {
        if (i == 0) {
            currItem.timeDiff = 0;
        } else {
            currItem.timeDiff = currItem.ts - sortedTsList[i - 1].ts;
        }
      });
      var timeDiffList = sortedTsList.map(function(currItem) {
        return currItem.timeDiff;
      });
      var maxDiff = Math.max.apply(0, timeDiffList);

      // We take the calculated time differences and split them into bins
      // common case: one bin
      // multiple passes: multiple bins
      var timeBins = [];
      var currBin = [];
      timeBins.push(currBin);
      sortedTsList.forEach(function(currItem){
        if (currItem.timeDiff > MULTI_PASS_THRESHOLD) {
          currBin = [];
          timeBins.push(currBin);
        }
        currBin.push(currItem);
      });
      Logger.log("maxDiff = " + maxDiff);
      return timeBins;
  }

  var addSafeEntry = function(latlng, ts, marker, event, map) {
    // marker.setStyle({color: 'green'});
    addEntry("manual/incident", "green", latlng, ts, 0, marker)
  };

  var addSuckEntry = function(latlng, ts, marker, event, map) {
    addEntry("manual/incident", "red", latlng, ts, 100, marker)
  };

  var addEntry = function(key, newcolor, latlng, ts, stressLevel, marker) {
    marker.setStyle({color: newcolor});
    var value = {
        loc: marker.toGeoJSON().geometry,
        ts: ts,
        stress: stressLevel
    }
    $window.cordova.plugins.BEMUserCache.putMessage(key, value)
  }

  var cancelEntry = function(latlng, ts, marker, event, map) {
    map.removeLayer(marker);
  }

  $scope.$on('leafletDirectiveMap.detail.mouseup', function(event, data) {
      console.log("diary/detail received mouseup event, showing stress popup at "+data.leafletEvent.latlng);
      var safe_suck_cancel_actions = [{text: "Safe",
                                       action: addSafeEntry},
                                      {text: "Suck",
                                       action: addSuckEntry},
                                      {text: "Cancel",
                                       action: cancelEntry}]
      var latlng = data.leafletEvent.latlng;
      var marker = L.circleMarker(latlng).addTo(data.leafletObject);

      var sortedPoints = getClosestPoints(marker.toGeoJSON(), getAllPoints());
      var closestPoints = sortedPoints.slice(0,10);
      Logger.log("Closest 10 points are "+ closestPoints.map(JSON.stringify));

      var timeBins = getTimeBins(closestPoints);
      Logger.log("number of bins = " + timeBins.length);

      if (timeBins.length == 1) {
        // Common case: find the first item in the first time bin, no need to
        // prompt
        var ts = timeBins[0][0].ts;
      } else {
        // Uncommon case: multiple passes - get the closest point in each bin
        // Note that this may not be the point with the smallest time diff
        // e.g. if I am going to school and coming back, when sorted by time diff,
        // the points will be ordered from home to school on the way there and
        // from school to home on the way back. So if the incident happened
        // close to home, the second bin, sorted by time, will have the first
        // point as the point closest to school, not to home. We will need to
        // re-sort based on distance. Or we can just accept an error in the timestamp,
        // which will be a max of 5 * 30 secs = 2.5 minutes
        // Let's accept the error for now and fix later.
        // Example: 8:06 - 8:48 on 16 Nov on iPhone3
        var tsOptions = timeBins.map(function(bin) {
          return bin[0].ts;
        });
        Logger.log("tsOptions = " + tsOptions);
        var timeSelActions = tsOptions.map(function(ts) {
          return {text: DiaryHelper.getFormattedTime(ts),
                  selValue: ts};
        });
        $ionicActionSheet.show({titleText: "Choose incident time",
          buttons: timeSelActions,
          buttonClicked: function(index, button) {
            var ts = button.selValue;
          }
        });
      }

      $ionicActionSheet.show({titleText: "lat: "+latlng.lat.toFixed(6)
                +", lng: " + latlng.lng.toFixed(6)
                + " at " + DiaryHelper.getFormattedTime(ts),
            buttons: safe_suck_cancel_actions,
            buttonClicked: function(index, button) {
                button.action(latlng, ts, marker, data.leafletEvent, data.leafletObject);
                return true;
            }
      });
  });

  $scope.$on('leafletDirectiveMap.detail.resize', function(event, data) {
      console.log("diary/detail received resize event, invalidating map size");
      data.leafletObject.invalidateSize();
  });

  $scope.refreshTiles = function() {
      $scope.$broadcast('invalidateSize');
  };

  $scope.getFormattedDate = DiaryHelper.getFormattedDate;
  $scope.arrowColor = DiaryHelper.arrowColor;
  $scope.parseEarlierOrLater = DiaryHelper.parseEarlierOrLater;
  $scope.getEarlierOrLater = DiaryHelper.getEarlierOrLater;
  $scope.getLongerOrShorter = DiaryHelper.getLongerOrShorter;
  $scope.getIcon = DiaryHelper.getIcon;
  $scope.getHumanReadable = DiaryHelper.getHumanReadable;
  $scope.getPercentages = DiaryHelper.getPercentages;
  $scope.allModes = DiaryHelper.allModes;
  $scope.trip = Timeline.getTrip($stateParams.tripId);
  $scope.getKmph = DiaryHelper.getKmph;
  $scope.getFormattedDistance = DiaryHelper.getFormattedDistance;
  $scope.getSectionDetails = DiaryHelper.getSectionDetails;
  $scope.getFormattedTime = DiaryHelper.getFormattedTime;
  $scope.getFormattedTimeRange = DiaryHelper.getFormattedTimeRange;
  $scope.getFormattedDuration = DiaryHelper.getFormattedDuration;
  $scope.getTripDetails = DiaryHelper.getTripDetails
  $scope.tripgj = DiaryHelper.directiveForTrip($scope.trip);

  console.log("trip.start_place = " + JSON.stringify($scope.trip.start_place));

  var data  = [];
  var totalDistance = 0;
  for (var s in $scope.tripgj.sections) {
    for (var p in $scope.tripgj.sections[s].properties.distances) {
      totalDistance += $scope.tripgj.sections[s].properties.distances[p];
      data.push({x: totalDistance, y: $scope.tripgj.sections[s].properties.speeds[p] });
    }
  }
  var dataset = {
      values: data,
      key: 'Speed',
      color: '#7777ff',
    }
  var chart = nv.models.lineChart()
                .margin({left: 65, right: 10})  //Adjust chart margins to give the x-axis some breathing room.
                .useInteractiveGuideline(false)  //We want nice looking tooltips and a guideline!
                .x(function(d) {return d.x / 1000})
                .showLegend(true)       //Show the legend, allowing users to turn on/off line series.
                .showYAxis(true)        //Show the y-axis
                .showXAxis(true);        //Show the x-axis
  chart.xAxis
    .tickFormat(d3.format(".1f"))
    .axisLabel('Distance (km)');

  chart.yAxis     //Chart y-axis settings
      .axisLabel('Speed (m/s)')
      .tickFormat(d3.format('.1f'));

  d3.select('#chart svg')    //Select the <svg> element you want to render the chart in.
      .datum([dataset,])         //Populate the <svg> element with chart data...
      .call(chart);          //Finally, render the chart!


  //Update the chart when window resizes.
  nv.utils.windowResize(chart.update);
  nv.addGraph(chart);



})
