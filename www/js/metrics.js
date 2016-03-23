'use strict';

angular.module('emission.main.metrics',['nvd3', 'emission.services', 'ionic-datepicker', 'emission.main.metrics.factory', 'angularLocalStorage'])

.controller('MetricsCtrl', function($scope, $ionicActionSheet, $ionicLoading,
                                    CommHelper, $window, $ionicPopup,
                                    FootprintHelper, CalorieCal, $ionicModal, $timeout, storage,
                                    $ionicScrollDelegate) {
    
    var lastWeekQuery = true;
    var first = true;
    var lastWeekCalories = 0;
    var lastWeekCarbon = "0 kg CO₂";
    var twoWeeksAgoCarbon = "";
    $scope.setCookie = function(){
      $scope.cookie = true;
      $scope.iceCream = false;
      $scope.banana = false;
      storage.remove('foodCompare');
      storage.set('foodCompare', 'cookie');
    }
    $scope.setIceCream = function(){
      $scope.cookie = false;
      $scope.iceCream = true;
      $scope.banana = false;
      storage.remove('foodCompare');
      storage.set('foodCompare', 'iceCream');
    }
    $scope.setBanana = function(){
      $scope.cookie = false;
      $scope.iceCream = false;
      $scope.banana = true;
      storage.remove('foodCompare');
      storage.set('foodCompare', 'banana');
    }
    if(storage.get('foodCompare') == null){
      $scope.setCookie();
    } else {
      var choosenFood = storage.get('foodCompare')
      if(choosenFood == 'cookie')
        $scope.setCookie();
      else if (choosenFood == 'iceCream')
        $scope.setIceCream();
      else
        $scope.setBanana();
    }
    $ionicModal.fromTemplateUrl('templates/metrics/metrics-control.html', {
      scope: $scope,
      animation: 'slide-in-up'
    }).then(function(modal) {
      $scope.modal = modal;
    });
    $scope.openModal = function(){
      $scope.modal.show();
    }
    $scope.closeModal = function(){
      $scope.modal.hide();
    }
    $scope.uictrl = {
      showRange: true,
      showFilter: false,
      showVis: true,
      showResult: true,
      current: "Last week",
      showChart: false,
      showSummary: true,
      showMe: true,
      showAggr: false,
      showContent: false
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
    $scope.fullToggleLeftClass = function() {
      return $scope.userData.gender == 1? "full-toggle-left-active hvcenter" : "full-toggle-left hvcenter";
    }
    $scope.fullToggleRightClass = function() {
      return $scope.userData.gender == 0? "full-toggle-right-active hvcenter" : "full-toggle-right hvcenter";
    }
    $scope.fullToggleLeftClass1 = function() {
      return $scope.showca2020? "full-toggle-left-active hvcenter" : "full-toggle-left hvcenter";
    }
    $scope.fullToggleRightClass1 = function() {
      return $scope.showca2035? "full-toggle-right-active hvcenter" : "full-toggle-right hvcenter";
    }
    $scope.heightToggleLeftClass = function() {
      return $scope.userData.heightUnit == 1? "unit-toggle-left-active hvcenter" : "unit-toggle-left hvcenter";
    }
    $scope.heightToggleRightClass = function() {
      return $scope.userData.heightUnit == 0? "unit-toggle-right-active hvcenter" : "unit-toggle-right hvcenter";
    }
    $scope.weightToggleLeftClass = function() {
      return $scope.userData.weightUnit == 1? "unit-toggle-left-active hvcenter" : "unit-toggle-left hvcenter";
    }
    $scope.weightToggleRightClass = function() {
      return $scope.userData.weightUnit == 0? "unit-toggle-right-active hvcenter" : "unit-toggle-right hvcenter";
    }
    $scope.showRange = function() {
      if ($scope.uictrl.showFilter) {
        $scope.uictrl.showFilter = false;
        $scope.uictrl.showRange = true;
      }
    }
    $scope.showFilter = function() {
      if ($scope.uictrl.showRange) {
        $scope.uictrl.showRange = false;
        $scope.uictrl.showFilter = true;
      }
    }

    $scope.setHeightUnit = function(heightUnit) {
      // 1 for cm, 0 for ft
      $scope.userData.heightUnit = heightUnit;
    }
    $scope.setWeightUnit = function(weightUnit) {
      // 1 for kg, 0 for lb
      $scope.userData.weightUnit = weightUnit;
    }
    $scope.setGender = function(gender) {
      $scope.userData.gender = gender;
    }

    $scope.storeUserData = function() {     
      var info = {'gender': $scope.userData.gender,
                  'heightUnit': $scope.userData.heightUnit,
                  'weightUnit': $scope.userData.weightUnit,
                  'height': $scope.userData.height,
                  'weight': $scope.userData.weight,
                  'age': $scope.userData.age,
                  'userDataSaved': true};
      CalorieCal.set(info);
    }

    $scope.userDataSaved = function() {
      return CalorieCal.get().userDataSaved == true;
    }
    $scope.options = {
        chart: {
            type: 'multiBarChart',
            width: $window.screen.width - 30,
            height: $window.screen.height - 220,
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
    var twoWeeksAgo = false;

    var getDataOfTwoWeeksAgo = function() {
      twoWeeksAgo = true;
      setMetricsHelper(getTwoWeeksAgo);
    }

    var getData = function(){
      $scope.getMetricsHelper();
    }

    $scope.getMetricsHelper = function() {
      $scope.uictrl.showContent = false;
      setMetricsHelper(getMetrics);
    }

    var setMetricsHelper = function(dataToGet) {
      if ($scope.uictrl.showRange) {
        setMetrics('timestamp', dataToGet);
      } else if ($scope.uictrl.showFilter) {
        setMetrics('local_date', dataToGet);
      } else {
        console.log("Illegal time_type"); // Notice that you need to set query
      }
      $scope.modal.hide();
    }

    var data = {}
    var theMode = "";

    var setMetrics = function(mode, callback) {
      theMode = mode;
      if (['local_date', 'timestamp'].indexOf(mode) == -1) {
        console.log('Illegal time_type');
        return;
      }

      if (mode === 'local_date') { // local_date filter
        var tempFrom = $scope.selectCtrl.fromDateLocalDate;
        tempFrom.weekday = $scope.selectCtrl.fromDateWeekdayValue;
        var tempTo = $scope.selectCtrl.toDateLocalDate;
        tempTo.weekday = $scope.selectCtrl.toDateWeekdayValue;
        data = {
          freq: $scope.selectCtrl.freq,
          start_time: tempFrom,
          end_time: tempTo,
          metric: $scope.selectCtrl.metric
        };
      } else if (mode === 'timestamp') { // timestamp range
        if(twoWeeksAgo){
          var tempFrom = moment2Timestamp(moment().day(-14)); 
          var tempTo = moment2Timestamp(moment().day(-8)); 
          twoWeeksAgo = false; 
        } else if(lastWeekQuery) {
          var tempFrom = moment2Timestamp(moment().day(-7)); // Last week's Sunday
          var tempTo = moment2Timestamp(moment().day(-1)); // Last week's Satruday
          lastWeekQuery = false; // Only get last week's data once
        } else {
          var tempFrom = moment2Timestamp($scope.selectCtrl.fromDateTimestamp);
          var tempTo = moment2Timestamp($scope.selectCtrl.toDateTimestamp);
        }
        data = {
          freq: $scope.selectCtrl.pandaFreq,
          start_time: tempFrom,
          end_time: tempTo,
          //metric: $scope.selectCtrl.metric
          metric: ""
        };
      } else {
        console.log('Illegal mode');
        return;
      }
      console.log("Sending data "+JSON.stringify(data));
      callback()
    };

   var getDuration = function() {
      var clonedData = angular.copy(data);
      clonedData.metric = "duration";
      var getDuration = CommHelper.getMetrics(theMode, clonedData);
      return getDuration;
    }
    var getSpeed = function() {
      var clonedData = angular.copy(data);
      clonedData.metric = "median_speed";
      var speedData = CommHelper.getMetrics(theMode, clonedData);
      return speedData;
    }
    var getCount = function(){
      var clonedData = angular.copy(data);
      clonedData.metric = "count";
      var getCount = CommHelper.getMetrics(theMode, clonedData);
      return getCount;
    }
    var getDistance =  function() {
      var clonedData = angular.copy(data);
      clonedData.metric = "distance";
      var getDistance = CommHelper.getMetrics(theMode, clonedData);
      return getDistance;
    }

    var getMetrics = function(){
      $ionicLoading.show({
        template: 'Loading...'
      });
      $scope.uictrl.current = "Custom";
      //$scope.uictrl.showRange = false;
      //$scope.uictrl.showFilter = false;
      $scope.uictrl.showVis = true;
      $scope.uictrl.showResult = true;

      $scope.caloriesData = {};
      $scope.carbonData = {};
      $scope.summaryData = {};
      $scope.caloriesData.userCalories = 0;
      $scope.caloriesData.aggrCalories = 0;
      $scope.caloriesData.lastWeekUserCalories = 0;

      $scope.carbonData.userCarbon = "0 kg CO₂";
      $scope.carbonData.aggrCarbon = "0 kg CO₂";
      $scope.carbonData.optimalCarbon = "0 kg CO₂";
      $scope.carbonData.worstCarbon = "0 kg CO₂";
      $scope.carbonData.lastWeekUserCarbon = "0 kg CO₂";
      $scope.carbonData.changeInPercentage = "0%";
      $scope.carbonData.change = " change";

      $scope.summaryData.userSummary = [];
      var food = {
        'chocolateChip' : 78, //16g 1 cookie
        'vanillaIceCream' : 137, //1/2 cup
        'banana' : 105, //medium banana 118g
      };

      Promise.all([getDuration(), getSpeed(), getCount(), getDistance()]).then(function(results) {
        // cacheResults(response);
        $ionicLoading.hide();
        if(results[0].user_metrics.length == 0){
          first = false; 
          // If there is no data from last week (ex. new user) 
          // Don't store the any other data as last wee data
         }
        $scope.summaryData.userSummary.duration = getSummaryData(results[0].user_metrics, "duration");
        $scope.summaryData.userSummary.median_speed = getSummaryData(results[1].user_metrics, "median_speed");
        $scope.summaryData.userSummary.count = getSummaryData(results[2].user_metrics, "count");
        $scope.summaryData.userSummary.distance = getSummaryData(results[3].user_metrics, "distance");
        switch($scope.selectCtrl.metric) {
          case "duration":
            $scope.chartDataUser = results[0].user_metrics? results[0].user_metrics : [];
            $scope.chartDataAggr = results[0].aggregate_metrics? results[0].aggregate_metrics : [];
            break;
          case "median_speed":
            $scope.chartDataUser = results[1].user_metrics? results[1].user_metrics : [];
            $scope.chartDataAggr = results[1].aggregate_metrics? results[1].aggregate_metrics : [];
            break;
          case "count":
            $scope.chartDataUser = results[2].user_metrics? results[2].user_metrics : [];
            $scope.chartDataAggr = results[2].aggregate_metrics? results[2].aggregate_metrics : [];
            break;
          case "distance":
            $scope.chartDataUser = results[3].user_metrics? results[3].user_metrics : [];
            $scope.chartDataAggr = results[3].aggregate_metrics? results[3].aggregate_metrics : [];
            break;
        }

        if (results[0].user_metrics) {
          var durationData = getSummaryDataRaw(results[0].user_metrics, "duration");
        }
        if (results[1].user_metrics) {
          var speedData = getSummaryDataRaw(results[1].user_metrics, "median_speed");
        }
        for (var i in durationData) {
          if ($scope.userDataSaved()) {
            var userDataFromStorage = CalorieCal.get();
            var met = CalorieCal.getMet(durationData[i].key, speedData[i].values);
            var gender = userDataFromStorage.gender;
            var heightUnit = userDataFromStorage.heightUnit;
            var height = userDataFromStorage.height;
            var weightUnit = userDataFromStorage.weightUnit;
            var weight = userDataFromStorage.weight;
            var age = userDataFromStorage.age;
            met = CalorieCal.getCorrectedMet(met, gender, age, height, heightUnit, weight, weightUnit);
          } else {
            var met = CalorieCal.getMet(durationData[i].key, speedData[i].values);
          }
          $scope.caloriesData.userCalories += 
            Math.round(CalorieCal.getuserCalories(durationData[i].values / 3600, met)) //+ ' cal'
        }
        $scope.numberOfCookies = Math.floor($scope.caloriesData.userCalories/food.chocolateChip);
        $scope.numberOfIceCreams = Math.floor($scope.caloriesData.userCalories/food.vanillaIceCream);
        $scope.numberOfBananas = Math.floor($scope.caloriesData.userCalories/food.banana);
          if(first){
            lastWeekCalories = $scope.caloriesData.userCalories;
          }
        $scope.caloriesData.lastWeekUserCalories = lastWeekCalories;

        if (results[0].aggregate_metrics) {
          var avgDurationData = getAvgSummaryDataRaw(results[0].aggregate_metrics, "duration");
        }
        if (results[1].aggregate_metrics) {
          var avgSpeedData = getAvgSummaryDataRaw(results[1].aggregate_metrics, "median_speed");
        }
        for (var i in avgDurationData) {

          var met = CalorieCal.getMet(avgDurationData[i].key, avgSpeedData[i].values);

          $scope.caloriesData.aggrCalories +=
            Math.round(CalorieCal.getuserCalories(avgDurationData[i].values / 3600, met)) //+ ' cal'
        }

        if (results[3].user_metrics) {
          var userCarbonData = getSummaryDataRaw(results[3].user_metrics, 'distance');
          var optimalDistance = getOptimalFootprintDistance(results[3].user_metrics);
          var worstDistance = getWorstFootprintDistance(results[3].user_metrics);
          var date1 = $scope.selectCtrl.fromDateTimestamp;
          var date2 = $scope.selectCtrl.toDateTimestamp;
          var duration = moment.duration(date2.diff(date1));
          var days = duration.asDays();
          //$scope.ca2020 = 43.771628 / 5 * days; // kg/day
          $scope.carbonData.ca2035 = Math.round(40.142892 / 5 * days) + ' kg CO₂'; // kg/day
          $scope.carbonData.ca2050 = Math.round(8.28565 / 5 * days) + ' kg CO₂';
          //$scope.carbonData.userCarbon = [];
          for (var i in userCarbonData) {
            //$scope.carbonData.userCarbon.push({key: userCarbonData[i].key, values: FootprintHelper.getFootprint(userCarbonData[i].values, userCarbonData[i].key)});
            if (userCarbonData[i].key === "IN_VEHICLE") {
              $scope.carbonData.userVehicleRange = FootprintHelper.getFootprintRaw(userCarbonData[i].values, userCarbonData[i].key);
              $scope.carbonData.userCarbon = FootprintHelper.getFootprint(userCarbonData[i].values, userCarbonData[i].key);              
              $scope.carbonData.optimalCarbon = FootprintHelper.getFootprint(optimalDistance, userCarbonData[i].key);
              $scope.carbonData.worstCarbon = FootprintHelper.getFootprint(worstDistance, userCarbonData[i].key)
              if(first){
                lastWeekCarbon = $scope.carbonData.userCarbon;
                first = false; //If there is data from last week store the data only first time
              }
            $scope.carbonData.lastWeekUserCarbon = lastWeekCarbon;
            }
          }
        }
        if (results[3].aggregate_metrics) {
          var aggrCarbonData = getAvgSummaryDataRaw(results[3].aggregate_metrics, 'distance');
          for (var i in aggrCarbonData) {
            if (aggrCarbonData[i].key === "IN_VEHICLE") {
              $scope.carbonData.aggrVehicleRange = FootprintHelper.getFootprintRaw(aggrCarbonData[i].values, aggrCarbonData[i].key);
              $scope.carbonData.aggrCarbon = FootprintHelper.getFootprint(aggrCarbonData[i].values, aggrCarbonData[i].key);
            }
          }
        }
        $scope.summaryData.defaultSummary = $scope.summaryData.userSummary;
        var change = "";
        var lastWeekCarAndTrain = lastWeekCarbon.replace(/ /g,'').split("~");
        var twoWeekAgoCarAndTrain = twoWeeksAgoCarbon.replace(/ /g,'').split("~");
        var calculation = (((parseInt(lastWeekCarAndTrain[0]) + parseInt(lastWeekCarAndTrain[1])) / 2)
                          / ((parseInt(twoWeekAgoCarAndTrain[0]) + parseInt(twoWeekAgoCarAndTrain[1])) / 2))
                          * 100 - 100
        $scope.carbonData.changeInPercentage = Math.abs(Math.round(calculation)) + "%"
        if(parseInt(lastWeekCarAndTrain[0])>parseInt(twoWeekAgoCarAndTrain[0])){
          $scope.carbonData.change = " increase over a week";
          $scope.up = true;
          $scope.down = false;
        } else {
          $scope.carbonData.change = " decrease over a week"
          $scope.up = false;
          $scope.down = true;
        }
        $scope.uictrl.showContent = true;

        if (angular.isDefined($scope.uictrl.showMe? $scope.chartDataUser: $scope.chartDataAggr)) {
          $scope.$apply(function() {
            $scope.showCharts($scope.uictrl.showMe? $scope.chartDataUser: $scope.chartDataAggr);
          })
        } else {
          $scope.$apply(function() {
            $scope.showCharts([]);
            console.log("did not find aggregate result in response data "+JSON.stringify(results[2]));
          });
        }
      });
    };

    var getTwoWeeksAgo = function() {
       getDistance().then(function(result) {
          if (result.user_metrics) {
            var userCarbonData = getSummaryDataRaw(result.user_metrics, 'distance');
            for (var i in userCarbonData) {
              if (userCarbonData[i].key === "IN_VEHICLE") {
                twoWeeksAgoCarbon = FootprintHelper.getFootprint(userCarbonData[i].values, userCarbonData[i].key);              
              }
            }
          }
       });
    };

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
    var getAvgDataFromMetrics = function(metrics) {
        var mode_bins = {};
        var nUsers = 0;
        metrics.forEach(function(metric) {
            for (var field in metric) {
                // TODO: Consider creating a prefix such as M_ to signal
                // modes. Is that really less fragile than caps, though?
                // Here, we check if the string is all upper case by
                // converting it to upper case and seeing if it is changed
                if (field == field.toUpperCase()) {
                    if (field === "WALKING" || field === "RUNNING") {
                      field = "ON_FOOT";
                    }
                    if (field in mode_bins == false) {
                        mode_bins[field] = []
                    }
                    mode_bins[field].push([metric.ts, Math.round(metric[field] / metric.nUsers), metric.fmt_time]);
                }
            }
        });
        var rtn = [];
        for (var mode in mode_bins) {
          var val_arrays = rtn.push({key: mode, values: mode_bins[mode]});
        }
        return rtn;
    }

    var getDataFromMetrics = function(metrics) {
        var mode_bins = {};
        metrics.forEach(function(metric) {
            for (var field in metric) {
                // TODO: Consider creating a prefix such as M_ to signal
                // modes. Is that really less fragile than caps, though?
                // Here, we check if the string is all upper case by
                // converting it to upper case and seeing if it is changed
                if (field == field.toUpperCase()) {
                    if (field === "WALKING" || field === "RUNNING") {
                      field = "ON_FOOT";
                    }
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
    var getSummaryDataRaw = function(metrics, metric) {
        var data = getDataFromMetrics(metrics);
        for (var i = 0; i < data.length; i++) {
          var temp = 0;
          for (var j = 0; j < data[i].values.length; j++) {
            temp += data[i].values[j][1];
          }
          if (metric === "median_speed") {
            data[i].values = Math.round(temp / data[i].values.length);
          } else {
            data[i].values = Math.round(temp);
          }

        }
        return data;
    }
    /*var sortNumber = function(a,b) {
      return a - b;
    }*/
    var getOptimalFootprintDistance = function(metrics){
      var data = getDataFromMetrics(metrics);
      var distance = 0;
      var longTrip = 5000;
      for(var i = 0; i < data.length; i++) {
        if(data[i].key == "IN_VEHICLE") {
          for(var j = 0; j < data[i].values.length; j++){
            if(data[i].values[j][1] >= longTrip){
              distance += data[i].values[j][1];
            }
          }
        }
      }
      return distance;
    }
    var getWorstFootprintDistance = function(metrics){
      var data = getDataFromMetrics(metrics);
      var distance = 0;
      for(var i = 0; i < data.length; i++) {
        for(var j = 0; j < data[i].values.length; j++){
          distance += data[i].values[j][1];
        }
      }
      return distance;
    }
    var getAvgSummaryDataRaw = function(metrics, metric) {
        var data = getAvgDataFromMetrics(metrics);
        for (var i = 0; i < data.length; i++) {
          var temp = 0;
          for (var j = 0; j < data[i].values.length; j++) {
            temp += data[i].values[j][1];
          }
          if (metric === "median_speed") {
            data[i].values = Math.round(temp / data[i].values.length);
          } else {
            data[i].values = Math.round(temp);
          }

        }
        return data;
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
          if (metric === "median_speed") {
            data[i].values = Math.round(temp / data[i].values.length  ) + ' ' + unit;
          } else if(metric === "distance" && temp.toString().length > 4){
            data[i].values = Math.round(temp / 1000) + ' ' + "km";
          } else if(metric === "duration" && temp > 60){
            data[i].values = Math.round(temp / 60) + ' ' + "mins";
          } else {
            data[i].values = Math.round(temp) + ' ' + unit;
          }

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
    /*$scope.getDefaultCarboGoalCharData = function() {
      var lower = 0;
      var upper = 100;
      $scope.carbonGoalChartData = { // first elem: absolute left or right distance, second elem: number
        min: [2, lower], // 2 for offset padding
        max: [2, upper],
      }     
    }
    $scope.getDefaultCarboGoalCharData();
    $scope.getCarbonGoalChartData = function() {
      var date1 = $scope.selectCtrl.fromDateTimestamp;
      var date2 = $scope.selectCtrl.toDateTimestamp;
      var duration = moment.duration(date2.diff(date1));
      var days = duration.asDays();



      var lower = $scope.carbonData.defaultVehicleRange[0];
      var upper = $scope.carbonData.defaultVehicleRange[1];
      var ca2020 = 43.771628 / 5 * days; // kg/day
      var ca2035 = 40.142892 / 5 * days; // kg/day
      var usa2050 = 8.28565 / 5 * days;
      var temp2020offset = Math.round((ca2020 - lower) / (upper - lower) * 100);
      temp2020offset = temp2020offset > 100? 98 : temp2020offset < 0? 2 : temp2020offset;
      var temp2035offset = Math.round((ca2035 - lower) / (upper - lower) * 100);
      temp2035offset = temp2035offset > 100? 98 : temp2035offset < 0? 2 : temp2035offset;
      $scope.carbonGoalChartData = { // first elem: absolute left or right distance, second elem: number
        min: [2, lower], // 2 for offset padding
        max: [2, upper],
        ca2020: [temp2020offset, ca2020],
        ca2035: [temp2035offset, ca2035]

      };
      $scope.showca2020 = false;
      $scope.showca2035 = false;

    }
    $scope.shouldshowca2020 = function() {
      return $scope.showca2020;
    }
    $scope.shouldshowca2035 = function() {
      return $scope.showca2035;
    }
    $scope.toggleca2020 = function() {
      $scope.showca2020 = !$scope.showca2020;
    }
    $scope.toggleca2035 = function() {
      $scope.showca2035 = !$scope.showca2035;
    }*/
    $scope.toggle = function() {
      if (!$scope.uictrl.showMe) {
        $scope.uictrl.showMe = true;
        $scope.showCharts($scope.chartDataUser);
        //$scope.summaryData.defaultSummary = $scope.summaryData.userSummary;
        //$scope.caloriesData.defaultCalories = $scope.caloriesData.userCalories;
        //$scope.carbonData.defaultCarbon = $scope.carbonData.userCarbon;
        //$scope.carbonData.defaultVehicleRange =  $scope.carbonData.userVehicleRange;
        //$scope.getCarbonGoalChartData();

      } else {
        $scope.uictrl.showMe = false;
        $scope.showCharts($scope.chartDataAggr);
        ////$scope.summaryData.defaultSummary = $scope.summaryData.userSummary;
        //$scope.summaryData.defaultSummary = $scope.summaryData.aggrSummary;
        ////$scope.caloriesData.defaultCalories = $scope.caloriesData.userCalories;
        //$scope.caloriesData.defaultCalories = $scope.caloriesData.aggrCalories;
        ////$scope.carbonData.defaultCarbon = $scope.carbonData.userCarbon;
        //$scope.carbonData.defaultCarbon = $scope.carbonData.aggrCarbon;
        //$scope.carbonData.defaultVehicleRange =  $scope.carbonData.aggrVehicleRange;
        //$scope.getCarbonGoalChartData();
      }
    }
    var initSelect = function() {
      var now = moment();
      var weekAgoFromNow = moment().subtract(7, 'd');
      $scope.selectCtrl.metric = 'count';
      $scope.selectCtrl.metricString = "COUNT";
      $scope.selectCtrl.freq = 'DAILY';
      $scope.selectCtrl.freqString = "DAILY";
      $scope.selectCtrl.pandaFreq = 'D';
      $scope.selectCtrl.pandaFreqString = "DAILY";
      // local_date saved as localdate
      $scope.selectCtrl.fromDateLocalDate = moment2Localdate(weekAgoFromNow);
      $scope.selectCtrl.toDateLocalDate = moment2Localdate(now);
      // ts saved as moment
      $scope.selectCtrl.fromDateTimestamp= weekAgoFromNow;
      $scope.selectCtrl.toDateTimestamp = now;

      $scope.selectCtrl.fromDateWeekdayString = "All"
      $scope.selectCtrl.toDateWeekdayString = "All"

      $scope.selectCtrl.fromDateWeekdayValue = null;
      $scope.selectCtrl.toDateWeekdayValue = null;

      $scope.selectCtrl.region = null;
    };


  $scope.selectCtrl = {}
  initSelect(); 
  $timeout(function() {
    getDataOfTwoWeeksAgo();
  }, 1)
  $timeout(function() {
    getData();
  }, 2)

  $scope.modeIcon = function(key) {
    var icons = {"BICYCLING":"ion-android-bicycle",
    "ON_FOOT":" ion-android-walk",
    "IN_VEHICLE":"ion-speedometer",
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


  $scope.data = {};

  $scope.userData = {
    gender: -1,
    heightUnit: 1,
    weightUnit: 1
  };
  $scope.caloriePopup = function() {
    $ionicPopup.show({
      templateUrl: 'templates/caloriePopup.html',
      title: '',
      scope: $scope,
      buttons: [
        { text: 'Cancel' },
        {
          text: '<b>Confirm</b>',
          type: 'button-positive',
          onTap: function(e) {
            if (!($scope.userData.gender != -1 && $scope.userData.age && $scope.userData.weight && $scope.userData.height)) {
              e.preventDefault();
            } else {
              $scope.storeUserData();
              // refresh
            }
          }
        }
      ]
    });
  }
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

  $scope.extendFootprintCard = function() {
    expandFootprintDOM();
    if($scope.expandedf){
      $scope.expandedf = false;
    } else {
      $scope.expandedf = true
    }
  }
  $scope.checkFootprintCardExpanded = function() {
        return ($scope.expandedf)? "icon ion-chevron-up" : "icon ion-chevron-down";
  }
  $scope.extendCalorieCard = function() {
    expandCalorieDOM();
    if($scope.expandedc){
      $scope.expandedc = false;
    } else {
      $scope.expandedc = true
    }
  }
  $scope.checkCalorieCardExpanded = function() {
        return ($scope.expandedc)? "icon ion-chevron-up" : "icon ion-chevron-down";
  }
  var expandFootprintDOM = function() {
    var div = document.getElementById('dashboard-footprint');
    if (div.style.height == '470px'){ 
      div.style.height = '140px'
      $ionicScrollDelegate.scrollTop()
    } else { 
      div.style.height = '470px'
    }
  }
  var expandCalorieDOM = function() {
    var div = document.getElementById('dashboard-calorie');
    if (div.style.height == '350px'){ 
      div.style.height = '140px'
      $ionicScrollDelegate.scrollTop()
    } else { 
      div.style.height = '350px'
    }
  }

});
