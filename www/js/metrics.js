'use strict';

angular.module('emission.main.metrics',['nvd3',
  'emission.services',
  'ionic-datepicker',
  'emission.main.metrics.factory',
  'emission.plugin.kvstore',
  'emission.plugin.logger'])

  .controller('MetricsCtrl', function($scope, $ionicActionSheet, $ionicLoading,
                                      CommHelper, ControlHelper, $window, $ionicPopup,
                                      ionicDatePicker, $ionicPlatform,
                                      FootprintHelper, CalorieCal, $ionicModal, $timeout, KVStore, CarbonDatasetHelper,
                                      $rootScope, $location, $state, ReferHelper, $http, Logger,
                                      $translate, $ionicTabsDelegate) {


    var queryLastDays = true; // we want to query the last days when starting
    var queryLastDays_amount = 7; //  how many days in the past from today do we want to query?
    // this will set the default tab to "week", which we want. We need to wrap it inside a $timeout since
    // this is not the actual tabs-controller so we need to wait until the tabs component is processed
    $timeout(() => {$ionicTabsDelegate.$getByHandle('timeframe-tabs').select(1)});

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

    var modeTranslations = {
      "CAR": "Auto",
      "UNKNOWN": "unbekannt",
      "ON_FOOT": "zu Fuß",
      "BICYCLING": "Fahrrad",
      "BUS": "Bus",
      "SUBWAY": "U-Bahn",
      "TRAIN": "Zug",
      "TRAM": "Tram",
      "AIR_OR_HSR": "Flugzeug"
    };

    /* options for the main NVD3 chart on the dashboard view for displaying carbon offset over time. */
    $scope.options = {
        chart: {
            type: 'lineChart',
            width: $window.screen.width - 20, // to account for row and col padding
            height: $window.screen.width * 3/4,
            margin : {
                top: 20,
                right: 20,
                bottom: 20,
                left: 40
            },
            noData: $translate.instant('metrics.chart-no-data'),
            showControls: false,
            showValues: true,
            x: function(d){ 
              return d[0];
            },
            y: function(d) {
              return d[1];
            },
            yDomain: [0, 8],
            isArea: true,
            showLegend: false,
            color: ["#DF284B"],
            /* diable features that we don't use / are unusable on mobile anyway */
            useInteractiveGuideline: false,
            // duration: 300,
            // clipVoronoi: false,
            xAxis: {
                tickFormat: function(d) {
                    var day = new Date(d * 1000)
                    day.setDate(day.getDate()+1) // Had to add a day to match date with data
                    return d3.time.format('%a')(day)
                },
                ticks: 7,
                fontSize: 10,
                showMaxMin: false,
                staggerLabels: false
            },
            yAxis: {
              tickFormat: function(d) {
                return d; // TODO insert actual carbon dioxide calculation here or better yet manipulate the data before feeding to chart
              },
              showMaxMin: false,
              axisLabel: 'kg CO₂',
              axisLabelDistance: -10,
              ticks: 4,
              tickPadding: 10,
              width: 60
            },
            callback: function(chart) {
              chart.multibar.dispatch.on('elementClick', function(bar) {
                  var date = bar.data[2].slice(-7); // get the last week
                  $rootScope.barDetailDate = moment(date);
                  $rootScope.barDetail = true;
                  $state.go('root.main.diary');
                  console.log($rootScope.barDetailDate);
              })
            }
        }
    };

    /* settings and data for the big donut chart on dashboard / main*/
    $scope.optionsdonutchart = {
      chart: {
        type: "pieChart",
        width: $window.screen.width - 20, // to account for row and col padding
        height: $window.screen.width * 4/5,
        margin: {
          top: 25,
          left: 0,
          right: 0,
          bottom: 10
        },
        donut: true,
        donutRatio: 0.75,
        x: function(d){
          return modeTranslations[d.key]; },
        y: function(d){return d.values;},
        color: ["#9B9B9B",  "#000000", "#DCDDE1", "#FFFFFF", "#DCDDE1", "#ADADAD"],
        showLabels: true,
        showLegend: false,
        legend: {
          key: function(d){ return d.key; }
        },
        pie: {
          startAngle: function(d) { return d.startAngle + 4*Math.PI/5 },
          endAngle: function(d) { return d.endAngle + 4*Math.PI/5 },
          labelsOutside: true,
        },
        duration: 500,
        callback: function(chart) {
          console.log("============= chart output ============");
          console.log(chart);
          d3.select(".nv-pieLabels")
            .append("circle")
            .attr("r", "110")
            .style("fill", "#91F2DC");
          // since I don't know how to add dynamic data to the chart / SVG, I will add the label without any binding
          d3.select(".nv-pieLabels > text").remove();
          if (typeof $scope.carbonData != 'undefined') {
            console.log("updated usercarbon in chart callback to: ===== : " + $scope.carbonData.userCarbon);
            d3.select(".nv-pieLabels")
              .append("text")
              .style("font-size", "53px")
              .style("text-anchor", "middle")
              .style("alignment-baseline", "middle")
              .text($scope.carbonData.userCarbon);
          }

          // add stronger border radius to all labels
          //d3.selectAll(".nv-label rect")
          //  .attr("rx", "10px")
          //  .attr("ry", "10px");
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
        if(queryLastDays) {
          var tempFrom = moment2Timestamp(moment().utc().startOf('day').subtract(queryLastDays_amount, 'days'));
          var tempTo = moment2Timestamp(moment().utc());
          queryLastDays = false; // Only get last week's data once
          console.log("======== went through queryLastDays==========");
        } else {
          console.log("====AAAAAAAAAAAAAAAAAAAAAAAAAAAAA================= " + moment2Timestamp(moment().utc().startOf('day').subtract(14, 'days')));

          var tempFrom = moment2Timestamp($scope.selectCtrl.fromDateTimestamp);
          var tempTo = moment2Timestamp($scope.selectCtrl.toDateTimestamp);
        }
        data = {
          freq: (queryLastDays_amount == 1) ? "H" : "D", // if we are querying the last day, get hourly data, otherwise get daily data
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

    // this is a helper function to call when we want to show the last two week's data
    $scope.getLastDaysMetrics = function(amount) {
      queryLastDays = true;
      queryLastDays_amount = amount;
      setMetrics("timestamp", getMetrics);
    }

    var getUserMetricsFromServer = function() {
      var clonedData = angular.copy(data);
      delete clonedData.metric;
      clonedData.metric_list = [DURATION, MEDIAN_SPEED, COUNT, DISTANCE];
      clonedData.is_return_aggregate = false;
      var getMetricsResult = CommHelper.getMetrics(theMode, clonedData);
      return getMetricsResult;
    }

    /**
     * create a post request to get metrics from the server
     */
    var getAggMetricsFromServer = async function() {
      var clonedData = angular.copy(data);
      delete clonedData.metric;
      clonedData.metric_list = [DURATION, MEDIAN_SPEED, COUNT, DISTANCE];
      clonedData.is_return_aggregate = true;

      var url = await ControlHelper.getConnectUrlAsync()
      var getMetricsResult = $http.post(
        "http://134.209.237.178/result/metrics/timestamp",
        //"https://e-mission.eecs.berkeley.edu/result/metrics/timestamp",
        clonedData)
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

        console.log("===== getted User Metrics from Server in metrics.js line 573 getUserMetricsFromServer() ===================");
        console.log(results);
        $scope.summaryData.defaultSummary = $scope.summaryData.userSummary;
        distance2emission(); // convert to co2 values see function definition
        console.log("=================== summary data format =======");
        console.log($scope.summaryData.defaultSummary);
        d3.select(".nv-pieLabels > text").remove();
        console.log("updated usercarbon in getMetrics to: ===== : " + $scope.carbonData.userCarbon);
        d3.select(".nv-pieLabels")
          .append("text")
          .style("font-size", "53px")
          .style("text-anchor", "middle")
          .style("alignment-baseline", "middle")
          .text($scope.carbonData.userCarbon);

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
        console.log("===== getted Aggregated Metrics from Server in metrics.js line 607 getAggMetricsFromServer() ===================");
        console.log(results);
        $scope.fillAggregateValues(results.data.aggregate_metrics);
        $scope.uictrl.hasAggr = true;
        if (angular.isDefined($scope.chartDataAggr)) { //Only have to check one because
          // Restore the $apply if/when we go away from $http
          // $scope.$apply(function() {
          if (!$scope.uictrl.showMe) {
            $scope.showCharts($scope.chartDataAggr);
          }
          // })
        } else {
          // $scope.$apply(function() {
          $scope.showCharts([]);
          console.log("did not find aggregate result in response data "+JSON.stringify(results[2]));
          // });
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

    // this is the km to co2 grams factor we received from DFKI
    var d2e_table = {
      "ON_FOOT": 3,
      "BICYCLING": 21,
      "CAR": 139,
      "AIR_OR_HSR": 201,
      "BUS": 65,
      "TRAIN": 36,
      "UNKNOWN": 3, // same as walking because we don't know the mode so let's assume it was the lightest
      "SUBWAY": 65, // same as Bus because part of group public transit
      "TRAM": 65,// same as Bus because part of group public transit
    };
    var distance2emission = function() {
      console.log("============= here we go distance2emission ========");
      console.log($scope.summaryData.defaultSummary.distance);

      var factor = 1;
      var allEmissionSum = 0;

      $scope.summaryData.defaultSummary.distance.forEach(entry => {
        console.log("key " + entry.key);
        console.log(d2e_table[entry.key]);

        factor = (typeof d2e_table[entry.key] !== 'undefined') ? d2e_table[entry.key] : 1;
        entry.values = ((entry.values / 1000) * factor) / 1000; //convert to km, then get grams of co2, then convert to kg

        allEmissionSum +=  entry.values; // add co2 value to allEmissionSum which will be shown inside donut chart
      });

      $scope.carbonData.userCarbon = allEmissionSum.toFixed(1) + " kg"; // cut value to two decimal digits and make it a string


      console.log($scope.summaryData.defaultSummary.distance);
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

        $scope.carbonData.ca2035 = Math.round(40.142892 / 5 * days) + ' kg'; // kg/day
        $scope.carbonData.ca2050 = Math.round(8.28565 / 5 * days) + ' kg';

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
        console.log("============== after getFootprintForMetrics: " + FootprintHelper.getFootprintForMetrics(aggrCarbonData));
      }
    };


    $scope.showCharts = function(agg_metrics) {
      $scope.data.count = getDataFromMetrics(agg_metrics.count, metric2valUser);
      $scope.data.distance = getDataFromMetrics(agg_metrics.distance, metric2valUser);// we replaced this line with some dummy data:

      // a helper object  to store the index of a distance entry to a given timestamp
      // e.g. our distances are [..., {key: 1389723497, values: 34566}, ...] where this shown entry is index 4 of the array
      // then the helper array will show { ..., '1389723497' : 4, ... }
      $scope.cumulatedDataHelper = {};
      $scope.cumulatedData = [];

      // convert distance to co2 values
      var i = 0;
      $scope.data.distance.forEach ( entry => {
        var factor = (typeof d2e_table[entry.key] !== 'undefined') ? d2e_table[entry.key] : 1; // multiply by co2 per km factor;
        entry.values.forEach (distance => {
          distance[1] /= 1000; // convert to km
          distance[1] *= factor; // get grams of emission
          distance[1] /= 1000; // convert g to kg

          let distanceTimeStamp = distance[0];
          if ($scope.cumulatedDataHelper[distanceTimeStamp] != undefined) {
            $scope.cumulatedData[$scope.cumulatedDataHelper[distanceTimeStamp]][1] += distance[1];
          } else {
            $scope.cumulatedDataHelper[distanceTimeStamp] = i;
            $scope.cumulatedData[i] = [
              distanceTimeStamp,
              distance[1] ];
            i++;
          }
        });
      });


      console.log('array: ' + JSON.stringify($scope.cumulatedData))
      $scope.cumulatedData.sort(function(a, b){return a[0] - b[0]});
      console.log('sort array: ' + $scope.cumulatedData[7])
      let fromTime = $scope.cumulatedData[0][0];
      let toTime = $scope.cumulatedData[$scope.cumulatedData.length - 1][0];
      
      $scope.chartData = [
        {key: "average", values: [[fromTime,1],[toTime,1]]},
        {key: "goal", values: [[fromTime,4.5],[toTime,4.5]]},
        {key: "everything", values: $scope.cumulatedData}
      ];



      console.log("=================start stuff");
      console.log($scope.data.distance);
      console.log(agg_metrics);
      console.log(metric2valUser);
      console.log($scope.chartDataAggr);
      console.log($scope.chartDataUser);
      console.log("==================end stuff");
      /* $scope.data.distance = [
        {
          "key" : "North America" ,
          "values" : [ [ 1025409600000 , 23.041422681023] , [ 1028088000000 , 19.854291255832] , [ 1030766400000 , 21.02286281168] , [ 1033358400000 , 22.093608385173] , [ 1036040400000 , 25.108079299458] , [ 1038632400000 , 26.982389242348] , [ 1041310800000 , 19.828984957662] , [ 1043989200000 , 19.914055036294] , [ 1046408400000 , 19.436150539916] , [ 1049086800000 , 21.558650338602] , [ 1051675200000 , 24.395594061773] , [ 1054353600000 , 24.747089309384] , [ 1056945600000 , 23.491755498807] , [ 1059624000000 , 23.376634878164] , [ 1062302400000 , 24.581223154533] , [ 1064894400000 , 24.922476843538] , [ 1067576400000 , 27.357712939042] , [ 1070168400000 , 26.503020572593] , [ 1072846800000 , 26.658901244878] , [ 1075525200000 , 27.065704156445] , [ 1078030800000 , 28.735320452588] , [ 1080709200000 , 31.572277846319] , [ 1083297600000 , 30.932161503638] , [ 1085976000000 , 31.627029785554] , [ 1088568000000 , 28.728743674232] , [ 1091246400000 , 26.858365172675] , [ 1093924800000 , 27.279922830032] , [ 1096516800000 , 34.408301211324] , [ 1099195200000 , 34.794362930439] , [ 1101790800000 , 35.609978198951] , [ 1104469200000 , 33.574394968037] , [ 1107147600000 , 31.979405070598] , [ 1109566800000 , 31.19009040297] , [ 1112245200000 , 31.083933968994] , [ 1114833600000 , 29.668971113185] , [ 1117512000000 , 31.490638014379] , [ 1120104000000 , 31.818617451128] , [ 1122782400000 , 32.960314008183] , [ 1125460800000 , 31.313383196209] , [ 1128052800000 , 33.125486081852] , [ 1130734800000 , 32.791805509149] , [ 1133326800000 , 33.506038030366] , [ 1136005200000 , 26.96501697216] , [ 1138683600000 , 27.38478809681] , [ 1141102800000 , 27.371377218209] , [ 1143781200000 , 26.309915460827] , [ 1146369600000 , 26.425199957518] , [ 1149048000000 , 26.823411519396] , [ 1151640000000 , 23.850443591587] , [ 1154318400000 , 23.158355444054] , [ 1156996800000 , 22.998689393695] , [ 1159588800000 , 27.9771285113] , [ 1162270800000 , 29.073672469719] , [ 1164862800000 , 28.587640408904] , [ 1167541200000 , 22.788453687637] , [ 1170219600000 , 22.429199073597] , [ 1172638800000 , 22.324103271052] , [ 1175313600000 , 17.558388444187] , [ 1177905600000 , 16.769518096208] , [ 1180584000000 , 16.214738201301] , [ 1183176000000 , 18.729632971229] , [ 1185854400000 , 18.814523318847] , [ 1188532800000 , 19.789986451358] , [ 1191124800000 , 17.070049054933] , [ 1193803200000 , 16.121349575716] , [ 1196398800000 , 15.141659430091] , [ 1199077200000 , 17.175388025297] , [ 1201755600000 , 17.286592443522] , [ 1204261200000 , 16.323141626568] , [ 1206936000000 , 19.231263773952] , [ 1209528000000 , 18.446256391095] , [ 1212206400000 , 17.822632399764] , [ 1214798400000 , 15.53936647598] , [ 1217476800000 , 15.255131790217] , [ 1220155200000 , 15.660963922592] , [ 1222747200000 , 13.254482273698] , [ 1225425600000 , 11.920796202299] , [ 1228021200000 , 12.122809090924] , [ 1230699600000 , 15.691026271393] , [ 1233378000000 , 14.720881635107] , [ 1235797200000 , 15.387939360044] , [ 1238472000000 , 13.765436672228] , [ 1241064000000 , 14.631445864799] , [ 1243742400000 , 14.292446536221] , [ 1246334400000 , 16.170071367017] , [ 1249012800000 , 15.948135554337] , [ 1251691200000 , 16.612872685134] , [ 1254283200000 , 18.778338719091] , [ 1256961600000 , 16.756026065421] , [ 1259557200000 , 19.385804443146] , [ 1262235600000 , 22.950590240168] , [ 1264914000000 , 23.61159018141] , [ 1267333200000 , 25.708586989581] , [ 1270008000000 , 26.883915999885] , [ 1272600000000 , 25.893486687065] , [ 1275278400000 , 24.678914263176] , [ 1277870400000 , 25.937275793024] , [ 1280548800000 , 29.461381693838] , [ 1283227200000 , 27.357322961861] , [ 1285819200000 , 29.057235285673] , [ 1288497600000 , 28.549434189386] , [ 1291093200000 , 28.506352379724] , [ 1293771600000 , 29.449241421598] , [ 1296450000000 , 25.796838168807] , [ 1298869200000 , 28.740145449188] , [ 1301544000000 , 22.091744141872] , [ 1304136000000 , 25.07966254541] , [ 1306814400000 , 23.674906973064] , [ 1309406400000 , 23.418002742929] , [ 1312084800000 , 23.24364413887] , [ 1314763200000 , 31.591854066817] , [ 1317355200000 , 31.497112374114] , [ 1320033600000 , 26.67238082043] , [ 1322629200000 , 27.297080015495] , [ 1325307600000 , 20.174315530051] , [ 1327986000000 , 19.631084213898] , [ 1330491600000 , 20.366462219461] , [ 1333166400000 , 19.284784434185] , [ 1335758400000 , 19.157810257624]]
        },

        {
          "key" : "Africa" ,
          "values" : [ [ 1025409600000 , 7.9356392949025] , [ 1028088000000 , 7.4514668527298] , [ 1030766400000 , 7.9085410566608] , [ 1033358400000 , 5.8996782364764] , [ 1036040400000 , 6.0591869346923] , [ 1038632400000 , 5.9667815800451] , [ 1041310800000 , 8.65528925664] , [ 1043989200000 , 8.7690763386254] , [ 1046408400000 , 8.6386160387453] , [ 1049086800000 , 5.9895557449743] , [ 1051675200000 , 6.3840324338159] , [ 1054353600000 , 6.5196511461441] , [ 1056945600000 , 7.0738618553114] , [ 1059624000000 , 6.5745957367133] , [ 1062302400000 , 6.4658359184444] , [ 1064894400000 , 2.7622758754954] , [ 1067576400000 , 2.9794782986241] , [ 1070168400000 , 2.8735432712019] , [ 1072846800000 , 1.6344817513645] , [ 1075525200000 , 1.5869248754883] , [ 1078030800000 , 1.7172279157246] , [ 1080709200000 , 1.9649927409867] , [ 1083297600000 , 2.0261695079196] , [ 1085976000000 , 2.0541261923929] , [ 1088568000000 , 3.9466318927569] , [ 1091246400000 , 3.7826770946089] , [ 1093924800000 , 3.9543021004028] , [ 1096516800000 , 3.8309891064711] , [ 1099195200000 , 3.6340958946166] , [ 1101790800000 , 3.5289755762525] , [ 1104469200000 , 5.702378559857] , [ 1107147600000 , 5.6539569019223] , [ 1109566800000 , 5.5449506370392] , [ 1112245200000 , 4.7579993280677] , [ 1114833600000 , 4.4816139372906] , [ 1117512000000 , 4.5965558568606] , [ 1120104000000 , 4.3747066116976] , [ 1122782400000 , 4.4588822917087] , [ 1125460800000 , 4.4460351848286] , [ 1128052800000 , 3.7989113035136] , [ 1130734800000 , 3.7743883140088] , [ 1133326800000 , 3.7727852823828] , [ 1136005200000 , 7.2968111448895] , [ 1138683600000 , 7.2800122043237] , [ 1141102800000 , 7.1187787503354] , [ 1143781200000 , 8.351887016482] , [ 1146369600000 , 8.4156698763993] , [ 1149048000000 , 8.1673298604231] , [ 1151640000000 , 5.5132447126042] , [ 1154318400000 , 6.1152537710599] , [ 1156996800000 , 6.076765091942] , [ 1159588800000 , 4.6304473798646] , [ 1162270800000 , 4.6301068469402] , [ 1164862800000 , 4.3466656309389] , [ 1167541200000 , 6.830104897003] , [ 1170219600000 , 7.241633040029] , [ 1172638800000 , 7.1432372054153] , [ 1175313600000 , 10.608942063374] , [ 1177905600000 , 10.914964549494] , [ 1180584000000 , 10.933223880565] , [ 1183176000000 , 8.3457524851265] , [ 1185854400000 , 8.1078413081882] , [ 1188532800000 , 8.2697185922474] , [ 1191124800000 , 8.4742436475968] , [ 1193803200000 , 8.4994601179319] , [ 1196398800000 , 8.7387319683243] , [ 1199077200000 , 6.8829183612895] , [ 1201755600000 , 6.984133637885] , [ 1204261200000 , 7.0860136043287] , [ 1206936000000 , 4.3961787956053] , [ 1209528000000 , 3.8699674365231] , [ 1212206400000 , 3.6928925238305] , [ 1214798400000 , 6.7571718894253] , [ 1217476800000 , 6.4367313362344] , [ 1220155200000 , 6.4048441521454] , [ 1222747200000 , 5.4643833239669] , [ 1225425600000 , 5.3150786833374] , [ 1228021200000 , 5.3011272612576] , [ 1230699600000 , 4.1203601430809] , [ 1233378000000 , 4.0881783200525] , [ 1235797200000 , 4.1928665957189] , [ 1238472000000 , 7.0249415663205] , [ 1241064000000 , 7.006530880769] , [ 1243742400000 , 6.994835633224] , [ 1246334400000 , 6.1220222336254] , [ 1249012800000 , 6.1177436137653] , [ 1251691200000 , 6.1413396231981] , [ 1254283200000 , 4.8046006145874] , [ 1256961600000 , 4.6647600660544] , [ 1259557200000 , 4.544865006255] , [ 1262235600000 , 6.0488249316539] , [ 1264914000000 , 6.3188669540206] , [ 1267333200000 , 6.5873958262306] , [ 1270008000000 , 6.2281189839578] , [ 1272600000000 , 5.8948915746059] , [ 1275278400000 , 5.5967320482214] , [ 1277870400000 , 0.99784432084837] , [ 1280548800000 , 1.0950794175359] , [ 1283227200000 , 0.94479734407491] , [ 1285819200000 , 1.222093988688] , [ 1288497600000 , 1.335093106856] , [ 1291093200000 , 1.3302565104985] , [ 1293771600000 , 1.340824670897] , [ 1296450000000 , 0] , [ 1298869200000 , 0] , [ 1301544000000 , 0] , [ 1304136000000 , 0] , [ 1306814400000 , 0] , [ 1309406400000 , 0] , [ 1312084800000 , 0] , [ 1314763200000 , 0] , [ 1317355200000 , 4.4583692315] , [ 1320033600000 , 3.6493043348059] , [ 1322629200000 , 3.8610064091761] , [ 1325307600000 , 5.5144800685202] , [ 1327986000000 , 5.1750695220791] , [ 1330491600000 , 5.6710066952691] , [ 1333166400000 , 5.5611890039181] , [ 1335758400000 , 5.5979368839939]]
        },

        {
          "key" : "South America" ,
          "values" : [ [ 1025409600000 , 7.9149900245423] , [ 1028088000000 , 7.0899888751059] , [ 1030766400000 , 7.5996132380614] , [ 1033358400000 , 8.2741174301034] , [ 1036040400000 , 9.3564460833513] , [ 1038632400000 , 9.7066786059904] , [ 1041310800000 , 10.213363052343] , [ 1043989200000 , 10.285809585273] , [ 1046408400000 , 10.222053149228] , [ 1049086800000 , 8.6188592137975] , [ 1051675200000 , 9.3335447543566] , [ 1054353600000 , 8.9312402186628] , [ 1056945600000 , 8.1895089343658] , [ 1059624000000 , 8.260622135079] , [ 1062302400000 , 7.7700786851364] , [ 1064894400000 , 7.9907428771318] , [ 1067576400000 , 8.7769091865606] , [ 1070168400000 , 8.4855077060661] , [ 1072846800000 , 9.6277203033655] , [ 1075525200000 , 9.9685913452624] , [ 1078030800000 , 10.615085181759] , [ 1080709200000 , 9.2902488079646] , [ 1083297600000 , 8.8610439830061] , [ 1085976000000 , 9.1075344931229] , [ 1088568000000 , 9.9156737639203] , [ 1091246400000 , 9.7826003238782] , [ 1093924800000 , 10.55403610555] , [ 1096516800000 , 10.926900264097] , [ 1099195200000 , 10.903144818736] , [ 1101790800000 , 10.862890389067] , [ 1104469200000 , 10.64604998964] , [ 1107147600000 , 10.042790814087] , [ 1109566800000 , 9.7173391591038] , [ 1112245200000 , 9.6122415755443] , [ 1114833600000 , 9.4337921146562] , [ 1117512000000 , 9.814827171183] , [ 1120104000000 , 12.059260396788] , [ 1122782400000 , 12.139649903873] , [ 1125460800000 , 12.281290663822] , [ 1128052800000 , 8.8037085409056] , [ 1130734800000 , 8.6300618239176] , [ 1133326800000 , 9.1225708491432] , [ 1136005200000 , 12.988124170836] , [ 1138683600000 , 13.356778764353] , [ 1141102800000 , 13.611196863271] , [ 1143781200000 , 6.8959030061189] , [ 1146369600000 , 6.9939633271353] , [ 1149048000000 , 6.7241510257676] , [ 1151640000000 , 5.5611293669517] , [ 1154318400000 , 5.6086488714041] , [ 1156996800000 , 5.4962849907033] , [ 1159588800000 , 6.9193153169278] , [ 1162270800000 , 7.0016334389778] , [ 1164862800000 , 6.7865422443273] , [ 1167541200000 , 9.0006454225383] , [ 1170219600000 , 9.2233916171431] , [ 1172638800000 , 8.8929316009479] , [ 1175313600000 , 10.345937520404] , [ 1177905600000 , 10.075914677026] , [ 1180584000000 , 10.089006188111] , [ 1183176000000 , 10.598330295008] , [ 1185854400000 , 9.9689546533009] , [ 1188532800000 , 9.7740580198146] , [ 1191124800000 , 10.558483060626] , [ 1193803200000 , 9.9314651823603] , [ 1196398800000 , 9.3997715873769] , [ 1199077200000 , 8.4086493387262] , [ 1201755600000 , 8.9698309085926] , [ 1204261200000 , 8.2778357995396] , [ 1206936000000 , 8.8585045600123] , [ 1209528000000 , 8.7013756413322] , [ 1212206400000 , 7.7933605469443] , [ 1214798400000 , 7.0236183483064] , [ 1217476800000 , 6.9873088186829] , [ 1220155200000 , 6.8031713070097] , [ 1222747200000 , 6.6869531315723] , [ 1225425600000 , 6.138256993963] , [ 1228021200000 , 5.6434994016354] , [ 1230699600000 , 5.495220262512] , [ 1233378000000 , 4.6885326869846] , [ 1235797200000 , 4.4524349883438] , [ 1238472000000 , 5.6766520778185] , [ 1241064000000 , 5.7675774480752] , [ 1243742400000 , 5.7882863168337] , [ 1246334400000 , 7.2666010034924] , [ 1249012800000 , 7.5191821322261] , [ 1251691200000 , 7.849651451445] , [ 1254283200000 , 10.383992037985] , [ 1256961600000 , 9.0653691861818] , [ 1259557200000 , 9.6705248324159] , [ 1262235600000 , 10.856380561349] , [ 1264914000000 , 11.27452370892] , [ 1267333200000 , 11.754156529088] , [ 1270008000000 , 8.2870811422455] , [ 1272600000000 , 8.0210264360699] , [ 1275278400000 , 7.5375074474865] , [ 1277870400000 , 8.3419527338039] , [ 1280548800000 , 9.4197471818443] , [ 1283227200000 , 8.7321733185797] , [ 1285819200000 , 9.6627062648126] , [ 1288497600000 , 10.187962234548] , [ 1291093200000 , 9.8144201733476] , [ 1293771600000 , 10.275723361712] , [ 1296450000000 , 16.796066079353] , [ 1298869200000 , 17.543254984075] , [ 1301544000000 , 16.673660675083] , [ 1304136000000 , 17.963944353609] , [ 1306814400000 , 16.63774086721] , [ 1309406400000 , 15.84857094609] , [ 1312084800000 , 14.767303362181] , [ 1314763200000 , 24.778452182433] , [ 1317355200000 , 18.370353229999] , [ 1320033600000 , 15.253137429099] , [ 1322629200000 , 14.989600840649] , [ 1325307600000 , 16.052539160125] , [ 1327986000000 , 16.424390322793] , [ 1330491600000 , 17.884020741104] , [ 1333166400000 , 18.372698836036] , [ 1335758400000 , 18.315881576096]]
        },

        {
          "key" : "Asia" ,
          "values" : [ [ 1025409600000 , 13.153938631352] , [ 1028088000000 , 12.456410521864] , [ 1030766400000 , 12.537048663919] , [ 1033358400000 , 13.947386398309] , [ 1036040400000 , 14.421680682568] , [ 1038632400000 , 14.143238262286] , [ 1041310800000 , 12.229635347478] , [ 1043989200000 , 12.508479916948] , [ 1046408400000 , 12.155368409526] , [ 1049086800000 , 13.335455563994] , [ 1051675200000 , 12.888210138167] , [ 1054353600000 , 12.842092790511] , [ 1056945600000 , 12.513816474199] , [ 1059624000000 , 12.21453674494] , [ 1062302400000 , 11.750848343935] , [ 1064894400000 , 10.526579636787] , [ 1067576400000 , 10.873596086087] , [ 1070168400000 , 11.019967131519] , [ 1072846800000 , 11.235789380602] , [ 1075525200000 , 11.859910850657] , [ 1078030800000 , 12.531031616536] , [ 1080709200000 , 11.360451067019] , [ 1083297600000 , 11.456244780202] , [ 1085976000000 , 11.436991407309] , [ 1088568000000 , 11.638595744327] , [ 1091246400000 , 11.190418301469] , [ 1093924800000 , 11.835608007589] , [ 1096516800000 , 11.540980244475] , [ 1099195200000 , 10.958762325687] , [ 1101790800000 , 10.885791159509] , [ 1104469200000 , 13.605810720109] , [ 1107147600000 , 13.128978067437] , [ 1109566800000 , 13.119012086882] , [ 1112245200000 , 13.003706129783] , [ 1114833600000 , 13.326996807689] , [ 1117512000000 , 13.547947991743] , [ 1120104000000 , 12.807959646616] , [ 1122782400000 , 12.931763821068] , [ 1125460800000 , 12.795359993008] , [ 1128052800000 , 9.6998935538319] , [ 1130734800000 , 9.3473740089131] , [ 1133326800000 , 9.36902067716] , [ 1136005200000 , 14.258619539875] , [ 1138683600000 , 14.21241095603] , [ 1141102800000 , 13.973193618249] , [ 1143781200000 , 15.218233920664] , [ 1146369600000 , 14.382109727451] , [ 1149048000000 , 13.894310878491] , [ 1151640000000 , 15.593086090031] , [ 1154318400000 , 16.244839695189] , [ 1156996800000 , 16.017088850647] , [ 1159588800000 , 14.183951830057] , [ 1162270800000 , 14.148523245696] , [ 1164862800000 , 13.424326059971] , [ 1167541200000 , 12.974450435754] , [ 1170219600000 , 13.232470418021] , [ 1172638800000 , 13.318762655574] , [ 1175313600000 , 15.961407746104] , [ 1177905600000 , 16.287714639805] , [ 1180584000000 , 16.24659058389] , [ 1183176000000 , 17.564505594808] , [ 1185854400000 , 17.872725373164] , [ 1188532800000 , 18.018998508756] , [ 1191124800000 , 15.584518016602] , [ 1193803200000 , 15.480850647182] , [ 1196398800000 , 15.699120036985] , [ 1199077200000 , 19.184281817226] , [ 1201755600000 , 19.691226605205] , [ 1204261200000 , 18.982314051293] , [ 1206936000000 , 18.707820309008] , [ 1209528000000 , 17.459630929759] , [ 1212206400000 , 16.500616076782] , [ 1214798400000 , 18.086324003978] , [ 1217476800000 , 18.929464156259] , [ 1220155200000 , 18.233728682084] , [ 1222747200000 , 16.315776297325] , [ 1225425600000 , 14.632892190251] , [ 1228021200000 , 14.667835024479] , [ 1230699600000 , 13.946993947309] , [ 1233378000000 , 14.394304684398] , [ 1235797200000 , 13.724462792967] , [ 1238472000000 , 10.930879035807] , [ 1241064000000 , 9.8339915513708] , [ 1243742400000 , 10.053858541872] , [ 1246334400000 , 11.786998438286] , [ 1249012800000 , 11.780994901769] , [ 1251691200000 , 11.305889670277] , [ 1254283200000 , 10.918452290083] , [ 1256961600000 , 9.6811395055706] , [ 1259557200000 , 10.971529744038] , [ 1262235600000 , 13.330210480209] , [ 1264914000000 , 14.592637568961] , [ 1267333200000 , 14.605329141157] , [ 1270008000000 , 13.936853794037] , [ 1272600000000 , 12.189480759072] , [ 1275278400000 , 11.676151385046] , [ 1277870400000 , 13.058852800018] , [ 1280548800000 , 13.62891543203] , [ 1283227200000 , 13.811107569918] , [ 1285819200000 , 13.786494560786] , [ 1288497600000 , 14.045162857531] , [ 1291093200000 , 13.697412447286] , [ 1293771600000 , 13.677681376221] , [ 1296450000000 , 19.96151186453] , [ 1298869200000 , 21.049198298156] , [ 1301544000000 , 22.687631094009] , [ 1304136000000 , 25.469010617433] , [ 1306814400000 , 24.88379943712] , [ 1309406400000 , 24.203843814249] , [ 1312084800000 , 22.138760964036] , [ 1314763200000 , 16.034636966228] , [ 1317355200000 , 15.394958944555] , [ 1320033600000 , 12.62564246197] , [ 1322629200000 , 12.973735699739] , [ 1325307600000 , 15.78601833615] , [ 1327986000000 , 15.227368020134] , [ 1330491600000 , 15.899752650733] , [ 1333166400000 , 15.661317319168] , [ 1335758400000 , 15.359891177281]]
        } ,

        {
          "key" : "Europe" ,
          "values" : [ [ 1025409600000 , 9.3433263069351] , [ 1028088000000 , 8.4583069475546] , [ 1030766400000 , 8.0342398154196] , [ 1033358400000 , 8.1538966876572] , [ 1036040400000 , 10.743604786849] , [ 1038632400000 , 12.349366155851] , [ 1041310800000 , 10.742682503899] , [ 1043989200000 , 11.360983869935] , [ 1046408400000 , 11.441336039535] , [ 1049086800000 , 10.897508791837] , [ 1051675200000 , 11.469101547709] , [ 1054353600000 , 12.086311476742] , [ 1056945600000 , 8.0697180773504] , [ 1059624000000 , 8.2004392233445] , [ 1062302400000 , 8.4566434900643] , [ 1064894400000 , 7.9565760979059] , [ 1067576400000 , 9.3764619255827] , [ 1070168400000 , 9.0747664160538] , [ 1072846800000 , 10.508939004673] , [ 1075525200000 , 10.69936754483] , [ 1078030800000 , 10.681562399145] , [ 1080709200000 , 13.184786109406] , [ 1083297600000 , 12.668213052351] , [ 1085976000000 , 13.430509403986] , [ 1088568000000 , 12.393086349213] , [ 1091246400000 , 11.942374044842] , [ 1093924800000 , 12.062227685742] , [ 1096516800000 , 11.969974363623] , [ 1099195200000 , 12.14374574055] , [ 1101790800000 , 12.69422821995] , [ 1104469200000 , 9.1235211044692] , [ 1107147600000 , 8.758211757584] , [ 1109566800000 , 8.8072309258443] , [ 1112245200000 , 11.687595946835] , [ 1114833600000 , 11.079723082664] , [ 1117512000000 , 12.049712896076] , [ 1120104000000 , 10.725319428684] , [ 1122782400000 , 10.844849996286] , [ 1125460800000 , 10.833535488461] , [ 1128052800000 , 17.180932407865] , [ 1130734800000 , 15.894764896516] , [ 1133326800000 , 16.412751299498] , [ 1136005200000 , 12.573569093402] , [ 1138683600000 , 13.242301508051] , [ 1141102800000 , 12.863536342041] , [ 1143781200000 , 21.034044171629] , [ 1146369600000 , 21.419084618802] , [ 1149048000000 , 21.142678863692] , [ 1151640000000 , 26.56848967753] , [ 1154318400000 , 24.839144939906] , [ 1156996800000 , 25.456187462166] , [ 1159588800000 , 26.350164502825] , [ 1162270800000 , 26.478333205189] , [ 1164862800000 , 26.425979547846] , [ 1167541200000 , 28.191461582256] , [ 1170219600000 , 28.930307448808] , [ 1172638800000 , 29.521413891117] , [ 1175313600000 , 28.188285966466] , [ 1177905600000 , 27.704619625831] , [ 1180584000000 , 27.49086242483] , [ 1183176000000 , 28.770679721286] , [ 1185854400000 , 29.06048067145] , [ 1188532800000 , 28.240998844973] , [ 1191124800000 , 33.004893194128] , [ 1193803200000 , 34.075180359928] , [ 1196398800000 , 32.548560664834] , [ 1199077200000 , 30.629727432729] , [ 1201755600000 , 28.642858788159] , [ 1204261200000 , 27.973575227843] , [ 1206936000000 , 27.393351882726] , [ 1209528000000 , 28.476095288522] , [ 1212206400000 , 29.29667866426] , [ 1214798400000 , 29.222333802896] , [ 1217476800000 , 28.092966093842] , [ 1220155200000 , 28.107159262922] , [ 1222747200000 , 25.482974832099] , [ 1225425600000 , 21.208115993834] , [ 1228021200000 , 20.295043095268] , [ 1230699600000 , 15.925754618402] , [ 1233378000000 , 17.162864628346] , [ 1235797200000 , 17.084345773174] , [ 1238472000000 , 22.24600710228] , [ 1241064000000 , 24.530543998508] , [ 1243742400000 , 25.084184918241] , [ 1246334400000 , 16.606166527359] , [ 1249012800000 , 17.239620011628] , [ 1251691200000 , 17.336739127379] , [ 1254283200000 , 25.478492475754] , [ 1256961600000 , 23.017152085244] , [ 1259557200000 , 25.617745423684] , [ 1262235600000 , 24.061133998641] , [ 1264914000000 , 23.223933318646] , [ 1267333200000 , 24.425887263936] , [ 1270008000000 , 35.501471156693] , [ 1272600000000 , 33.775013878675] , [ 1275278400000 , 30.417993630285] , [ 1277870400000 , 30.023598978467] , [ 1280548800000 , 33.327519522436] , [ 1283227200000 , 31.963388450372] , [ 1285819200000 , 30.49896723209] , [ 1288497600000 , 32.403696817913] , [ 1291093200000 , 31.47736071922] , [ 1293771600000 , 31.53259666241] , [ 1296450000000 , 41.760282761548] , [ 1298869200000 , 45.605771243237] , [ 1301544000000 , 39.986557966215] , [ 1304136000000 , 43.84633051005] , [ 1306814400000 , 39.857316881858] , [ 1309406400000 , 37.675127768207] , [ 1312084800000 , 35.775077970313] , [ 1314763200000 , 48.631009702578] , [ 1317355200000 , 42.830831754505] , [ 1320033600000 , 35.611502589362] , [ 1322629200000 , 35.320136981738] , [ 1325307600000 , 31.564136901516] , [ 1327986000000 , 32.074407502433] , [ 1330491600000 , 35.053013769977] , [ 1333166400000 , 33.873085184128] , [ 1335758400000 , 32.321039427046]]
        } ,

        {
          "key" : "Australia" ,
          "values" : [ [ 1025409600000 , 5.1162447683392] , [ 1028088000000 , 4.2022848306513] , [ 1030766400000 , 4.3543715758736] , [ 1033358400000 , 5.4641223667245] , [ 1036040400000 , 6.0041275884577] , [ 1038632400000 , 6.6050520064486] , [ 1041310800000 , 5.0154059912793] , [ 1043989200000 , 5.1835708554647] , [ 1046408400000 , 5.1142682006164] , [ 1049086800000 , 5.0271381717695] , [ 1051675200000 , 5.3437782653456] , [ 1054353600000 , 5.2105844515767] , [ 1056945600000 , 6.552565997799] , [ 1059624000000 , 6.9873363581831] , [ 1062302400000 , 7.010986789097] , [ 1064894400000 , 4.4254242025515] , [ 1067576400000 , 4.9613848042174] , [ 1070168400000 , 4.8854920484764] , [ 1072846800000 , 4.0441111794228] , [ 1075525200000 , 4.0219596813179] , [ 1078030800000 , 4.3065749225355] , [ 1080709200000 , 3.9148434915404] , [ 1083297600000 , 3.8659430654512] , [ 1085976000000 , 3.9572824600686] , [ 1088568000000 , 4.7372190641522] , [ 1091246400000 , 4.6871476374455] , [ 1093924800000 , 5.0398702564196] , [ 1096516800000 , 5.5221787544964] , [ 1099195200000 , 5.424646299798] , [ 1101790800000 , 5.9240223067349] , [ 1104469200000 , 5.9936860983601] , [ 1107147600000 , 5.8499523215019] , [ 1109566800000 , 6.4149040329325] , [ 1112245200000 , 6.4547895561969] , [ 1114833600000 , 5.9385382611161] , [ 1117512000000 , 6.0486751030592] , [ 1120104000000 , 5.23108613838] , [ 1122782400000 , 5.5857797121029] , [ 1125460800000 , 5.3454665096987] , [ 1128052800000 , 5.0439154120119] , [ 1130734800000 , 5.054634702913] , [ 1133326800000 , 5.3819451380848] , [ 1136005200000 , 5.2638869269803] , [ 1138683600000 , 5.5806167415681] , [ 1141102800000 , 5.4539047069985] , [ 1143781200000 , 7.6728842432362] , [ 1146369600000 , 7.719946716654] , [ 1149048000000 , 8.0144619912942] , [ 1151640000000 , 7.942223133434] , [ 1154318400000 , 8.3998279827444] , [ 1156996800000 , 8.532324572605] , [ 1159588800000 , 4.7324285199763] , [ 1162270800000 , 4.7402397487697] , [ 1164862800000 , 4.9042069355168] , [ 1167541200000 , 5.9583963430882] , [ 1170219600000 , 6.3693899239171] , [ 1172638800000 , 6.261153903813] , [ 1175313600000 , 5.3443942184584] , [ 1177905600000 , 5.4932111235361] , [ 1180584000000 , 5.5747393101109] , [ 1183176000000 , 5.3833633060013] , [ 1185854400000 , 5.5125898831832] , [ 1188532800000 , 5.8116112661327] , [ 1191124800000 , 4.3962296939996] , [ 1193803200000 , 4.6967663605521] , [ 1196398800000 , 4.7963004350914] , [ 1199077200000 , 4.1817985183351] , [ 1201755600000 , 4.3797643870182] , [ 1204261200000 , 4.6966642197965] , [ 1206936000000 , 4.3609995132565] , [ 1209528000000 , 4.4736290996496] , [ 1212206400000 , 4.3749762738128] , [ 1214798400000 , 3.3274661194507] , [ 1217476800000 , 3.0316184691337] , [ 1220155200000 , 2.5718140204728] , [ 1222747200000 , 2.7034994044603] , [ 1225425600000 , 2.2033786591364] , [ 1228021200000 , 1.9850621240805] , [ 1230699600000 , 0] , [ 1233378000000 , 0] , [ 1235797200000 , 0] , [ 1238472000000 , 0] , [ 1241064000000 , 0] , [ 1243742400000 , 0] , [ 1246334400000 , 0] , [ 1249012800000 , 0] , [ 1251691200000 , 0] , [ 1254283200000 , 0.44495950017788] , [ 1256961600000 , 0.33945469262483] , [ 1259557200000 , 0.38348269455195] , [ 1262235600000 , 0] , [ 1264914000000 , 0] , [ 1267333200000 , 0] , [ 1270008000000 , 0] , [ 1272600000000 , 0] , [ 1275278400000 , 0] , [ 1277870400000 , 0] , [ 1280548800000 , 0] , [ 1283227200000 , 0] , [ 1285819200000 , 0] , [ 1288497600000 , 0] , [ 1291093200000 , 0] , [ 1293771600000 , 0] , [ 1296450000000 , 0.52216435716176] , [ 1298869200000 , 0.59275786698454] , [ 1301544000000 , 0] , [ 1304136000000 , 0] , [ 1306814400000 , 0] , [ 1309406400000 , 0] , [ 1312084800000 , 0] , [ 1314763200000 , 0] , [ 1317355200000 , 0] , [ 1320033600000 , 0] , [ 1322629200000 , 0] , [ 1325307600000 , 0] , [ 1327986000000 , 0] , [ 1330491600000 , 0] , [ 1333166400000 , 0] , [ 1335758400000 , 0]]
        } ,

        {
          "key" : "Antarctica" ,
          "values" : [ [ 1025409600000 , 1.3503144674343] , [ 1028088000000 , 1.2232741112434] , [ 1030766400000 , 1.3930470790784] , [ 1033358400000 , 1.2631275030593] , [ 1036040400000 , 1.5842699103708] , [ 1038632400000 , 1.9546996043116] , [ 1041310800000 , 0.8504048300986] , [ 1043989200000 , 0.85340686311353] , [ 1046408400000 , 0.843061357391] , [ 1049086800000 , 2.119846992476] , [ 1051675200000 , 2.5285382124858] , [ 1054353600000 , 2.5056570712835] , [ 1056945600000 , 2.5212789901005] , [ 1059624000000 , 2.6192011642534] , [ 1062302400000 , 2.5382187823805] , [ 1064894400000 , 2.3393223047168] , [ 1067576400000 , 2.491219888698] , [ 1070168400000 , 2.497555874906] , [ 1072846800000 , 1.734018115546] , [ 1075525200000 , 1.9307268299646] , [ 1078030800000 , 2.2261679836799] , [ 1080709200000 , 1.7608893704206] , [ 1083297600000 , 1.6242690616808] , [ 1085976000000 , 1.7161663801295] , [ 1088568000000 , 1.7183554537038] , [ 1091246400000 , 1.7179780759145] , [ 1093924800000 , 1.7314274801784] , [ 1096516800000 , 1.2596883356752] , [ 1099195200000 , 1.381177053009] , [ 1101790800000 , 1.4408819615814] , [ 1104469200000 , 3.4743581836444] , [ 1107147600000 , 3.3603749903192] , [ 1109566800000 , 3.5350883257893] , [ 1112245200000 , 3.0949644237828] , [ 1114833600000 , 3.0796455899995] , [ 1117512000000 , 3.3441247640644] , [ 1120104000000 , 4.0947643978168] , [ 1122782400000 , 4.4072631274052] , [ 1125460800000 , 4.4870979780825] , [ 1128052800000 , 4.8404549457934] , [ 1130734800000 , 4.8293016233697] , [ 1133326800000 , 5.2238093263952] , [ 1136005200000 , 3.382306337815] , [ 1138683600000 , 3.7056975170243] , [ 1141102800000 , 3.7561118692318] , [ 1143781200000 , 2.861913700854] , [ 1146369600000 , 2.9933744103381] , [ 1149048000000 , 2.7127537218463] , [ 1151640000000 , 3.1195497076283] , [ 1154318400000 , 3.4066964004508] , [ 1156996800000 , 3.3754571113569] , [ 1159588800000 , 2.2965579982924] , [ 1162270800000 , 2.4486818633018] , [ 1164862800000 , 2.4002308848517] , [ 1167541200000 , 1.9649579750349] , [ 1170219600000 , 1.9385263638056] , [ 1172638800000 , 1.9128975336387] , [ 1175313600000 , 2.3412869836298] , [ 1177905600000 , 2.4337870351445] , [ 1180584000000 , 2.62179703171] , [ 1183176000000 , 3.2642864957929] , [ 1185854400000 , 3.3200396223709] , [ 1188532800000 , 3.3934212707572] , [ 1191124800000 , 4.2822327088179] , [ 1193803200000 , 4.1474964228541] , [ 1196398800000 , 4.1477082879801] , [ 1199077200000 , 5.2947122916128] , [ 1201755600000 , 5.2919843508028] , [ 1204261200000 , 5.198978305031] , [ 1206936000000 , 3.5603057673513] , [ 1209528000000 , 3.3009087690692] , [ 1212206400000 , 3.1784852603792] , [ 1214798400000 , 4.5889503538868] , [ 1217476800000 , 4.401779617494] , [ 1220155200000 , 4.2208301828278] , [ 1222747200000 , 3.89396671475] , [ 1225425600000 , 3.0423832241354] , [ 1228021200000 , 3.135520611578] , [ 1230699600000 , 1.9631418164089] , [ 1233378000000 , 1.8963543874958] , [ 1235797200000 , 1.8266636017025] , [ 1238472000000 , 0.93136635895188] , [ 1241064000000 , 0.92737801918888] , [ 1243742400000 , 0.97591889805002] , [ 1246334400000 , 2.6841193805515] , [ 1249012800000 , 2.5664341140531] , [ 1251691200000 , 2.3887523699873] , [ 1254283200000 , 1.1737801663681] , [ 1256961600000 , 1.0953582317281] , [ 1259557200000 , 1.2495674976653] , [ 1262235600000 , 0.36607452464754] , [ 1264914000000 , 0.3548719047291] , [ 1267333200000 , 0.36769242398939] , [ 1270008000000 , 0] , [ 1272600000000 , 0] , [ 1275278400000 , 0] , [ 1277870400000 , 0] , [ 1280548800000 , 0] , [ 1283227200000 , 0] , [ 1285819200000 , 0.85450741275337] , [ 1288497600000 , 0.91360317921637] , [ 1291093200000 , 0.89647678692269] , [ 1293771600000 , 0.87800687192639] , [ 1296450000000 , 0] , [ 1298869200000 , 0] , [ 1301544000000 , 0.43668720882994] , [ 1304136000000 , 0.4756523602692] , [ 1306814400000 , 0.46947368328469] , [ 1309406400000 , 0.45138896152316] , [ 1312084800000 , 0.43828726648117] , [ 1314763200000 , 2.0820861395316] , [ 1317355200000 , 0.9364411075395] , [ 1320033600000 , 0.60583907839773] , [ 1322629200000 , 0.61096950747437] , [ 1325307600000 , 0] , [ 1327986000000 , 0] , [ 1330491600000 , 0] , [ 1333166400000 , 0] , [ 1335758400000 , 0]]
        }

      ]*/

      $scope.data.duration = getDataFromMetrics(agg_metrics.duration, metric2valUser);
      $scope.data.speed = getDataFromMetrics(agg_metrics.speed, metric2valUser);
      $scope.countOptions = angular.copy($scope.options)
      $scope.countOptions.chart.yAxis.axisLabel = $translate.instant('metrics.trips-yaxis-number');
      $scope.distanceOptions = angular.copy($scope.options);
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
          data[i].values = Math.round(temp / data[i].values.length  ) + ' ' + unit;
        } else if(metric === "distance"){
          // we convert to km here but omit the previously added string because we need the pure data. Instead, we add another field
          data[i].values = Math.round(temp );
        } else if(metric === "duration" && temp > 60){
          data[i].values = Math.round(temp / 60) + ' ' + "mins";
        } else {
          data[i].values = Math.round(temp);
        }
        data[i].unit = unit;

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
        $scope.selectCtrl.fromDateTimestamp = moment(val).utc();
        $scope.datepickerObjFrom.inputDate = $scope.selectCtrl.fromDateTimestamp.toDate();
      } else {
        $scope.datepickerObjFrom.inputDate = $scope.selectCtrl.fromDateTimestamp.toDate();
      }

    };
    $scope.setCurDayTo = function(val) {
      if (val) {
        $scope.selectCtrl.toDateTimestamp = moment(val).utc();
        $scope.datepickerObjTo.inputDate = $scope.selectCtrl.toDateTimestamp.toDate();
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
      dateFormat: 'dd/MM/yyyy',
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
      dateFormat: 'dd/MM/yyyy',
      closeOnSelect: false,
      // add this instruction if you want to exclude a particular weekday, e.g. Saturday  disableWeekdays: [6]
    };

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

  });



