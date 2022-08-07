'use strict';

angular.module('emission.main.metrics',['nvd3',
                                        'emission.services',
                                        'ionic-datepicker',
                                        'emission.main.metrics.factory',
                                        'emission.plugin.kvstore',
                                        'emission.plugin.logger'])

.controller('MetricsCtrl', function($scope, $ionicActionSheet, $ionicLoading,
                                    CommHelper, $window, $ionicPopup,
                                    ionicDatePicker, $ionicPlatform,
                                    FootprintHelper, CalorieCal, $ionicModal, $timeout, KVStore, CarbonDatasetHelper,
                                    $rootScope, $location, $state, ReferHelper, Logger,
                                    $translate) {
    var lastTwoWeeksQuery = true;
    var first = true;
    var lastWeekCalories = 0;
    var lastWeekCarbon = "0 kg CO₂";
    var twoWeeksAgoCarbon = "";
    var lastWeekCarbonInt = 0;
    var twoWeeksAgoCarbonInt = 0;
    var twoWeeksAgoCalories = 0;

    var DURATION = "duration";
    var MEDIAN_SPEED = "median_speed";
    var COUNT = "count";
    var DISTANCE = "distance";

    $scope.onCurrentTrip = function() {
      window.cordova.plugins.BEMDataCollection.getState().then(function(result) {
        Logger.log("Current trip state" + JSON.stringify(result));
        if(JSON.stringify(result) ==  "\"STATE_ONGOING_TRIP\""||
          JSON.stringify(result) ==  "\"local.state.ongoing_trip\"") {
          $state.go("root.main.current");
        }
      });
    };

    $ionicPlatform.ready(function() {
        CarbonDatasetHelper.loadCarbonDatasetLocale().then(function(result) {
          getData();
        });
        $scope.onCurrentTrip();
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
        } else {
          var tempFrom = moment2Timestamp($scope.selectCtrl.fromDateTimestamp);
          var tempTo = moment2Timestamp($scope.selectCtrl.toDateTimestamp);
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
      clonedData.metric_list = [DURATION, MEDIAN_SPEED, COUNT, DISTANCE];
      clonedData.is_return_aggregate = false;
      var getMetricsResult = CommHelper.getMetrics(theMode, clonedData);
      return getMetricsResult;
   }
   var getAggMetricsFromServer = function() {
      var clonedData = angular.copy(data);
      delete clonedData.metric;
      clonedData.metric_list = [DURATION, MEDIAN_SPEED, COUNT, DISTANCE];
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
      if(!first){
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
      $scope.caloriesData.userCalories = 0;
      $scope.caloriesData.aggrCalories = 0;
      $scope.caloriesData.lastWeekUserCalories = 0;
      $scope.caloriesData.changeInPercentage = "0%"
      $scope.caloriesData.change = $translate.instant('metrics.calorie-data-change');

      $scope.carbonData.userCarbon = "0 kg CO₂";
      $scope.carbonData.aggrCarbon = $translate.instant('metrics.carbon-data-calculating');;
      $scope.carbonData.optimalCarbon = "0 kg CO₂";
      $scope.carbonData.worstCarbon = "0 kg CO₂";
      $scope.carbonData.lastWeekUserCarbon = "0 kg CO₂";
      $scope.carbonData.changeInPercentage = "0%";
      $scope.carbonData.change = $translate.instant('metrics.carbon-data-change');

      $scope.summaryData.userSummary = [];
      $scope.chartDataUser = {};
      $scope.chartDataAggr = {};
      $scope.food = {
        'chocolateChip' : 78, //16g 1 cookie
        'vanillaIceCream' : 137, //1/2 cup
        'banana' : 105, //medium banana 118g
      };

      getUserMetricsFromServer().then(function(results) {
          $ionicLoading.hide();
          if(results.user_metrics.length == 1){
            console.log("first = "+first);
            first = false;
            // If there is no data from last week (ex. new user)
            // Don't store the any other data as last we data
          }
          $scope.fillUserValues(results.user_metrics);
          $scope.summaryData.defaultSummary = $scope.summaryData.userSummary;
          first = false; //If there is data from last week store the data only first time
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
        Logger.displayError("Error loading user data", error);
      })

      getAggMetricsFromServer().then(function(results) {
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
        var twoWeeksAgoDuration = [];
        var twoWeeksAgoMedianSpeed = [];
        var twoWeeksAgoDistance = [];
        var userDuration = [];
        var userMedianSpeed = [];
        var userCount = [];
        var userDistance = [];

        if(first){
          for(var i in user_metrics_arr[0]) {
            if(seventhDayAgo.isSameOrBefore(moment.unix(user_metrics_arr[0][i].ts).utc())){
              userDuration.push(user_metrics_arr[0][i]);
              userMedianSpeed.push(user_metrics_arr[1][i]);
              userCount.push(user_metrics_arr[2][i]);
              userDistance.push(user_metrics_arr[3][i]);
            } else {
              twoWeeksAgoDuration.push(user_metrics_arr[0][i]);
              twoWeeksAgoMedianSpeed.push(user_metrics_arr[1][i]);
              twoWeeksAgoDistance.push(user_metrics_arr[3][i]);
            }
          }
          console.log("twoWeeksAgoDuration = "+twoWeeksAgoDuration);
          console.log("twoWeeksAgoMedianSpeed = "+twoWeeksAgoMedianSpeed);
          console.log("twoWeeksAgoDistance = "+twoWeeksAgoDistance);
        } else {
          var userDuration = user_metrics_arr[0];
          var userMedianSpeed = user_metrics_arr[1];
          var userCount = user_metrics_arr[2];
          var userDistance = user_metrics_arr[3];
        }
        $scope.summaryData.userSummary.duration = getSummaryData(userDuration, "duration");
        $scope.summaryData.userSummary.median_speed = getSummaryData(userMedianSpeed, "median_speed");
        $scope.summaryData.userSummary.count = getSummaryData(userCount, "count");
        $scope.summaryData.userSummary.distance = getSummaryData(userDistance, "distance");
        $scope.chartDataUser.duration = userDuration? userDuration : [];
        $scope.chartDataUser.speed = userMedianSpeed? userMedianSpeed : [];
        $scope.chartDataUser.count = userCount? userCount : [];
        $scope.chartDataUser.distance = userDistance? userDistance : [];

        // Fill in user calorie information
        $scope.fillCalorieCardUserVals(userDuration, userMedianSpeed,
                                       twoWeeksAgoDuration, twoWeeksAgoMedianSpeed);
        $scope.fillFootprintCardUserVals(userDistance, twoWeeksAgoDistance);
   }

   $scope.fillAggregateValues = function(agg_metrics_arr) {
        if (first) {
            var aggDuration = agg_metrics_arr[0].slice(0, 7);
            var aggMedianSpeed = agg_metrics_arr[1].slice(0, 7);
            var aggCount = agg_metrics_arr[2].slice(0, 7);
            var aggDistance = agg_metrics_arr[3].slice(0, 7);
        } else {
            var aggDuration = agg_metrics_arr[0];
            var aggMedianSpeed = agg_metrics_arr[1];
            var aggCount = agg_metrics_arr[2];
            var aggDistance = agg_metrics_arr[3];
        }

        $scope.chartDataAggr.duration = aggDuration? aggDuration : [];
        $scope.chartDataAggr.speed = aggMedianSpeed? aggMedianSpeed : [];
        $scope.chartDataAggr.count = aggCount? aggCount : [];
        $scope.chartDataAggr.distance = aggDistance? aggDistance : [];

        $scope.fillCalorieAggVals(aggDuration, aggMedianSpeed);
        $scope.fillFootprintAggVals(aggDistance);
   }

   $scope.fillCalorieCardUserVals = function(userDuration, userMedianSpeed,
                                             twoWeeksAgoDuration, twoWeeksAgoMedianSpeed) {
       if (userDuration) {
         var durationData = getSummaryDataRaw(userDuration, "duration");
       }
       if (userMedianSpeed) {
         var speedData = getSummaryDataRaw(userMedianSpeed, "median_speed");
       }
       for (var i in durationData) {
         var met = $scope.getCorrectedMetFromUserData(durationData[i], speedData[i])
         $scope.caloriesData.userCalories +=
           Math.round(CalorieCal.getuserCalories(durationData[i].values / 3600, met)) //+ ' cal'
       }

       if(first){
           lastWeekCalories = $scope.caloriesData.userCalories;
       }

       $scope.numberOfCookies = Math.floor($scope.caloriesData.userCalories/
                                           $scope.food.chocolateChip);
       $scope.numberOfIceCreams = Math.floor($scope.caloriesData.userCalories/
                                             $scope.food.vanillaIceCream);
       $scope.numberOfBananas = Math.floor($scope.caloriesData.userCalories/
                                           $scope.food.banana);

       if(first){
         if (twoWeeksAgoDuration) {
           var durationData = getSummaryDataRaw(twoWeeksAgoDuration, "duration");
         }
         if (twoWeeksAgoMedianSpeed) {
           var speedData = getSummaryDataRaw(twoWeeksAgoMedianSpeed, "median_speed");
         }
         for (var i in durationData) {
           var met = $scope.getCorrectedMetFromUserData(durationData[i], speedData[i])
           twoWeeksAgoCalories +=
             Math.round(CalorieCal.getuserCalories(durationData[i].values / 3600, met));
         }
       }

       if (first) {
          $scope.caloriesData.lastWeekUserCalories = twoWeeksAgoCalories;
       } else {
          $scope.caloriesData.lastWeekUserCalories = ""
       }


       console.log("Running calorieData with "
                    + (lastWeekCalories)
                    + " and "
                    + (twoWeeksAgoCalories));
       // TODO: Refactor this so that we can filter out bad values ahead of time
       // instead of having to work around it here
       var calorieCalculation = Math.abs(Math.round((lastWeekCalories/twoWeeksAgoCalories) * 100 - 100));
       if (isValidNumber(calorieCalculation)) {
          $scope.caloriesData.changeInPercentage =  calorieCalculation + "%";
          if(lastWeekCalories > twoWeeksAgoCalories){
            $scope.caloriesData.change = $translate.instant('metrics.calorie-data-change-increase');
            $scope.caloriesUp = true;
            $scope.caloriesDown = false;
          } else {
            $scope.caloriesData.change = $translate.instant('metrics.calorie-data-change-decrease');
            $scope.caloriesUp = false;
            $scope.caloriesDown = true;
          }
       }
   }

   $scope.fillCalorieAggVals = function(aggDuration, aggMedianSpeed) {
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
   }

   $scope.getCorrectedMetFromUserData = function(currDurationData, currSpeedData) {
       if ($scope.userDataSaved()) {
         // this is safe because userDataSaved will never be set unless there
         // is stored user data that we have loaded
         var userDataFromStorage = $scope.savedUserData;
         var met = CalorieCal.getMet(currDurationData.key, currSpeedData.values);
         var gender = userDataFromStorage.gender;
         var heightUnit = userDataFromStorage.heightUnit;
         var height = userDataFromStorage.height;
         var weightUnit = userDataFromStorage.weightUnit;
         var weight = userDataFromStorage.weight;
         var age = userDataFromStorage.age;
         return CalorieCal.getCorrectedMet(met, gender, age, height, heightUnit, weight, weightUnit);
       } else {
         return CalorieCal.getMet(currDurationData.key, currSpeedData.values);
       }
   };

   $scope.fillFootprintCardUserVals = function(userDistance, twoWeeksAgoDistance) {
      if (userDistance) {
        var userCarbonData = getSummaryDataRaw(userDistance, 'distance');

        var optimalDistance = getOptimalFootprintDistance(userDistance);
        var worstDistance   = getWorstFootprintDistance(userDistance);
        var date1 = $scope.selectCtrl.fromDateTimestamp;
        var date2 = $scope.selectCtrl.toDateTimestamp;
        var duration = moment.duration(date2.diff(date1));
        var days = duration.asDays();

        $scope.carbonData.ca2035 = Math.round(40.142892 / 5 * days) + ' kg CO₂'; // kg/day
        $scope.carbonData.ca2050 = Math.round(8.28565 / 5 * days) + ' kg CO₂';

        $scope.carbonData.userCarbon    = FootprintHelper.readableFormat(FootprintHelper.getFootprintForMetrics(userCarbonData));
        $scope.carbonData.optimalCarbon = FootprintHelper.readableFormat(FootprintHelper.getLowestFootprintForDistance(optimalDistance));
        $scope.carbonData.worstCarbon   = FootprintHelper.readableFormat(FootprintHelper.getHighestFootprintForDistance(worstDistance));
        lastWeekCarbonInt               = FootprintHelper.getFootprintForMetrics(userCarbonData);
      }

      if (first) {
        if (twoWeeksAgoDistance) {
          var userCarbonDataTwoWeeks = getSummaryDataRaw(twoWeeksAgoDistance, 'distance');
          twoWeeksAgoCarbon    = 0;
          twoWeeksAgoCarbonInt = 0;

          twoWeeksAgoCarbonInt = FootprintHelper.getFootprintForMetrics(userCarbonDataTwoWeeks);

          twoWeeksAgoCarbon = FootprintHelper.readableFormat(twoWeeksAgoCarbonInt);
          lastWeekCarbon    = twoWeeksAgoCarbon;
        }
      }
      $scope.carbonData.lastWeekUserCarbon = lastWeekCarbon;

      var change = "";
      console.log("Running calculation with " + lastWeekCarbonInt + " and " + twoWeeksAgoCarbonInt);
      var calculation = (lastWeekCarbonInt/twoWeeksAgoCarbonInt) * 100 - 100;

      // TODO: Refactor this so that we can filter out bad values ahead of time
      // instead of having to work around it here
      if (isValidNumber(calculation)) {
        if(lastWeekCarbonInt > twoWeeksAgoCarbonInt){
          $scope.carbonData.change = $translate.instant('metrics.carbon-data-change-increase');
          $scope.carbonUp = true;
          $scope.carbonDown = false;
        } else {
          $scope.carbonData.change = $translate.instant('metrics.carbon-data-change-decrease');
          $scope.carbonUp = false;
          $scope.carbonDown = true;
        }
        $scope.carbonData.changeInPercentage = Math.abs(Math.round(calculation)) + "%"
      }
      else {
        $scope.carbonData.change = "";
        $scope.carbonData.changeInPercentage = "0%";
      }
   };

   $scope.fillFootprintAggVals = function(aggDistance) {
      if (aggDistance) {
        var aggrCarbonData = getAvgSummaryDataRaw(aggDistance, 'distance');

        // Issue 422:
        // https://github.com/e-mission/e-mission-docs/issues/422
        for (var i in aggrCarbonData) {
          if (isNaN(aggrCarbonData[i].values)) {
            console.warn("WARNING fillFootprintAggVals(): value is NaN for mode " + aggrCarbonData[i].key + ", changing to 0");
            aggrCarbonData[i].values = 0;
          }
        }

        $scope.carbonData.aggrCarbon = FootprintHelper.readableFormat(FootprintHelper.getFootprintForMetrics(aggrCarbonData));
      }
   };

    $scope.showCharts = function(agg_metrics) {
      $scope.data.count = getDataFromMetrics(agg_metrics.count, metric2valUser);
      $scope.data.distance = getDataFromMetrics(agg_metrics.distance, metric2valUser);
      $scope.data.duration = getDataFromMetrics(agg_metrics.duration, metric2valUser);
      $scope.data.speed = getDataFromMetrics(agg_metrics.speed, metric2valUser);
      $scope.countOptions = angular.copy($scope.options)
      $scope.countOptions.chart.yAxis.axisLabel = $translate.instant('metrics.trips-yaxis-number');
      $scope.distanceOptions = angular.copy($scope.options)
      $scope.distanceOptions.chart.yAxis.axisLabel = 'm';
      $scope.durationOptions = angular.copy($scope.options)
      $scope.durationOptions.chart.yAxis.axisLabel = 'secs'
      $scope.speedOptions = angular.copy($scope.options)
      $scope.speedOptions.chart.yAxis.axisLabel = 'm/sec'
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
        var mode_bins = {};
        metrics.forEach(function(metric) {
            var on_foot_val = 0;
            for (var field in metric) {
                // TODO: Consider creating a prefix such as M_ to signal
                // modes. Is that really less fragile than caps, though?
                // Here, we check if the string is all upper case by
                // converting it to upper case and seeing if it is changed
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
                        mode_bins[field].push([metric.ts, Math.round(metric2val(metric, field)), metric.fmt_time]);
                    }
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

    var getSummaryDataRaw = function(metrics, metric) {
        var data = getDataFromMetrics(metrics, metric2valUser);
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
    var getWorstFootprintDistance = function(metrics){
      var data = getDataFromMetrics(metrics, metric2valUser);
      var distance = 0;
      for(var i = 0; i < data.length; i++) {
        for(var j = 0; j < data[i].values.length; j++){
          distance += data[i].values[j][1];
        }
      }
      return distance;
    }
    var getAvgSummaryDataRaw = function(metrics, metric) {
        var data = getDataFromMetrics(metrics, metric2valAvg);
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
        var data = getDataFromMetrics(metrics, metric2valUser);
        for (var i = 0; i < data.length; i++) {
          var temp = 0;
          for (var j = 0; j < data[i].values.length; j++) {
            temp += data[i].values[j][1];
          }
          var unit = "";
          switch(metric) {
            case "count":
              unit = $translate.instant('metrics.trips');
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
            // This is actually an average, not a median
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
    first = true;
    getMetrics();
  }

  $scope.modeIcon = function(key) {
    var icons = {"BICYCLING":"ion-android-bicycle",
    "ON_FOOT":" ion-android-walk",
    "WALKING":" ion-android-walk",
    "IN_VEHICLE":"ion-speedometer",
    "CAR":"ion-android-car", //ion-android-walk
    "BUS": "ion-android-bus",
    "LIGHT_RAIL":"lightrail fas fa-subway",
    "TRAIN": "ion-android-train",
    "TRAM": "fas fa-tram",
    "SUBWAY":"fas fa-subway",
    "UNKNOWN": "ion-ios-help",
    "AIR_OR_HSR": "ion-plane"}
    return icons[key];
  }

  $scope.modeTitle = function(key) {
    var titles = {"BICYCLING":"modes.bike",
    "ON_FOOT": "modes.walk",
    "WALKING": "modes.walk",
    "IN_VEHICLE": "modes.car",
    "CAR": "modes.car",
    "BUS": "modes.bus",
    "LIGHT_RAIL":"modes.subway",
    "TRAIN": "modes.train",
    "TRAM": "modes.train",
    "SUBWAY":"modes.subway",
    "UNKNOWN": "modes.other",
    "AIR_OR_HSR": "modes.plane"}
    return titles[key];
  }

  $scope.diffDateInDays = '';
  var setDiffDateInDays = function() {
    var date1 = moment.utc($scope.selectCtrl.fromDateTimestamp);
    var date2 = moment.utc($scope.selectCtrl.toDateTimestamp).set({'hour': 23});
    var days = moment(date2).diff(date1, 'days') + 1;
    if (days < 1) {
      $scope.diffDateInDays = '';
    }
    else if (days == 1) {
      $scope.diffDateInDays = days + ' ' + $translate.instant('metrics.day');
    }
    else {
      $scope.diffDateInDays = days + ' ' + $translate.instant('metrics.days');
    }
  };

  $scope.setCurDayFrom = function(val) {
    if (val) {
      $scope.selectCtrl.fromDateTimestamp = moment(val).utc();
      $scope.datepickerObjFrom.inputDate = $scope.selectCtrl.fromDateTimestamp.toDate();
    } else {
      $scope.datepickerObjFrom.inputDate = $scope.selectCtrl.fromDateTimestamp.toDate();
    }
    setDiffDateInDays();
    setMetricsHelper(getMetrics);
  };
  $scope.setCurDayTo = function(val) {
    if (val) {
      $scope.selectCtrl.toDateTimestamp = moment(val).utc();
      $scope.datepickerObjTo.inputDate = $scope.selectCtrl.toDateTimestamp.toDate();
    } else {
      $scope.datepickerObjTo.inputDate = $scope.selectCtrl.toDateTimestamp.toDate();
    }
    setDiffDateInDays();
    setMetricsHelper(getMetrics);
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
  $scope.datepickerObjFrom = {
      callback: $scope.setCurDayFrom,
      inputDate: $scope.selectCtrl.fromDateTimestamp.toDate(),
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
      dateFormat: 'dd MMM',
      closeOnSelect: false,
      // add this instruction if you want to exclude a particular weekday, e.g. Saturday  disableWeekdays: [6]
    };
  $scope.datepickerObjTo = {
      callback: $scope.setCurDayTo,
      inputDate: $scope.selectCtrl.toDateTimestamp.toDate(),
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
      dateFormat: 'dd MMM',
      closeOnSelect: false,
      // add this instruction if you want to exclude a particular weekday, e.g. Saturday  disableWeekdays: [6]
    };
  setDiffDateInDays();

  $scope.pickFromDay = function() {
    ionicDatePicker.openDatePicker($scope.datepickerObjFrom);
  }

  $scope.pickToDay = function() {
    ionicDatePicker.openDatePicker($scope.datepickerObjTo);
  }
});
