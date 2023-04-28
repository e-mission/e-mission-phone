'use strict';

angular.module('emission.main.metrics',['nvd3',
                                        'emission.services',
                                        'ionic-datepicker',
                                        'emission.config.imperial',
                                        'emission.main.metrics.factory',
                                        'emission.main.metrics.mappings',
                                        'emission.stats.clientstats',
                                        'emission.plugin.kvstore',
                                        'emission.plugin.logger'])

.controller('MetricsCtrl', function($scope, $ionicActionSheet, $ionicLoading,
                                    ClientStats, CommHelper, $window, $ionicPopup,
                                    ionicDatePicker, $ionicPlatform,
                                    FootprintHelper, CalorieCal, ImperialConfig, $ionicModal, $timeout, KVStore, CarbonDatasetHelper,
                                    $rootScope, $location, $state, ReferHelper, Logger,
                                    $translate) {
    var lastTwoWeeksQuery = true;
    $scope.defaultTwoWeekUserCall = true;

    var DURATION = "duration";
    var MEAN_SPEED = "mean_speed";
    var COUNT = "count";
    var DISTANCE = "distance";

    var METRIC_LIST = [DURATION, MEAN_SPEED, COUNT, DISTANCE];
    var COMPUTATIONAL_METRIC_LIST = [DURATION, MEAN_SPEED, DISTANCE];

    /*
     * BEGIN: Data structures to parse and store the data in different formats.
     * So that we don't have to keep re-creating them over and over as we used
     * to, slowing down the processing.
     */

    /*
     These are metric maps, with the key as the metric, and the value as a
     list of ModeStatTimeSummary objects for the metric.
     i.e. {count: [
              {fmt_time: "2021-12-03T00:00:00+00:00",
                label_drove_alone: 4 label_walk: 1
                local_dt: {year: 2021, month: 12, day: 3, hour: 0, minute: 0, …}
                nUsers: 1
                ts: 1638489600},....],
         duration: [...]
         distance: [...]
         mean_speed: [...]}
    */
    $scope.userCurrentResults = {};
    $scope.userTwoWeeksAgo = {};
    $scope.aggCurrentResults = {};

    /*
     These are metric mode maps, with a nested map of maps. The outer key is
     the metric, and the inner key is the , with the key as the metric, and the
     inner key is the mode. The innermost value is the list of
     ModeStatTimeSummary objects for that mode.
     list of ModeStatTimeSummary objects for the metric.
     i.e. {
     count: [
        {key: drove_alone, values: : [[1638489600, 4, "2021-12-03T00:00:00+00:00"], ...]},
        { key: walk, values: [[1638489600, 4, "2021-12-03T00:00:00+00:00"],...]}],
     duration: [ { key: drove_alone, values: [...]}, {key: walk, values: [...]} ],
     distance: [ { key: drove_alone, values: [...]}, {key: walk, values: [...]} ],
     mean_speed: [ { key: drove_alone, values: [...]}, {key: walk, values: [...]} ]
     }
    */
    $scope.userCurrentModeMap = {};
    $scope.userTwoWeeksAgoModeMap = {};
    $scope.userCurrentModeMapFormatted = {};
    $scope.aggCurrentModeMap = {};
    $scope.aggCurrentModeMapFormatted = {};
    $scope.aggCurrentPerCapitaModeMap = {};

    /*
     These are summary mode maps, which have the same structure as the mode
     maps, but with a value that is a single array instead of an array of arrays.
     The single array is the summation of the values in the individual arrays of the non-summary mode maps.
     i.e. {
        count: [{key: "drove_alone", values: [10, "trips", "10 trips"],
                {key: "walk", values: [5, "trips", "5 trips"]}],

     duration: [ { key: drove_alone, values: [...]}, {key: walk, values: [...]} ],
     distance: [ { key: drove_alone, values: [...]}, {key: walk, values: [...]} ],
     mean_speed: [ { key: drove_alone, values: [...]}, {key: walk, values: [...]} ]
     }
    */
    $scope.userCurrentSummaryModeMap = {};
    $scope.userTwoWeeksAgoSummaryModeMap = {};
    $scope.aggCurrentSummaryModeMap = {};
    $scope.aggCurrentSummaryPerCapitaModeMap = {};

    /*
    $scope.onCurrentTrip = function() {
      window.cordova.plugins.BEMDataCollection.getState().then(function(result) {
        Logger.log("Current trip state" + JSON.stringify(result));
        if(JSON.stringify(result) ==  "\"STATE_ONGOING_TRIP\""||
          JSON.stringify(result) ==  "\"local.state.ongoing_trip\"") {
          $state.go("root.main.current");
        }
      });
    };
    */

    $ionicPlatform.ready(function() {
        CarbonDatasetHelper.loadCarbonDatasetLocale().then(function(result) {
          getData();
        });
        // $scope.onCurrentTrip();
    });

    // If we want to share this function (see the pun?) between the control screen and the dashboard, we need to put it into a service/factory.
    // But it is not clear to me why it needs to be in the profile screen...
    var prepopulateMessage = {
      message: 'Have fun, support research and get active. Your privacy is protected. \nDownload the emission app:', // not supported on some apps (Facebook, Instagram)
      subject: 'Help Berkeley become more bikeable and walkable', // fi. for email
      url: 'https://bic2cal.eecs.berkeley.edu/#download'
    }

    $scope.share = function() {
        window.plugins.socialsharing.shareWithOptions(prepopulateMessage, function(result) {
            console.log("Share completed? " + result.completed); // On Android apps mostly return false even while it's true
            console.log("Shared to app: " + result.app); // On Android result.app is currently empty. On iOS it's empty when sharing is cancelled (result.completed=false)
        }, function(msg) {
            console.log("Sharing failed with message: " + msg);
        });
    }

    // TODO: Move this out into its own service
    var FOOD_COMPARE_KEY = 'foodCompare';
    $scope.setCookie = function(){
      $scope.foodCompare = 'cookie';
      return KVStore.set(FOOD_COMPARE_KEY, 'cookie');
    }
    $scope.setIceCream = function(){
      $scope.foodCompare = 'iceCream';
      return KVStore.set(FOOD_COMPARE_KEY, 'iceCream');
    }
    $scope.setBanana = function(){
      $scope.foodCompare = 'banana';
      return KVStore.set(FOOD_COMPARE_KEY, 'banana');
    }
    $scope.handleChosenFood = function(retVal) {
    if (retVal == null){
      $scope.setCookie();
    } else {
      var choosenFood = retVal;
      if(choosenFood == 'cookie')
        $scope.setCookie();
      else if (choosenFood == 'iceCream')
        $scope.setIceCream();
      else
        $scope.setBanana();
    }
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
      current: true,
      currentString: $translate.instant('metrics.last-week'),
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
      return $scope.uictrl.current ? "user-calorie-percentage" : "user-calorie-no-percentage";
    }
    $scope.currentQueryForCarbon = function() {
      return $scope.uictrl.current ? "user-carbon-percentage" : "user-carbon-no-percentage";
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
      CalorieCal.set(info).then(function() {
        $scope.savedUserData = info;
      });
    }

    $scope.loadUserData = function() {
        if(angular.isDefined($scope.savedUserData)) {
            // loaded or set
            return Promise.resolve();
        } else {
            return CalorieCal.get().then(function(userDataFromStorage) {
                $scope.savedUserData = userDataFromStorage;
            });
        }
    }

    $scope.userDataSaved = function() {
      // console.log("saved vals = "+JSON.stringify($scope.savedUserData));
      if (angular.isDefined($scope.savedUserData) && $scope.savedUserData != null) {
          return $scope.savedUserData.userDataSaved == true;
      } else {
          return false;
      };
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
            noData: $translate.instant('metrics.chart-no-data'),
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
                axisLabel: $translate.instant('metrics.chart-xaxis-date'),
                tickFormat: function(d) {
                    var day = new Date(d * 1000)
                    day.setDate(day.getDate()+1) // Had to add a day to match date with data
                    return d3.time.format('%y-%m-%d')(day)
                },
                showMaxMin: false,
                staggerLabels: true
            },
            yAxis: {
              axisLabel: $translate.instant('metrics.trips-yaxis-number'),
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
      $scope.loadUserData();
      KVStore.get(FOOD_COMPARE_KEY).then(function(retVal) {
        $scope.handleChosenFood(retVal);
      });
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
      if(angular.isDefined($scope.modal) && $scope.modal.isShown()){
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
          var tempFrom = moment2Timestamp(moment().utc().startOf('day').subtract(14, 'days'));
          var tempTo = moment2Timestamp(moment().utc().startOf('day').subtract(1, 'days'))
          lastTwoWeeksQuery = false; // Only get last week's data once
          $scope.defaultTwoWeekUserCall = true;
        } else {
          var tempFrom = moment2Timestamp($scope.selectCtrl.fromDateTimestamp);
          var tempTo = moment2Timestamp($scope.selectCtrl.toDateTimestamp);
          $scope.defaultTwoWeekUserCall = false;
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

   var getUserMetricsFromServer = function() {
      var clonedData = angular.copy(data);
      delete clonedData.metric;
      clonedData.metric_list = METRIC_LIST;
      clonedData.is_return_aggregate = false;
      var getMetricsResult = CommHelper.getMetrics(theMode, clonedData);
      return getMetricsResult;
   }
   var getAggMetricsFromServer = function() {
      var clonedData = angular.copy(data);
      delete clonedData.metric;
      clonedData.metric_list = METRIC_LIST;
      clonedData.is_return_aggregate = true;
      var getMetricsResult = CommHelper.getAggregateData(
        "result/metrics/timestamp", clonedData)
      return getMetricsResult;
   }

   var isValidNumber = function(number) {
     if (angular.isDefined(Number.isFinite)) {
       return Number.isFinite(number);
     } else {
       return !isNaN(number);
     }
   }

   var getMetrics = function() {
      $ionicLoading.show({
        template: $translate.instant('loading')
      });
      if(!$scope.defaultTwoWeekUserCall){
        $scope.uictrl.currentString = $translate.instant('metrics.custom');
        $scope.uictrl.current = false;
      }
      //$scope.uictrl.showRange = false;
      //$scope.uictrl.showFilter = false;
      $scope.uictrl.showVis = true;
      $scope.uictrl.showResult = true;
      $scope.uictrl.hasAggr = false;

      $scope.caloriesData = {};
      $scope.carbonData = {};
      $scope.summaryData = {};

      $scope.carbonData.optimalCarbon = "0 kg CO₂";

      $scope.summaryData.userSummary = [];
      $scope.chartDataUser = {};
      $scope.chartDataAggr = {};
      $scope.food = {
        'chocolateChip' : 78, //16g 1 cookie
        'vanillaIceCream' : 137, //1/2 cup
        'banana' : 105, //medium banana 118g
      };
      // calculation is at
      // https://github.com/e-mission/e-mission-docs/issues/696#issuecomment-1018181638
      $scope.carbon = {
        'phoneCharge' : 8.22 * 10**(-3), // 8.22 x 10^-6 metric tons CO2/smartphone charge
      };

      getUserMetricsFromServer().then(function(results) {
          $ionicLoading.hide();
          console.log("user results ", results);
          if(results.user_metrics.length == 1){
            console.log("$scope.defaultTwoWeekUserCall = "+$scope.defaultTwoWeekUserCall);
            $scope.defaultTwoWeekUserCall = false;
            // If there is no data from last week (ex. new user)
            // Don't store the any other data as last we data
          }
          $scope.fillUserValues(results.user_metrics);
          $scope.summaryData.defaultSummary = $scope.summaryData.userSummary;
          $scope.defaultTwoWeekUserCall = false; //If there is data from last week store the data only first time
          $scope.uictrl.showContent = true;
          if (angular.isDefined($scope.chartDataUser)) {
            $scope.$apply(function() {
              if ($scope.uictrl.showMe) {
                $scope.showCharts($scope.chartDataUser);
              }
            })
          } else {
            $scope.$apply(function() {
              $scope.showCharts([]);
              console.log("did not find aggregate result in response data "+JSON.stringify(results[2]));
            });
          }
      })
      .catch(function(error) {
        $ionicLoading.hide();
        if (error.includes("403")) {
          Logger.displayError("Invalid OPcode: while oading user data", error)
        } else {
          Logger.displayError("Error loading user data", error);
        }
      })

      getAggMetricsFromServer().then(function(results) {
          console.log("aggregate results ", results);
          $scope.fillAggregateValues(results.aggregate_metrics);
          $scope.uictrl.hasAggr = true;
          if (angular.isDefined($scope.chartDataAggr)) { //Only have to check one because
            // Restore the $apply if/when we go away from $http
            $scope.$apply(function() {
              if (!$scope.uictrl.showMe) {
                $scope.showCharts($scope.chartDataAggr);
              }
            })
          } else {
            $scope.$apply(function() {
              $scope.showCharts([]);
              console.log("did not find aggregate result in response data "+JSON.stringify(results[2]));
            });
          }
      })
      .catch(function(error) {
        $ionicLoading.hide();
        $scope.carbonData.aggrCarbon = $translate.instant('metrics.carbon-data-unknown');
        $scope.caloriesData.aggrCalories = $translate.instant('metrics.calorie-data-unknown');
        Logger.displayError("Error loading aggregate data, averages not available",
            error);
      });
   };

   $scope.fillUserValues = function(user_metrics_arr) {
        var seventhDayAgo = moment().utc().startOf('day').subtract(7, 'days');
        METRIC_LIST.forEach((m) => $scope.userCurrentResults[m] = []);

        METRIC_LIST.forEach((m) => $scope.userTwoWeeksAgo[m] = []);

        if($scope.defaultTwoWeekUserCall){
          for(var i in user_metrics_arr[0]) {
            if(seventhDayAgo.isSameOrBefore(moment.unix(user_metrics_arr[0][i].ts).utc())){
              METRIC_LIST.forEach((m, idx) => $scope.userCurrentResults[m].push(user_metrics_arr[idx][i]));
            } else {
              METRIC_LIST.forEach((m, idx) => $scope.userTwoWeeksAgo[m].push(user_metrics_arr[idx][i]));
            }
          }
          METRIC_LIST.forEach((m) => console.log("userTwoWeeksAgo."+m+" = "+$scope.userTwoWeeksAgo[m]));
        } else {
          METRIC_LIST.forEach((m, idx) => $scope.userCurrentResults[m] = user_metrics_arr[idx]);
        }

        METRIC_LIST.forEach((m) =>
            $scope.userCurrentModeMap[m] = getDataFromMetrics($scope.userCurrentResults[m], metric2valUser));

        COMPUTATIONAL_METRIC_LIST.forEach((m) =>
            $scope.userTwoWeeksAgoModeMap[m] = getDataFromMetrics($scope.userTwoWeeksAgo[m], metric2valUser));

        METRIC_LIST.forEach((m) =>
            $scope.userCurrentModeMapFormatted[m] = formatModeMap($scope.userCurrentModeMap[m], m));

        METRIC_LIST.forEach((m) =>
            $scope.userCurrentSummaryModeMap[m] = getSummaryDataRaw($scope.userCurrentModeMap[m], m));

        COMPUTATIONAL_METRIC_LIST.forEach((m) =>
            $scope.userTwoWeeksAgoSummaryModeMap[m] = getSummaryDataRaw($scope.userTwoWeeksAgoModeMap[m], m));

        METRIC_LIST.forEach((m) =>
            $scope.summaryData.userSummary[m] = getSummaryDataRaw($scope.userCurrentModeMap[m], m));

        $scope.isCustomLabelResult = isCustomLabels($scope.userCurrentModeMap);
        FootprintHelper.setUseCustomFootprint($scope.isCustomLabelResult);
        CalorieCal.setUseCustomFootprint($scope.isCustomLabelResult);

        $scope.chartDataUser = $scope.userCurrentModeMapFormatted;

        // Fill in user calorie information
        $scope.fillCalorieCardUserVals($scope.userCurrentSummaryModeMap.duration,
                                       $scope.userCurrentSummaryModeMap.mean_speed,
                                       $scope.userTwoWeeksAgoSummaryModeMap.duration,
                                       $scope.userTwoWeeksAgoSummaryModeMap.mean_speed);
        $scope.fillFootprintCardUserVals($scope.userCurrentModeMap.distance,
            $scope.userCurrentSummaryModeMap.distance,
            $scope.userTwoWeeksAgoModeMap.distance,
            $scope.userTwoWeeksAgoSummaryModeMap.distance);
   }

   $scope.fillAggregateValues = function(agg_metrics_arr) {
        METRIC_LIST.forEach((m) => $scope.aggCurrentResults[m] = []);
        if ($scope.defaultTwoWeekUserCall) {
            METRIC_LIST.forEach((m, idx) => $scope.aggCurrentResults[m] = agg_metrics_arr[idx].slice(0,7));
        } else {
            METRIC_LIST.forEach((m, idx) => $scope.aggCurrentResults[m] = agg_metrics_arr[idx]);
        }

        METRIC_LIST.forEach((m) =>
            $scope.aggCurrentModeMap[m] = getDataFromMetrics($scope.aggCurrentResults[m], metric2valUser));

        METRIC_LIST.forEach((m) =>
            $scope.aggCurrentModeMapFormatted[m] = formatModeMap($scope.aggCurrentModeMap[m], m));

        COMPUTATIONAL_METRIC_LIST.forEach((m) =>
            $scope.aggCurrentPerCapitaModeMap[m] = getDataFromMetrics($scope.aggCurrentResults[m], metric2valAvg));

        COMPUTATIONAL_METRIC_LIST.forEach((m) =>
            $scope.aggCurrentSummaryPerCapitaModeMap[m] = getSummaryDataRaw($scope.aggCurrentPerCapitaModeMap[m], m));

        $scope.chartDataAggr = $scope.aggCurrentModeMapFormatted;
        $scope.fillCalorieAggVals($scope.aggCurrentSummaryPerCapitaModeMap.duration,
                                  $scope.aggCurrentSummaryPerCapitaModeMap.mean_speed);
        $scope.fillFootprintAggVals($scope.aggCurrentSummaryPerCapitaModeMap.distance);
   }

   /*
    * We use the results to determine whether these results are from custom
    * labels or from the automatically sensed labels. Automatically sensedV
    * labels are in all caps, custom labels are prefixed by label, but have had
    * the label_prefix stripped out before this. Results should have either all
    * sensed labels or all custom labels.
    */
   var isCustomLabels = function(modeMap) {
      const isSensed = (mode) => mode == mode.toUpperCase();
      const isCustom = (mode) => mode == mode.toLowerCase();
      const metricSummaryChecksCustom = [];
      const metricSummaryChecksSensed = [];
      for (const metric in modeMap) {
        const metricKeys = modeMap[metric].map((e) => e.key);
        const isSensedKeys = metricKeys.map(isSensed);
        const isCustomKeys = metricKeys.map(isCustom);
        console.log("Checking metric keys", metricKeys, " sensed ", isSensedKeys,
            " custom ", isCustomKeys);
        const isAllCustomForMetric = isAllCustom(isSensedKeys, isCustomKeys);
        metricSummaryChecksSensed.push(!isAllCustomForMetric);
        metricSummaryChecksCustom.push(isAllCustomForMetric);
      }
      console.log("overall custom/not results for each metric = ", metricSummaryChecksCustom);
      return isAllCustom(metricSummaryChecksSensed, metricSummaryChecksCustom);
   }

   var isAllCustom = function(isSensedKeys, isCustomKeys) {
        const allSensed = isSensedKeys.reduce((a, b) => a && b, true);
        const anySensed = isSensedKeys.reduce((a, b) => a || b, false);
        const allCustom = isCustomKeys.reduce((a, b) => a && b, true);
        const anyCustom = isCustomKeys.reduce((a, b) => a || b, false);
        if ((allSensed && !anyCustom)) {
            return false; // sensed, not custom
        }
        if ((!anySensed && allCustom)) {
            return true; // custom, not sensed; false implies that the other option is true
        }
        Logger.displayError("Mixed entries that combine sensed and custom labels",
            "Please report to your program admin");
        return undefined;
    }

   $scope.fillCalorieCardUserVals = function(userDurationSummary, userMeanSpeedSummary,
                                             twoWeeksAgoDurationSummary, twoWeeksAgoMeanSpeedSummary) {
       $scope.caloriesData.userCalories = {low: 0, high: 0};
       const highestMET = CalorieCal.getHighestMET();
       for (var i in userDurationSummary) {
         var lowMET = $scope.getCorrectedMetFromUserData(userDurationSummary[i], userMeanSpeedSummary[i], 0);
         var highMET = $scope.getCorrectedMetFromUserData(userDurationSummary[i], userMeanSpeedSummary[i], highestMET);
         $scope.caloriesData.userCalories.low +=
           Math.round(CalorieCal.getuserCalories(userDurationSummary[i].values / 3600, lowMET)) //+ ' cal'
         $scope.caloriesData.userCalories.high +=
           Math.round(CalorieCal.getuserCalories(userDurationSummary[i].values / 3600, highMET)) //+ ' cal'
       }

       $scope.numberOfCookies = {
            low: Math.floor($scope.caloriesData.userCalories.low/
                                           $scope.food.chocolateChip),
            high: Math.floor($scope.caloriesData.userCalories.high/
                                           $scope.food.chocolateChip),
       };
       $scope.numberOfIceCreams = {
            low: Math.floor($scope.caloriesData.userCalories.low/
                                             $scope.food.vanillaIceCream),
            high: Math.floor($scope.caloriesData.userCalories.high/
                                             $scope.food.vanillaIceCream),
       };
       $scope.numberOfBananas = {
            low: Math.floor($scope.caloriesData.userCalories.low/
                                           $scope.food.banana),
            high: Math.floor($scope.caloriesData.userCalories.high/
                                           $scope.food.banana),
       };

       if($scope.defaultTwoWeekUserCall) {
        if (twoWeeksAgoDurationSummary.length > 0) {
         var twoWeeksAgoCalories = {low: 0, high: 0};
         for (var i in twoWeeksAgoDurationSummary) {
           var lowMET = $scope.getCorrectedMetFromUserData(twoWeeksAgoDurationSummary[i],
                        twoWeeksAgoMeanSpeedSummary[i], 0)
           var highMET = $scope.getCorrectedMetFromUserData(twoWeeksAgoDurationSummary[i],
                        twoWeeksAgoMeanSpeedSummary[i], highestMET)
           twoWeeksAgoCalories.low +=
             Math.round(CalorieCal.getuserCalories(twoWeeksAgoDurationSummary[i].values / 3600, lowMET));
           twoWeeksAgoCalories.high +=
             Math.round(CalorieCal.getuserCalories(twoWeeksAgoDurationSummary[i].values / 3600, highMET));
         }
         $scope.caloriesData.lastWeekUserCalories = {
            low: twoWeeksAgoCalories.low,
            high: twoWeeksAgoCalories.high
         };
         console.log("Running calorieData with ", $scope.caloriesData);
         // TODO: Refactor this so that we can filter out bad values ahead of time
         // instead of having to work around it here
         $scope.caloriesData.greaterLesserPct = {
            low: ($scope.caloriesData.userCalories.low/$scope.caloriesData.lastWeekUserCalories.low) * 100 - 100,
            high: ($scope.caloriesData.userCalories.high/$scope.caloriesData.lastWeekUserCalories.high) * 100 - 100,
         }
        }
       }
   }

   $scope.fillCalorieAggVals = function(aggDurationSummaryAvg, aggMeanSpeedSummaryAvg) {
       $scope.caloriesData.aggrCalories = {low: 0, high: 0};
       const highestMET = CalorieCal.getHighestMET();
       for (var i in aggDurationSummaryAvg) {
         var lowMET = CalorieCal.getMet(aggDurationSummaryAvg[i].key, aggMeanSpeedSummaryAvg[i].values, 0);
         var highMET = CalorieCal.getMet(aggDurationSummaryAvg[i].key, aggMeanSpeedSummaryAvg[i].values, highestMET);
         $scope.caloriesData.aggrCalories.low +=
           CalorieCal.getuserCalories(aggDurationSummaryAvg[i].values / 3600, lowMET); //+ ' cal'
         $scope.caloriesData.aggrCalories.high +=
           CalorieCal.getuserCalories(aggDurationSummaryAvg[i].values / 3600, highMET); //+ ' cal'
       }
   }

   $scope.getCorrectedMetFromUserData = function(currDurationData, currSpeedData, defaultIfMissing) {
       if ($scope.userDataSaved()) {
         // this is safe because userDataSaved will never be set unless there
         // is stored user data that we have loaded
         var userDataFromStorage = $scope.savedUserData;
         var met = CalorieCal.getMet(currDurationData.key, currSpeedData.values, defaultIfMissing);
         var gender = userDataFromStorage.gender;
         var heightUnit = userDataFromStorage.heightUnit;
         var height = userDataFromStorage.height;
         var weightUnit = userDataFromStorage.weightUnit;
         var weight = userDataFromStorage.weight;
         var age = userDataFromStorage.age;
         return CalorieCal.getCorrectedMet(met, gender, age, height, heightUnit, weight, weightUnit);
       } else {
         return CalorieCal.getMet(currDurationData.key, currSpeedData.values, defaultIfMissing);
       }
   };

   $scope.fillFootprintCardUserVals = function(
        userDistance, userDistanceSummary,
        twoWeeksAgoDistance, twoWeeksAgoDistanceSummary) {
      if (userDistance) {
        // var optimalDistance = getOptimalFootprintDistance(userDistance);
        var worstDistance   = getWorstFootprintDistance(userDistanceSummary);

        var date1 = $scope.selectCtrl.fromDateTimestamp;
        var date2 = $scope.selectCtrl.toDateTimestamp;
        var duration = moment.duration(date2.diff(date1));
        var days = duration.asDays();

        /*
         * 54 and 14 are the per-week CO2 estimates.
         * https://github.com/e-mission/e-mission-docs/issues/688
         * Since users can choose a custom range which can be less or greater
         * than 7 days, we calculate the per day value by dividing by 7 and
         * then multiplying by the actual number of days.
         */
        $scope.carbonData.us2030 = Math.round(54 / 7 * days); // kg/day
        $scope.carbonData.us2050 = Math.round(14 / 7 * days);

        $scope.carbonData.userCarbon = {
            low: FootprintHelper.getFootprintForMetrics(userDistanceSummary,0),
            high: FootprintHelper.getFootprintForMetrics(userDistanceSummary,
                FootprintHelper.getHighestFootprint()),
        };
        // $scope.carbonData.optimalCarbon = FootprintHelper.getLowestFootprintForDistance(optimalDistance);
        $scope.carbonData.worstCarbon   = FootprintHelper.getHighestFootprintForDistance(worstDistance);
        $scope.carbonData.carbonAvoided = {
            low: $scope.carbonData.worstCarbon - $scope.carbonData.userCarbon.high,
            high: $scope.carbonData.worstCarbon - $scope.carbonData.userCarbon.low,
        };
      }

      $scope.numberOfCharges = {
           low: Math.floor($scope.carbonData.carbonAvoided.low/
                                          $scope.carbon.phoneCharge),
           high: Math.floor($scope.carbonData.carbonAvoided.high/
                                          $scope.carbon.phoneCharge),
      };

      if ($scope.defaultTwoWeekUserCall) {
        // This is a default call in which we retrieved the current week and
        // the previous week of data
        if (twoWeeksAgoDistance.length > 0) {
          // and this user has been around long enough that they have two weeks
          // of data, or they haven't turned off tracking for all of last week,
          // or....
          $scope.carbonData.lastWeekUserCarbon = {
            low: FootprintHelper.getFootprintForMetrics(twoWeeksAgoDistanceSummary,0),
            high: FootprintHelper.getFootprintForMetrics(twoWeeksAgoDistanceSummary,
                FootprintHelper.getHighestFootprint()),
          };

          console.log("Running calculation with " + $scope.carbonData.userCarbon + " and " + $scope.carbonData.lastWeekUserCarbon);
          console.log("Running calculation with ", $scope.carbonData);
          $scope.carbonData.greaterLesserPct = {
            low: ($scope.carbonData.userCarbon.low/$scope.carbonData.lastWeekUserCarbon.low) * 100 - 100,
            high: ($scope.carbonData.userCarbon.high/$scope.carbonData.lastWeekUserCarbon.high) * 100 - 100,
        }
      }
     }
   };

   $scope.fillFootprintAggVals = function(aggDistance) {
      if (aggDistance) {
        var aggrCarbonData = aggDistance;

        // Issue 422:
        // https://github.com/e-mission/e-mission-docs/issues/422
        for (var i in aggrCarbonData) {
          if (isNaN(aggrCarbonData[i].values)) {
            console.warn("WARNING fillFootprintAggVals(): value is NaN for mode " + aggrCarbonData[i].key + ", changing to 0");
            aggrCarbonData[i].values = 0;
          }
        }

        $scope.carbonData.aggrCarbon = {
            low: FootprintHelper.getFootprintForMetrics(aggrCarbonData, 0),
            high: FootprintHelper.getFootprintForMetrics(aggrCarbonData,
                FootprintHelper.getHighestFootprint()),
        };
      }
   };

    $scope.showCharts = function(agg_metrics) {
      $scope.data = agg_metrics;
      $scope.countOptions = angular.copy($scope.options)
      $scope.countOptions.chart.yAxis.axisLabel = $translate.instant('metrics.trips-yaxis-number');
      $scope.distanceOptions = angular.copy($scope.options)
      $scope.distanceOptions.chart.yAxis.axisLabel = ImperialConfig.getDistanceSuffix;
      $scope.durationOptions = angular.copy($scope.options)
      $scope.durationOptions.chart.yAxis.axisLabel = $translate.instant('metrics.hours');
      $scope.speedOptions = angular.copy($scope.options)
      $scope.speedOptions.chart.yAxis.axisLabel = ImperialConfig.getSpeedSuffix;
    };
    $scope.pandaFreqOptions = [
      {text: $translate.instant('metrics.pandafreqoptions-daily'), value: 'D'},
      {text: $translate.instant('metrics.pandafreqoptions-weekly'), value: 'W'},
      {text: $translate.instant('metrics.pandafreqoptions-biweekly'), value: '2W'},
      {text: $translate.instant('metrics.pandafreqoptions-monthly'), value: 'M'},
      {text: $translate.instant('metrics.pandafreqoptions-yearly'), value: 'A'}
    ];
    $scope.freqOptions = [
      {text: $translate.instant('metrics.freqoptions-daily'), value:'DAILY'},
      {text: $translate.instant('metrics.freqoptions-monthly'), value: 'MONTHLY'},
      {text: $translate.instant('metrics.freqoptions-yearly'), value: 'YEARLY'}
    ];

    /*
     * metric2val is a function that takes a metric entry and a field and returns
     * the appropriate value.
     * for regular data (user-specific), this will return the field value
     * for avg data (aggregate), this will return the field value/nUsers
     */

    var metric2valUser = function(metric, field) {
        return metric[field];
    }

    var metric2valAvg = function(metric, field) {
        return metric[field]/metric.nUsers;
    }

    var getDataFromMetrics = function(metrics, metric2val) {
        console.log("Called getDataFromMetrics on ", metrics);
        var mode_bins = {};
        metrics.forEach(function(metric) {
            var on_foot_val = 0;
            for (var field in metric) {
                // For modes inferred from sensor data, we check if the string
                // is all upper case by converting it to upper case and seeing
                // if it is changed
                if (field == field.toUpperCase()) {
                    // since we can have multiple possible ON_FOOT modes, we
                    // add all of them up here
                    // see https://github.com/e-mission/e-mission-docs/issues/422
                    if (field === "WALKING" || field === "RUNNING" || field === "ON_FOOT") {
                      on_foot_val = on_foot_val + metric2val(metric, field);
                      field = "ON_FOOT";
                    }
                    if (field in mode_bins == false) {
                        mode_bins[field] = []
                    }
                    // since we can have multiple on_foot entries, let's hold
                    // off on handling them until we have considered all fields
                    if (field != "ON_FOOT") {
                        mode_bins[field].push([metric.ts, metric2val(metric, field), metric.fmt_time]);
                    }
                }
                // For modes from user labels, we assume that the field stars with
                // the label_ prefix
                if (field.startsWith("label_")) {
                    // "label_" is 6 characters
                    let actualMode = field.slice(6, field.length);
                    console.log("Mapped field "+field+" to mode "+actualMode);
                    if (actualMode in mode_bins == false) {
                        mode_bins[actualMode] = []
                    }
                    mode_bins[actualMode].push([metric.ts, Math.round(metric2val(metric, field)), moment(metric.fmt_time).format()]);
                }
            }
            // here's where we handle the ON_FOOT
            if ("ON_FOOT" in mode_bins == true) {
                // we must have received one of the on_foot modes, so we can
                // boldly insert the value
                mode_bins["ON_FOOT"].push([metric.ts, Math.round(on_foot_val), metric.fmt_time]);
            }
        });
        var rtn = [];
        for (var mode in mode_bins) {
          var val_arrays = rtn.push({key: mode, values: mode_bins[mode]});
        }
        return rtn;
    }

    var getSummaryDataRaw = function(modeMap, metric) {
        console.log("Invoked getSummaryDataRaw on ", modeMap, "with", metric);
        let summaryMap = angular.copy(modeMap);
        for (var i = 0; i < modeMap.length; i++) {
          var temp = 0;
          for (var j = 0; j < modeMap[i].values.length; j++) {
            temp += modeMap[i].values[j][1];
          }
          if (metric === "mean_speed") {
            summaryMap[i].values = Math.round(temp / modeMap[i].values.length);
          } else {
            summaryMap[i].values = Math.round(temp);
          }

        }
        return summaryMap;
    }

    /*var sortNumber = function(a,b) {
      return a - b;
    }*/

    /*
     * This is _broken_ because what we see on the client is summary values,
     * not individual trip values. So value > longTrip just means that the
     * overall travel by that mode was long, not that each individual trip
     * was long.
     *
     * As an obvious example, if I had 10 1k car trips, they would show up as
     * daily travel of 10k by car, and be counted as a long trip, although each
     * individual trip was actually 1k and short.
     *
     * Leaving this disabled until we come up with a principled solution.
     * https://github.com/e-mission/e-mission-docs/issues/688#issuecomment-1000626564
     */

    var getOptimalFootprintDistance = function(metrics){
      var data = getDataFromMetrics(metrics, metric2valUser);
      var distance = 0;
      var longTrip = 5000;
      // total distance for long trips using motorized vehicles
      for(var i = 0; i < data.length; i++) {
        if(data[i].key == "CAR" || data[i].key == "BUS" || data[i].key == "TRAIN" || data[i].key == "AIR_OR_HSR") {
          for(var j = 0; j < data[i].values.length; j++){
            if(data[i].values[j][1] >= longTrip){
              distance += data[i].values[j][1];
            }
          }
        }
      }
      return distance;
    }
    var getWorstFootprintDistance = function(modeMapSummary) {
      var totalDistance = modeMapSummary.reduce((prevDistance, currModeSummary) => prevDistance + currModeSummary.values, 0);
      return totalDistance;
    }

    $scope.formatCount = function(value) {
        const formatVal = Math.round(value);
        const unit = $translate.instant('metrics.trips');
        const stringRep = formatVal + " " + unit;
        return [formatVal, unit, stringRep];
    }

    $scope.formatDistance = function(value) {
        const formatVal = Number.parseFloat(ImperialConfig.getFormattedDistance(value));
        const unit = ImperialConfig.getDistanceSuffix;
        const stringRep = formatVal + " " + unit;
        return [formatVal, unit, stringRep];
    }

    $scope.formatDuration = function(value) {
        const durM = moment.duration(value * 1000);
        const formatVal = durM.asHours();
        const unit = $translate.instant('metrics.hours');
        const stringRep = durM.humanize();
        return [formatVal, unit, stringRep];
    }

    $scope.formatMeanSpeed = function(value) {
        const formatVal = Number.parseFloat(ImperialConfig.getFormattedSpeed(value));
        const unit = ImperialConfig.getSpeedSuffix;
        const stringRep = formatVal + " " + unit;
        return [formatVal, unit, stringRep];
    }

    $scope.formatterMap = {
        count: $scope.formatCount,
        distance: $scope.formatDistance,
        duration: $scope.formatDuration,
        mean_speed: $scope.formatMeanSpeed
    }

    var formatModeMap = function(modeMapList, metric) {
        const formatter = $scope.formatterMap[metric];
        let formattedModeList = [];
        modeMapList.forEach((modeMap) => {
            let currMode = modeMap["key"];
            let modeStatList = modeMap["values"];
            let formattedModeStatList = modeStatList.map((modeStat) => {
                let [formatVal, unit, stringRep] = formatter(modeStat[1]);
                let copiedModeStat = angular.copy(modeStat);
                copiedModeStat[1] = formatVal;
                copiedModeStat.push(unit);
                copiedModeStat.push(stringRep);
                return copiedModeStat;
            });
            formattedModeList.push({key: currMode, values: formattedModeStatList});
        });
        return formattedModeList;
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
        {text: $translate.instant('weekdays-all'), value: null},
        {text: moment.weekdays(1), value: 0},
        {text: moment.weekdays(2), value: 1},
        {text: moment.weekdays(3), value: 2},
        {text: moment.weekdays(4), value: 3},
        {text: moment.weekdays(5), value: 4},
        {text: moment.weekdays(6), value: 5},
        {text: moment.weekdays(0), value: 6}
      ];
      $ionicActionSheet.show({
        buttons: weekdayOptions,
        titleText: $translate.instant('weekdays-select'),
        cancelText: $translate.instant('metrics.cancel'),
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
          titleText: $translate.instant('metrics.select-frequency'),
          cancelText: $translate.instant('metrics.cancel'),
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
          titleText: $translate.instant('metrics.select-pandafrequency'),
          cancelText: $translate.instant('metrics.cancel'),
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
      $scope.selectCtrl.freqString = $translate.instant('metrics.freqoptions-daily');
      $scope.selectCtrl.pandaFreq = 'D';
      $scope.selectCtrl.pandaFreqString = $translate.instant('metrics.pandafreqoptions-daily');
      // local_date saved as localdate
      $scope.selectCtrl.fromDateLocalDate = moment2Localdate(weekAgoFromNow);
      $scope.selectCtrl.toDateLocalDate = moment2Localdate(now);
      // ts saved as moment
      $scope.selectCtrl.fromDateTimestamp= weekAgoFromNow;
      $scope.selectCtrl.toDateTimestamp = now;

      $scope.selectCtrl.fromDateWeekdayString = $translate.instant('weekdays-all');
      $scope.selectCtrl.toDateWeekdayString = $translate.instant('weekdays-all');

      $scope.selectCtrl.fromDateWeekdayValue = null;
      $scope.selectCtrl.toDateWeekdayValue = null;

      $scope.selectCtrl.region = null;
    };


  $scope.selectCtrl = {}
  initSelect();

  $scope.doRefresh = function() {
    getMetrics();
  }

  $scope.$on('$ionicView.enter',function(){
    $scope.startTime = moment().utc()
    ClientStats.addEvent(ClientStats.getStatKeys().OPENED_APP).then(
        function() {
            console.log("Added "+ClientStats.getStatKeys().OPENED_APP+" event");
        });
  });

  $scope.$on('$ionicView.leave',function() {
    var timeOnPage = moment().utc() - $scope.startTime;
    ClientStats.addReading(ClientStats.getStatKeys().METRICS_TIME, timeOnPage);
  });

  $ionicPlatform.on("pause", function() {
    if ($state.$current == "root.main.metrics") {
      var timeOnPage = moment().utc() - $scope.startTime;
      ClientStats.addReading(ClientStats.getStatKeys().METRICS_TIME, timeOnPage);
    }
  })

  $ionicPlatform.on("resume", function() {
    if ($state.$current == "root.main.metrics") {
      $scope.startTime = moment().utc()
    }
  })

  $scope.linkToMaps = function() {
    let start = $scope.suggestionData.startCoordinates[1] + ',' + $scope.suggestionData.startCoordinates[0];
    let destination = $scope.suggestionData.endCoordinates[1] + ',' + $scope.suggestionData.endCoordinates[0];
    var mode = $scope.suggestionData.mode
    if(ionic.Platform.isIOS()){
      if (mode === 'bike') {
        mode = 'b';
      } else if (mode === 'public') {
        mode = 'r';
      } else if (mode === 'walk') {
        mode = 'w';
      }
	     window.open('https://www.maps.apple.com/?saddr=' + start + '&daddr=' + destination + '&dirflg=' + mode, '_system');
     } else {
       if (mode === 'bike') {
         mode = 'b';
       } else if (mode === 'public') {
         mode = 'r';
       } else if (mode === 'walk') {
         mode = 'w';
       }
       window.open('https://www.google.com/maps?saddr=' + start + '&daddr=' + destination +'&dirflg=' + mode, '_system');
    }
  }

  $scope.linkToDiary = function(trip_id) {
    console.log("Loading trip "+trip_id);
    window.location.href = "#/root/main/diary/" + trip_id;
  }

  $scope.hasUsername = function(obj) {
    return (obj.hasOwnProperty('username'));
  }

  $scope.modeIcon = function(key) {
    var icons = {"BICYCLING":"ion-android-bicycle",
    "ON_FOOT":" ion-android-walk",
    "WALKING":" ion-android-walk",
    "IN_VEHICLE":"ion-speedometer",
    "CAR":"ion-android-car",
    "BUS": "ion-android-bus",
    "LIGHT_RAIL":"lightrail fas fa-subway",
    "TRAIN": "ion-android-train",
    "TRAM": "fas fa-tram",
    "SUBWAY":"fas fa-subway",
    "UNKNOWN": "ion-ios-help",
    "AIR_OR_HSR": "ion-plane"}
    return icons[key];
  }

  $scope.setCurDayFrom = function(val) {
    if (val) {
      $scope.selectCtrl.fromDateTimestamp = moment(val).startOf('day');
      if ($scope.selectCtrl.fromDateTimestamp > $scope.selectCtrl.toDateTimestamp) {
        const copyToDateTimestamp = $scope.selectCtrl.toDateTimestamp.clone();
        $scope.selectCtrl.fromDateTimestamp = copyToDateTimestamp.startOf('day');
      }
      $scope.datepickerObjFrom.inputMoment = $scope.selectCtrl.fromDateTimestamp;
      $scope.datepickerObjFrom.inputDate = $scope.selectCtrl.fromDateTimestamp.toDate();
    } else {
      $scope.datepickerObjFrom.inputMoment = $scope.selectCtrl.fromDateTimestamp;
      $scope.datepickerObjFrom.inputDate = $scope.selectCtrl.fromDateTimestamp.toDate();
    }

  };
  $scope.setCurDayTo = function(val) {
    if (val) {
      $scope.selectCtrl.toDateTimestamp = moment(val).endOf('day');
      if ($scope.selectCtrl.toDateTimestamp < $scope.selectCtrl.fromDateTimestamp) {
        const copyFromDateTimestamp = $scope.selectCtrl.fromDateTimestamp.clone();
        $scope.selectCtrl.toDateTimestamp = copyFromDateTimestamp.endOf('day');
      }
      $scope.datepickerObjTo.inputMoment = $scope.selectCtrl.toDateTimestamp;
      $scope.datepickerObjTo.inputDate = $scope.selectCtrl.toDateTimestamp.toDate();
    } else {
      $scope.datepickerObjTo.inputMoment = $scope.selectCtrl.toDateTimestamp;
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
        { text: $translate.instant('metrics.cancel') },
        {
          text: '<b>'+ $translate.instant('metrics.confirm') +'</b>',
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

  $scope.datepickerObjBase = {
      todayLabel: $translate.instant('list-datepicker-today'),  //Optional
      closeLabel: $translate.instant('list-datepicker-close'),  //Optional
      setLabel: $translate.instant('list-datepicker-set'),  //Optional
      titleLabel: $translate.instant('metrics.pick-a-date'),
      mondayFirst: false,
      weeksList: moment.weekdaysMin(),
      monthsList: moment.monthsShort(),
      templateType: 'popup',
      from: new Date(2015, 1, 1),
      to: new Date(),
      showTodayButton: true,
      closeOnSelect: false,
      // add this instruction if you want to exclude a particular weekday, e.g. Saturday  disableWeekdays: [6]
    };

  $scope.datepickerObjFrom = angular.copy($scope.datepickerObjBase);
  angular.extend($scope.datepickerObjFrom, {
      callback: $scope.setCurDayFrom,
      inputDate: $scope.selectCtrl.fromDateTimestamp.toDate(),
      inputMoment: $scope.selectCtrl.fromDateTimestamp,
  });

  $scope.datepickerObjTo = angular.copy($scope.datepickerObjBase);
  angular.extend($scope.datepickerObjTo, {
      callback: $scope.setCurDayTo,
      inputDate: $scope.selectCtrl.toDateTimestamp.toDate(),
      inputMoment: $scope.selectCtrl.toDateTimestamp,
  });

  $scope.pickFromDay = function() {
    ionicDatePicker.openDatePicker($scope.datepickerObjFrom);
  }

  $scope.pickToDay = function() {
    ionicDatePicker.openDatePicker($scope.datepickerObjTo);
  }

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


})
.directive('diffdisplay', function() {
    return {
        scope: {
            change: "="
        },
        link: function(scope) {
            if (isNaN(scope.change.low)) scope.change.low = 0;
            if (isNaN(scope.change.high)) scope.change.high = 0;
            console.log("In diffdisplay, after changes, scope = ", scope);
        },
        templateUrl: "templates/metrics/arrow-greater-lesser.html"
    }
})
.directive('rangedisplay', function() {
    return {
        scope: {
            range: "="
        },
        link: function(scope) {
            // console.log("RANGE DISPLAY "+JSON.stringify(scope.range));
            var humanize = function(num) {
                if (Math.abs(num) < 1) {
                    return num.toFixed(2);
                } else {
                    return num.toFixed(0);
                }
            }

            if (Math.abs(scope.range.high - scope.range.low) < 1) {
                scope.tinyDiff = true;
            }
            scope.lowFmt = humanize(scope.range.low);
            scope.highFmt = humanize(scope.range.high);
        },
        templateUrl: "templates/metrics/range-display.html"
    }
});
