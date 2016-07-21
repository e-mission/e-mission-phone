'use strict';

angular.module('emission.main.metrics',['nvd3', 'emission.services', 'ionic-datepicker'])

.controller('MetricsCtrl', function($scope, $ionicActionSheet, $ionicLoading,
                                    CommHelper, $window) {
    
    $scope.uictrl = {
      showRange: false,
      showFilter: false,
      showVis: true,
      showResult: true,
      current: "Last week",
      showChart: true,
      showSummary: false,
      showMe: true,
      showAggr: false
    }
    $scope.showChart = function() {
      $scope.uictrl.showSummary = false;
      $scope.uictrl.showChart = true;

    }

    $scope.showSummary = function() {
      $scope.uictrl.showChart = false;
      $scope.uictrl.showSummary = true;

      

    }
    $scope.chartButtonClass = function() {
      return $scope.uictrl.showChart? "metric-chart-button-active hvcenter" : "metric-chart-button hvcenter";
    }
    $scope.summaryButtonClass = function() {
      return $scope.uictrl.showSummary? "metric-summary-button-active hvcenter" : "metric-summary-button hvcenter";
    }
    $scope.rangeButtonClass = function() {
      return $scope.uictrl.showRange? "metric-range-button-active hvcenter" : "metric-range-button hvcenter";
    }
    $scope.filterButtonClass = function() {
      return $scope.uictrl.showFilter? "metric-filter-button-active hvcenter" : "metric-filter-button hvcenter";
    }
    $scope.getButtonClass = function() {
      return ($scope.uictrl.showFilter || $scope.uictrl.showRange)? "metric-get-button hvcenter" : "metric-get-button-inactive hvcenter";
    }
    $scope.showRange = function() {
      if (!$scope.uictrl.showRange) {
        $scope.uictrl.showFilter = false;
        $scope.uictrl.showRange = true;
        $scope.uictrl.showVis = false;
        $scope.uictrl.showResult = false;
      } else {
        $scope.uictrl.showRange = false;
      }

    }
    $scope.showFilter = function() {
      if (!$scope.uictrl.showFilter) {
        $scope.uictrl.showRange = false;
        $scope.uictrl.showFilter = true;
        $scope.uictrl.showVis = false;
        $scope.uictrl.showResult = false;
      } else {
        $scope.uictrl.showFilter = false;
      }

    }
    $scope.options = {
        chart: {
            type: 'multiBarChart',
            width: $window.screen.width - 30,
            height: 400,
            margin : {
                top: 20,
                right: 20,
                bottom: 40,
                left: 55
            },
            showControls: false,
            showValues: true,
            stacked: false,
            x: function(d){ return d[0]; },
            y: function(d){ return d[1]; },
            /*
            average: function(d) { 
                var vals = d.values.map(function(item){
                    return item[1];
                });
                return d3.mean(vals);
            },
            */

            color: d3.scale.category10().range(),
            // duration: 300,
            useInteractiveGuideline: false,
            // clipVoronoi: false,

            xAxis: {
                axisLabelDistance: 3,
                axisLabel: 'Date',
                tickFormat: function(d) {
                    return d3.time.format('%y-%m-%d')(new Date(d * 1000))
                },
                showMaxMin: false,
                staggerLabels: true
            },
            yAxis: {
              axisLabel: "Number",
              axisLabelDistance: -10
            },
        }
    };
  
    var moment2Localdate = function(momentObj) {
      return {
        year: momentObj.year(),
        month: momentObj.month() + 1,
        day: momentObj.date(),
      };
    }
    var moment2Timestamp = function(momentObj) {
      return momentObj.unix();
    }

    $scope.data = [];


    $scope.getMetricsHelper = function() {
      if ($scope.uictrl.showRange) {
        $scope.getMetrics('timestamp');
      } else if ($scope.uictrl.showFilter) {
        $scope.getMetrics('local_date');
      } else {
        console.log("Illegal time_type"); // Notice that you need to set query
      }
    }
    $scope.getMetrics = function(mode) {
      if (['local_date', 'timestamp'].indexOf(mode) == -1) {
        console.log('Illegal time_type');
        return;
      }
      $scope.uictrl.current = "Custom";
      $scope.uictrl.showRange = false;
      $scope.uictrl.showFilter = false;
      $scope.uictrl.showVis = true;
      $scope.uictrl.showResult = true;
      if (mode === 'local_date') { // local_date filter
        var tempFrom = $scope.selectCtrl.fromDateLocalDate;
        tempFrom.weekday = $scope.selectCtrl.fromDateWeekdayValue;
        var tempTo = $scope.selectCtrl.toDateLocalDate;
        tempTo.weekday = $scope.selectCtrl.toDateWeekdayValue;
        var data = {
          freq: $scope.selectCtrl.freq,
          start_time: tempFrom,
          end_time: tempTo,
          metric: $scope.selectCtrl.metric
        };
      } else if (mode === 'timestamp') { // timestamp range
        var tempFrom = moment2Timestamp($scope.selectCtrl.fromDateTimestamp);
        var tempTo = moment2Timestamp($scope.selectCtrl.toDateTimestamp);
        var data = {
          freq: $scope.selectCtrl.pandaFreq,
          start_time: tempFrom,
          end_time: tempTo,
          metric: $scope.selectCtrl.metric
        };
      } else {
        console.log('Illegal mode');
        return;
      }

      console.log("Sending data "+JSON.stringify(data));
      $ionicLoading.show({
        template: 'Loading...'
      });
      CommHelper.getMetrics(mode, data, function(response) {
        $ionicLoading.hide();

        cacheResults(response); // cache results
        var m = $scope.uictrl.showMe? response.aggregate_metrics : response.user_metrics;
        $scope.summaryData = getSummaryData(m, $scope.selectCtrl.metric);
        if (angular.isDefined(m)) {
          console.log("Got aggregate result "+m.length);
          $scope.$apply(function() {
              $scope.showCharts(m)
          });
        } else {
          console.log("did not find aggregate result in response data "+JSON.stringify(response));
        }
      }, function(error) {
        $ionicLoading.hide();
        console.log("Got error %s while trying to read metric data" +
        JSON.stringify(error));
      });
    };

    var cacheResults = function(response) {
      if (angular.isDefined(response.user_metrics)) $scope.user_metrics = response.user_metrics;
      if (angular.isDefined(response.aggregate_metrics)) $scope.aggregate_metrics = response.aggregate_metrics;
    }

    $scope.showCharts = function(agg_metrics) {
      $scope.data = getDataFromMetrics(agg_metrics);

        var metricLabelMap = {
           "COUNT":'Number',
           "DISTANCE": 'm',
           "DURATION": 'secs',
           "MEDIAN_SPEED": 'm/sec'
        };

        $scope.options.chart.yAxis.axisLabel = metricLabelMap[$scope.selectCtrl.metricString];
    };
    $scope.pandaFreqOptions = [
      {text: "DAILY", value: 'D'},
      {text: "WEEKLY", value: 'W'},
      {text: "BIWEEKLY", value: '2W'},
      {text: "MONTHLY", value: 'M'},
      {text: "YEARLY", value: 'A'}
    ];

    $scope.metricOptions = [
      {text: "COUNT", value:'count'},
      {text: "DISTANCE", value: 'distance'},
      {text: "DURATION", value: 'duration'},
      {text: "MEDIAN_SPEED", value: 'median_speed'}
    ];

    $scope.freqOptions = [
      {text: "DAILY", value:'DAILY'},
      {text: "MONTHLY", value: 'MONTHLY'},
      {text: "YEARLY", value: 'YEARLY'}
    ];
    var getDataFromMetrics = function(metrics) {
        var mode_bins = {};
        metrics.forEach(function(metric) {
            for (var field in metric) {
                // TODO: Consider creating a prefix such as M_ to signal
                // modes. Is that really less fragile than caps, though?
                // Here, we check if the string is all upper case by 
                // converting it to upper case and seeing if it is changed
                if (field == field.toUpperCase()) {
                    if (field in mode_bins == false) {
                        mode_bins[field] = []
                    }
                    mode_bins[field].push([metric.ts, metric[field], metric.fmt_time]);
                }
            }
        });      
        var rtn = [];
        for (var mode in mode_bins) {
          var val_arrays = rtn.push({key: mode, values: mode_bins[mode]});
        }
        return rtn;
    }

    var getSummaryData = function(metrics, metric) {
        var data = getDataFromMetrics(metrics);
        for (var i = 0; i < data.length; i++) {
          var temp = 0;
          for (var j = 0; j < data[i].values.length; j++) {
            temp += data[i].values[j][1];
          }
          var unit = "";
          switch(metric) {
            case "count":
              unit = "trips";
              break;
            case "distance":
              unit = "m";
              break;
            case "duration":
              unit = "s";
              break;
            case "median_speed":
              unit = "m/s";
              break;
          }
          data[i].values = Math.round(temp) + ' ' + unit;
        }
        return data;
    }

    $scope.changeFromWeekday = function() {
      return $scope.changeWeekday(function(newVal) {
                                    $scope.selectCtrl.fromDateWeekdayString = newVal;
                                  },
                                  'from');
    }
  
    $scope.changeToWeekday = function() {
      return $scope.changeWeekday(function(newVal) {
                                    $scope.selectCtrl.toDateWeekdayString = newVal;
                                  },
                                  'to');
    }
  
    // $scope.show fil

    $scope.changeWeekday = function(stringSetFunction, target) {
      var weekdayOptions = [
        {text: "All", value: null},
        {text: "Monday", value: 0},
        {text: "Tuesday", value: 1},
        {text: "Wednesday", value: 2},
        {text: "Thursday", value: 3},
        {text: "Friday", value: 4},
        {text: "Saturday", value: 5},
        {text: "Sunday", value: 6}
      ];
      $ionicActionSheet.show({
        buttons: weekdayOptions,
        titleText: "Select day of the week",
        cancelText: "Cancel",
        buttonClicked: function(index, button) {
          stringSetFunction(button.text);
          if (target === 'from') {
            $scope.selectCtrl.fromDateWeekdayValue = button.value;
          } else if (target === 'to') {
            $scope.selectCtrl.toDateWeekdayValue = button.value;
          } else {
            console.log("Illegal target");
          }
          return true;
        }
      });
    };


    $scope.changeMetric = function() {
        $ionicActionSheet.show({
          buttons: $scope.metricOptions,
          titleText: "Select metric",
          cancelText: "Cancel",
          buttonClicked: function(index, button) {
            $scope.selectCtrl.metricString = button.text;
            $scope.selectCtrl.metric = button.value;
            return true;
          }
        });
    };

    $scope.changeFreq = function() {
        $ionicActionSheet.show({
          buttons: $scope.freqOptions,
          titleText: "Select summary freqency",
          cancelText: "Cancel",
          buttonClicked: function(index, button) {
            $scope.selectCtrl.freqString = button.text;
            $scope.selectCtrl.freq = button.value;
            return true;
          }
        });
    };

    $scope.changePandaFreq = function() {
        $ionicActionSheet.show({
          buttons: $scope.pandaFreqOptions,
          titleText: "Select summary freqency",
          cancelText: "Cancel",
          buttonClicked: function(index, button) {
            $scope.selectCtrl.pandaFreqString = button.text;
            $scope.selectCtrl.pandaFreq = button.value;
            return true;
          }
        });
    };

    $scope.toggle = function() {
      if (!$scope.uictrl.showMe) {
        $scope.uictrl.showMe = true;
        
        $scope.showCharts($scope.aggregate_metrics);
        
      } else {
        $scope.uictrl.showMe = false;
        
        $scope.showCharts($scope.user_metrics);
        
      }
    }
    var initSelect = function() {
      var now = moment();
      var monthago = moment().subtract(7, 'd');
      $scope.selectCtrl.metric = 'count';
      $scope.selectCtrl.metricString = "COUNT";
      $scope.selectCtrl.freq = 'DAILY';
      $scope.selectCtrl.freqString = "DAILY";
      $scope.selectCtrl.pandaFreq = 'D';
      $scope.selectCtrl.pandaFreqString = "DAILY";
      // local_date saved as localdate
      $scope.selectCtrl.fromDateLocalDate = moment2Localdate(monthago);
      $scope.selectCtrl.toDateLocalDate = moment2Localdate(now);
      // ts saved as moment
      $scope.selectCtrl.fromDateTimestamp= monthago;
      $scope.selectCtrl.toDateTimestamp = now;
      
      $scope.selectCtrl.fromDateWeekdayString = "All"
      $scope.selectCtrl.toDateWeekdayString = "All"

      $scope.selectCtrl.fromDateWeekdayValue = null;
      $scope.selectCtrl.toDateWeekdayValue = null;

      $scope.selectCtrl.region = null;
    };


  $scope.selectCtrl = {}
  initSelect();

  $scope.summaryModeIcon = function(key) {
    var icons = {"BICYCLING":"ion-android-bicycle",
    "ON_FOOT":" ion-android-walk",
    "IN_VEHICLE":"ion-disc",
    "UNKNOWN": "ion-ios-help"}
    return icons[key];
  }

  $scope.setCurDayFrom = function(val) {
    if (val) {
      $scope.selectCtrl.fromDateTimestamp = moment(val);
      $scope.datepickerObjFrom.inputDate = val;
    } else {
      $scope.datepickerObjFrom.inputDate = $scope.selectCtrl.fromDateTimestamp.toDate();
    }

  };
  $scope.setCurDayTo = function(val) {
    if (val) {
      $scope.selectCtrl.toDateTimestamp = moment(val);
      $scope.datepickerObjTo.inputDate = val;
    } else {
      $scope.datepickerObjTo.inputDate = $scope.selectCtrl.toDateTimestamp.toDate();
    }

  };
  $scope.datepickerObjFrom = {
      callback: $scope.setCurDayFrom,
      inputDate: $scope.selectCtrl.fromDateTimestamp.toDate(),
      setLabel: 'Set',
      todayLabel: 'Today',
      closeLabel: 'Close',
      mondayFirst: false,
      weeksList: ["S", "M", "T", "W", "T", "F", "S"],
      monthsList: ["Jan", "Feb", "March", "April", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"],
      templateType: 'popup',
      from: new Date(2015, 1, 1),
      to: new Date(),
      showTodayButton: true,
      dateFormat: 'MMMM dd yyyy',
      closeOnSelect: false,
      disableWeekdays: [6]
    };
  $scope.datepickerObjTo = {
      callback: $scope.setCurDayTo,
      inputDate: $scope.selectCtrl.toDateTimestamp.toDate(),
      setLabel: 'Set',
      todayLabel: 'Today',
      closeLabel: 'Close',
      mondayFirst: false,
      weeksList: ["S", "M", "T", "W", "T", "F", "S"],
      monthsList: ["Jan", "Feb", "March", "April", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"],
      templateType: 'popup',
      from: new Date(2015, 1, 1),
      to: new Date(),
      showTodayButton: true,
      dateFormat: 'MMMM dd yyyy',
      closeOnSelect: false,
      disableWeekdays: [6]
    };

});
