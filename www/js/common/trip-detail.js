'use strict';
angular.module('emission.main.common.trip-detail',['ui-leaflet',
                                      'ionic-datepicker',
                                      'emission.services',
                                      'emission.main.diary.services', 
                                      'emission.main.common.services',
                                      'nvd3'])

.controller("CommonTripDetailCtrl", function($scope, $stateParams,
                                        CommonGraph, $window) {
    $scope.tripId = $stateParams.tripId;
    $scope.trip = CommonGraph.data.cTripId2ObjMap[$scope.tripId];
    var distributionStartHour = $scope.trip.common_hour_distribution;
    var valsStartHour = []; 
    var state = 1; // state machine
    var firstNonZero = 0
    var firstZero = 0;
    for (var i = 0; i < 24; i++) {
      if (distributionStartHour.get(i)) {
        state ^= state;
        firstZero = 0;
        valsStartHour.push({'label': i + ':00', 'value': distributionStartHour.get(i) });
      } else {
        if (state == 0) {
            if (firstZero == 0) {
                firstZero = i;
            }
            valsStartHour.push({'label': i + ':00', 'value': 0 });
        } else {
            firstNonZero++;
        }
      }
    }
    if (firstZero > 0) { 
        valsStartHour.splice(firstZero - firstNonZero); // remove 0s at tail
    }
    var data1 = {
      key: 'Data',
      values: valsStartHour
    };

    var chart1;
    chart1 = nv.models.multiBarHorizontalChart()
        .x(function(d) { return d.label })
        .y(function(d) { return d.value });
      
    chart1.yAxis.tickFormat(d3.format('s'));
    chart1.yAxis.axisLabel('Number of trips');
    
    chart1.barColor(["#2bb096"]);
    chart1.width(350);
    chart1.height(valsStartHour.length * 35 + 80); // Just come up with a way to adjust bar width
    chart1.showValues(true);
    chart1.valueFormat(d3.format('d'));
    chart1.duration(250);
    chart1.showLegend(false)
    chart1.showControls(false);
    d3.select('#chart1 svg')
        .datum([data1,])
        .call(chart1)
        .attr('width', 350).attr('height', valsStartHour.length * 35 + 80);

    nv.utils.windowResize(chart1.update);
    nv.addGraph(chart1);
    
    
    var distributionDuration = $scope.trip.durations;
    var valsDuration = [];
    var nob = Math.floor(Math.sqrt(distributionDuration.length)); // # of bins using square-root choice
    var mMax = Math.max(...distributionDuration);
    var mMin = Math.min(...distributionDuration);
    var valsDuration = d3.layout.histogram().bins(nob).range([mMin, mMax])(distributionDuration);

    // To resolve the overlap
    // Since humanize is the key to ux, we have to re-bin the conflict
    var humanizeHelper = function(d) {return moment.duration(d.x * 1000).humanize();}
    var rebin = function(ds) {
        if (ds.length < 2) {
            return ds;
        } else {
            for (var i = 0; i < ds.length - 1;) {
                if (humanizeHelper(ds[i]) === humanizeHelper(ds[i + 1])) { // conflict
                    var temp = Math.min(ds[i].x, ds[i + 1].x); // put lower bound in temp
                    ds[i] = ds[i].concat(ds[i + 1]); // merge conflict
                    ds[i].x = temp; //restore lower bound
                    ds.splice(i + 1, 1); // remove next
                } else {
                    i++; // next
                }
            }
        }
        return ds;
    }
    valsDuration = rebin(valsDuration);

    var data2 = {
      key: 'Data',
      values: valsDuration
    }
    var chart2;
    chart2 = nv.models.multiBarHorizontalChart()
    .x(function(d) {return moment.duration(d.x * 1000).humanize()})
    .y(function(d) {return d.length});
    chart2.yAxis.tickFormat(d3.format('s'));
    chart2.yAxis.axisLabel('Number of trips');
    chart2.width(350);
    chart2.height(valsDuration.length * 35 + 80); // Just come up with a way to adjust bar width
    chart2.showValues(true);
    chart2.valueFormat(d3.format('d'));
    chart2.duration(250);
    chart2.showLegend(false)
    chart2.showControls(false);
    d3.select('#chart2 svg')
        .datum([data2,])
        .call(chart2)
        .attr('width', 350).attr('height', valsDuration.length * 35 + 80);
    nv.utils.windowResize(chart2.update);


    nv.addGraph(chart2);
});