'use strict';

angular.module('emission.main.metrics',['nvd3', 'emission.services', 'ionic-datepicker', 'emission.main.metrics.factory', 'angularLocalStorage'])

.controller('MetricsCtrl', function($scope, $ionicActionSheet, $ionicLoading,
                                    CommHelper, $window, $ionicPopup,
                                    FootprintHelper, CalorieCal, $ionicModal, $timeout, storage,
                                    $ionicScrollDelegate, $rootScope, $location,  $state, ReferHelper) {
    var lastTwoWeeksQuery = true;
    var first = true;
    var lastWeekCalories = 0;
    var lastWeekCarbon = "0 kg CO₂";
    var twoWeeksAgoCarbon = "";
    var lastWeekCarbonInt = [];
    var twoWeeksAgoCarbonInt = [];
    var twoWeeksAgoCalories = 0;
    
    $scope.setCookie = function(){
      $scope.foodCompare = 'cookie';
      storage.set('foodCompare', 'cookie');
    }
    $scope.setIceCream = function(){
      $scope.foodCompare = 'iceCream';
      storage.set('foodCompare', 'iceCream');
    }
    $scope.setBanana = function(){
      $scope.foodCompare = 'banana';
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
      showContent: false,
      showTrips: false,
      showDuration: false,
      showDistance: false,
      showSpeed: false,
    }
    $scope.showChart = function() {
      $scope.uictrl.showSummary = false;
      $scope.uictrl.showChart = true;
      $scope.showDistance();
    }
    $scope.showDistance = function() {
      $scope.uictrl.showTrips = false;
      $scope.uictrl.showDuration = false;
      $scope.uictrl.showSpeed = false;
      $scope.uictrl.showDistance = true;
    }
    $scope.showTrips = function() {
      $scope.uictrl.showDistance = false;
      $scope.uictrl.showSpeed = false;
      $scope.uictrl.showDuration = false;
      $scope.uictrl.showTrips = true;
    }
    $scope.showDuration = function() {
      $scope.uictrl.showSpeed = false;
      $scope.uictrl.showDistance = false;
      $scope.uictrl.showTrips = false;
      $scope.uictrl.showDuration = true;
    }
    $scope.showSpeed = function() {
      $scope.uictrl.showTrips = false;
      $scope.uictrl.showDuration = false;
      $scope.uictrl.showDistance = false;
      $scope.uictrl.showSpeed = true;
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
    $scope.distanceButtonClass = function() {
      return $scope.uictrl.showDistance? "distance-button-active hvcenter" : "distance-button hvcenter";
    }
    $scope.tripsButtonClass = function() {
      return $scope.uictrl.showTrips? "trips-button-active hvcenter" : "trips-button hvcenter";
    }
    $scope.durationButtonClass = function() {
      return $scope.uictrl.showDuration? "duration-button-active hvcenter" : "duration-button hvcenter";
    }
    $scope.speedButtonClass = function() {
      return $scope.uictrl.showSpeed? "speed-button-active hvcenter" : "speed-button hvcenter";
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
    $scope.currentQueryForCalorie = function() {
      return $scope.uictrl.current == "Last week"? "user-calorie-percentage" : "user-calorie-no-percentage";
    }
    $scope.currentQueryForCarbon = function() {
      return $scope.uictrl.current == "Last week"? "user-carbon-percentage" : "user-carbon-no-percentage";
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
                    var day = new Date(d * 1000)
                    day.setDate(day.getDate()+1) // Had to add a day to match date with data
                    return d3.time.format('%y-%m-%d')(day)
                },
                showMaxMin: false,
                staggerLabels: true
            },
            yAxis: {
              axisLabel: "Number",
              axisLabelDistance: -10
            },
            callback: function(chart) {
              chart.multibar.dispatch.on('elementClick', function(bar) {
                  var date = bar.data[2].slice(0,10);
                  $rootScope.barDetailDate = moment(date);
                  $rootScope.barDetail = true;
                  $state.go('root.main.diary');
                  console.log($rootScope.barDetailDate);
              })
            }
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

    var getData = function(){
      $scope.getMetricsHelper();
    }

    $scope.getMetricsHelper = function() {
      $scope.uictrl.showContent = false;
      setMetricsHelper(getMetrics);
    }

    var setMetricsHelper = function(metricsToGet) {
      if ($scope.uictrl.showRange) {
        setMetrics('timestamp', metricsToGet);
      } else if ($scope.uictrl.showFilter) {
        setMetrics('local_date', metricsToGet);
      } else {
        console.log("Illegal time_type"); // Notice that you need to set query
      }
      if($scope.modal.isShown()){
        $scope.modal.hide();
      }
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
          metric: ""
        };
      } else if (mode === 'timestamp') { // timestamp range
        if(lastTwoWeeksQuery) {
          var tempFrom = moment2Timestamp(moment().utc().subtract(14, 'days'));
          var tempTo = moment2Timestamp(moment().utc().subtract(1, 'days'))
          lastTwoWeeksQuery = false; // Only get last week's data once          
        } else {
          var tempFrom = moment2Timestamp($scope.selectCtrl.fromDateTimestamp);
          var tempTo = moment2Timestamp($scope.selectCtrl.toDateTimestamp);
          console.log($scope.selectCtrl.fromDateTimestamp);
          console.log($scope.selectCtrl.toDateTimestamp);
        }
        data = {
          freq: $scope.selectCtrl.pandaFreq,
          start_time: tempFrom,
          end_time: tempTo,
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
      if(!first){
        $scope.uictrl.current = "Custom";
      }
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
      $scope.caloriesData.changeInPercentage = "0%"
      $scope.caloriesData.change = " change";

      $scope.carbonData.userCarbon = "0 kg CO₂";
      $scope.carbonData.aggrCarbon = "0 kg CO₂";
      $scope.carbonData.optimalCarbon = "0 kg CO₂";
      $scope.carbonData.worstCarbon = "0 kg CO₂";
      $scope.carbonData.lastWeekUserCarbon = "0 kg CO₂";
      $scope.carbonData.changeInPercentage = "0%";
      $scope.carbonData.change = " change";

      $scope.summaryData.userSummary = [];
      $scope.chartDataUser = {};
      $scope.chartDataAggr = {};
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
          // Don't store the any other data as last we data
         }
        if(first){
          var twoWeeksAgoDuration = results[0].user_metrics.slice(0,7); 
          var twoWeeksAgoMedianSpeed = results[1].user_metrics.slice(0,7);
          var twoWeeksAgoDistance = results[3].user_metrics.slice(0,7)
          var userDuration = results[0].user_metrics.slice(7);
          var usedMedianSpeed = results[1].user_metrics.slice(7);
          var userCount = results[2].user_metrics.slice(7);
          var userDistance = results[3].user_metrics.slice(7);
          var aggDuration = results[0].aggregate_metrics.slice(7);
          var aggMedianSpeed = results[1].aggregate_metrics.slice(7);
          var aggCount = results[2].aggregate_metrics.slice(7);
          var aggDistance = results[3].aggregate_metrics.slice(7);
        } else {
          var userDuration = results[0].user_metrics;
          var usedMedianSpeed = results[1].user_metrics;
          var userCount = results[2].user_metrics;
          var userDistance = results[3].user_metrics;
          var aggDuration = results[0].aggregate_metrics;
          var aggMedianSpeed = results[1].aggregate_metrics;
          var aggCount = results[2].aggregate_metrics;
          var aggDistance = results[3].aggregate_metrics;
        }
        $scope.summaryData.userSummary.duration = getSummaryData(userDuration, "duration");
        $scope.summaryData.userSummary.median_speed = getSummaryData(usedMedianSpeed, "median_speed");
        $scope.summaryData.userSummary.count = getSummaryData(userCount, "count");
        $scope.summaryData.userSummary.distance = getSummaryData(userDistance, "distance");
        $scope.chartDataUser.duration = userDuration? userDuration : [];
        $scope.chartDataAggr.duration = aggDuration? aggDuration : [];
        $scope.chartDataUser.speed = usedMedianSpeed? usedMedianSpeed : [];
        $scope.chartDataAggr.speed = aggMedianSpeed? aggMedianSpeed : [];
        $scope.chartDataUser.count = userCount? userCount : [];
        $scope.chartDataAggr.count = aggCount? aggCount : [];
        $scope.chartDataUser.distance = userDistance? userDistance : [];
        $scope.chartDataAggr.distance = aggDistance? aggDistance : [];

        if (userDuration) {
          var durationData = getSummaryDataRaw(userDuration, "duration");
        }
        if (usedMedianSpeed) {
          var speedData = getSummaryDataRaw(usedMedianSpeed, "median_speed");
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

        if (aggDuration) {
          var avgDurationData = getAvgSummaryDataRaw(aggDuration, "duration");
        }
        if (aggMedianSpeed) {
          var avgSpeedData = getAvgSummaryDataRaw(aggMedianSpeed, "median_speed");
        }
        for (var i in avgDurationData) {

          var met = CalorieCal.getMet(avgDurationData[i].key, avgSpeedData[i].values);

          $scope.caloriesData.aggrCalories +=
            Math.round(CalorieCal.getuserCalories(avgDurationData[i].values / 3600, met)) //+ ' cal'
        }

        if (userDistance) {
          var userCarbonData = getSummaryDataRaw(userDistance, 'distance');
          var optimalDistance = getOptimalFootprintDistance(userDistance);
          var worstDistance = getWorstFootprintDistance(userDistance);
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
              $scope.carbonData.userCarbon = FootprintHelper.getFootprint(userCarbonData[i].values, userCarbonData[i].key);              
              $scope.carbonData.optimalCarbon = FootprintHelper.getFootprint(optimalDistance, userCarbonData[i].key);
              $scope.carbonData.worstCarbon = FootprintHelper.getFootprint(worstDistance, userCarbonData[i].key);
              lastWeekCarbonInt = FootprintHelper.getFootprintRaw(userCarbonData[i].values, userCarbonData[i].key);
              if(first){
                lastWeekCarbon = $scope.carbonData.userCarbon;
              }
            $scope.carbonData.lastWeekUserCarbon = lastWeekCarbon;
            }
          }
        }
        if (aggDistance) {
          var aggrCarbonData = getAvgSummaryDataRaw(aggDistance, 'distance');
          for (var i in aggrCarbonData) {
            if (aggrCarbonData[i].key === "IN_VEHICLE") {
              $scope.carbonData.aggrVehicleRange = FootprintHelper.getFootprintRaw(aggrCarbonData[i].values, aggrCarbonData[i].key);
              $scope.carbonData.aggrCarbon = FootprintHelper.getFootprint(aggrCarbonData[i].values, aggrCarbonData[i].key);
            }
          }
        }
        $scope.summaryData.defaultSummary = $scope.summaryData.userSummary;

        if(first){
          if (twoWeeksAgoDistance) {
            var userCarbonData = getSummaryDataRaw(twoWeeksAgoDistance, 'distance');
            for (var i in userCarbonData) {
              if (userCarbonData[i].key === "IN_VEHICLE") {
                twoWeeksAgoCarbon = FootprintHelper.getFootprint(userCarbonData[i].values, userCarbonData[i].key);              
                twoWeeksAgoCarbonInt = FootprintHelper.getFootprintRaw(userCarbonData[i].values, userCarbonData[i].key);              
              }
            }
          }
          if (twoWeeksAgoDuration) {
            var durationData = getSummaryDataRaw(twoWeeksAgoDuration, "duration");
          }
          if (twoWeeksAgoMedianSpeed) {
            var speedData = getSummaryDataRaw(twoWeeksAgoMedianSpeed, "median_speed");
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
            twoWeeksAgoCalories += 
              Math.round(CalorieCal.getuserCalories(durationData[i].values / 3600, met));
          }

          var change = "";
          var calculation = (((lastWeekCarbonInt[0] + lastWeekCarbonInt[1]) / 2)
                            / ((twoWeeksAgoCarbonInt[0] + twoWeeksAgoCarbonInt[1]) / 2))
                            * 100 - 100;
          
          if(lastWeekCarbonInt[0] > twoWeeksAgoCarbonInt[0]){
            $scope.carbonData.change = " increase over a week";
            $scope.carbonUp = true;
            $scope.carbonDown = false;
          } else {
            $scope.carbonData.change = " decrease over a week"
            $scope.carbonUp = false;
            $scope.carbonDown = true;
          }
          $scope.carbonData.changeInPercentage = Math.abs(Math.round(calculation)) + "%"

          $scope.caloriesData.changeInPercentage = Math.abs(Math.round((lastWeekCalories/twoWeeksAgoCalories) * 100 - 100)) + "%";
          if(lastWeekCalories > twoWeeksAgoCalories){
            $scope.caloriesData.change = " increase over a week";
            $scope.caloriesUp = true;
            $scope.caloriesDown = false;
          } else {
            $scope.caloriesData.change = " decrease over a week"
            $scope.caloriesUp = false;
            $scope.caloriesDown = true;
          }

          first = false; //If there is data from last week store the data only first time
        }

        $scope.uictrl.showContent = true;

        if (angular.isDefined($scope.uictrl.showMe? $scope.chartDataUser: $scope.chartDataAggr)) { //Only have to check one because 
          $scope.$apply(function() {
            $scope.showCharts($scope.uictrl.showMe? $scope.chartDataUser: $scope.chartDataAggr);
          })
        } else {
          $scope.$apply(function() {
            $scope.showCharts([]);
            console.log("did not find aggregate result in response data "+JSON.stringify(results[2]));
          });
        }
      }, function(error) {
        $ionicLoading.hide();
        $ionicPopup.alert({
          title: "Error Loading Data",
          template: ''
        });
        console.log(error);
      });
    };

    $scope.showCharts = function(agg_metrics) {
      $scope.data.count = getDataFromMetrics(agg_metrics.count);
      $scope.data.distance = getDataFromMetrics(agg_metrics.distance);
      $scope.data.duration = getDataFromMetrics(agg_metrics.duration);
      $scope.data.speed = getDataFromMetrics(agg_metrics.speed);
      $scope.countOptions = angular.copy($scope.options)
      $scope.countOptions.chart.yAxis.axisLabel = 'Number';
      $scope.distanceOptions = angular.copy($scope.options)
      $scope.distanceOptions.chart.yAxis.axisLabel = 'm';
      $scope.durationOptions = angular.copy($scope.options)
      $scope.durationOptions.chart.yAxis.axisLabel = 'secs'
      $scope.speedOptions = angular.copy($scope.options)
      $scope.speedOptions.chart.yAxis.axisLabel = 'm/sec'
    };
    $scope.pandaFreqOptions = [
      {text: "DAILY", value: 'D'},
      {text: "WEEKLY", value: 'W'},
      {text: "BIWEEKLY", value: '2W'},
      {text: "MONTHLY", value: 'M'},
      {text: "YEARLY", value: 'A'}
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
        var fieldPhone = "";
        metrics.forEach(function(metric) {
            for (var field in metric) {
                // TODO: Consider creating a prefix such as M_ to signal
                // modes. Is that really less fragile than caps, though?
                // Here, we check if the string is all upper case by
                // converting it to upper case and seeing if it is changed
                if (field == field.toUpperCase()) {
                    if (field === "WALKING" || field === "RUNNING") {
                      fieldPhone = "ON_FOOT";
                    } else {
                      fieldPhone = field;
                    }
                    if (fieldPhone in mode_bins == false) {
                        mode_bins[fieldPhone] = []
                    }
                    mode_bins[fieldPhone].push([metric.ts, metric[field], metric.fmt_time]);
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
        $scope.showCharts($scope.chartDataUser);

      } else {
        $scope.uictrl.showMe = false;
        $scope.showCharts($scope.chartDataAggr);
      }
    }
    var initSelect = function() {
      var now = moment().utc();
      var weekAgoFromNow = moment().utc().subtract(7, 'd');
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
    getData();
  }, 1)

  $scope.modeIcon = function(key) {
    var icons = {"BICYCLING":"ion-android-bicycle",
    "ON_FOOT":" ion-android-walk",
    "IN_VEHICLE":"ion-speedometer",
    "UNKNOWN": "ion-ios-help",
    "AIR_OR_HSR": "ion-plane"}
    return icons[key];
  }

  $scope.setCurDayFrom = function(val) {
    if (val) {
      $scope.selectCtrl.fromDateTimestamp = moment(val).utc();
      $scope.datepickerObjFrom.inputDate = val;
    } else {
      $scope.datepickerObjFrom.inputDate = $scope.selectCtrl.fromDateTimestamp.toDate();
    }

  };
  $scope.setCurDayTo = function(val) {
    if (val) {
      $scope.selectCtrl.toDateTimestamp = moment(val).utc();
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
    if($scope.expandedc){
      $scope.expandedc = false;
    } else {
      $scope.expandedc = true
    }
  }
  $scope.checkCalorieCardExpanded = function() {
        return ($scope.expandedc)? "icon ion-chevron-up" : "icon ion-chevron-down";
  }

  $scope.changeFootprintCardHeight = function() {
        return ($scope.expandedf)? "expanded-footprint-card" : "small-footprint-card";
  }

  $scope.changeCalorieCardHeight = function() {
        return ($scope.expandedc)? "expanded-calorie-card" : "small-calorie-card";
  }

});
