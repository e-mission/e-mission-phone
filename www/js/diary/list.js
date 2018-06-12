'use strict';

angular.module('emission.main.diary.list',['ui-leaflet',
                                      'ionic-datepicker',
                                      'emission.main.common.services',
                                      'emission.incident.posttrip.manual',
                                      'emission.services',
                                      'ng-walkthrough', 'nzTour', 'angularLocalStorage',
                                      'emission.plugin.logger'])

.controller("DiaryListCtrl", function($window, $scope, $rootScope, $ionicPlatform, $state,
                                    $ionicScrollDelegate, $ionicPopup,
                                    $ionicLoading,
                                    $ionicActionSheet,
                                    ionicDatePicker,
                                    leafletData, Timeline, CommonGraph, DiaryHelper,
                                    Config, PostTripManualMarker, nzTour, storage, Logger, $ionicPopover) {
  console.log("controller DiaryListCtrl called");
  var MODE_CONFIRM_KEY = "manual/mode_confirm";
  var PURPOSE_CONFIRM_KEY = "manual/purpose_confirm";
  // Add option
  // StatusBar.styleBlackOpaque()
  $scope.dark_theme = $rootScope.dark_theme;

  $scope.$on('leafletDirectiveMap.resize', function(event, data) {
      console.log("diary/list received resize event, invalidating map size");
      data.leafletObject.invalidateSize();
  });

  var readAndUpdateForDay = function(day) {
    // This just launches the update. The update can complete in the background
    // based on the time when the database finishes reading.
    // TODO: Convert the usercache calls into promises so that we don't have to
    // do this juggling
    Timeline.updateForDay(day);
    // CommonGraph.updateCurrent();
  };

  $scope.$on('$ionicView.afterEnter', function() {
    if($rootScope.barDetail){
      readAndUpdateForDay($rootScope.barDetailDate);
      $rootScope.barDetail = false;
    };
    if($rootScope.displayingIncident == true) {
      if (angular.isDefined(Timeline.data.currDay)) {
          // page was already loaded, reload it automatically
          readAndUpdateForDay(Timeline.data.currDay);
      } else {
         Logger.log("currDay is not defined, load not complete");
      }
      $rootScope.displayingIncident = false;
    }
  });

  readAndUpdateForDay(moment().startOf('day'));

  angular.extend($scope, {
      defaults: {
          zoomControl: false,
          dragging: false,
          zoomAnimation: true,
          touchZoom: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          boxZoom: false,
      }
  });

  angular.extend($scope.defaults, Config.getMapTiles())

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
    $scope.listExpandClass = function () {
      return ($scope.dark_theme)? "earlier-later-expand-dark" : "earlier-later-expand";
    }
    $scope.listLocationClass = function() {
      return ($scope.dark_theme)? "item item-icon-left list-location-dark" : "item item-icon-left list-location";
    }
    $scope.listTextClass = function() {
      return ($scope.dark_theme)? "list-text-dark" : "list-text";
    }
    $scope.ionViewBackgroundClass = function() {
      return ($scope.dark_theme)? "ion-view-background-dark" : "ion-view-background";
    }
    $scope.datePickerClass = function() {
    }
    $scope.listCardClass = function(tripgj) {
      var background = DiaryHelper.getTripBackground($scope.dark_theme, tripgj);
      if ($window.screen.width <= 320) {
        return "list card list-card "+ background +" list-card-sm";
      } else if ($window.screen.width <= 375) {
        return "list card list-card "+ background +" list-card-md";
      } else {
        return "list card list-card "+background+" list-card-lg";
      }

    }
    $scope.listColLeftClass = function(margin) {
      if (margin == 0) {
        return ($scope.dark_theme)? "col-50 list-col-left-dark" : "col-50 list-col-left";
      } else {
        return ($scope.dark_theme)? "col-50 list-col-left-margin-dark" : "col-50 list-col-left-margin";
      }
    }
    $scope.listColRightClass = function() {
      return ($scope.dark_theme)? "col-50 list-col-right-dark" : "col-50 list-col-right";
    }
    $scope.differentCommon = function(tripgj) {
        return ($scope.isCommon(tripgj.id))? ((DiaryHelper.getEarlierOrLater(tripgj.data.properties.start_ts, tripgj.data.id) == '')? false : true) : false;
    }
    $scope.stopTimeTagClass = function(tripgj) {
      return ($scope.differentCommon(tripgj))? "stop-time-tag-lower" : "stop-time-tag";
    }
    $scope.setCurrDay = function(val) {
        if (typeof(val) === 'undefined') {
          window.Logger.log(window.Logger.LEVEL_INFO, 'No date selected');
        } else {
          window.Logger.log(window.Logger.LEVEL_INFO, 'Selected date is :' + val);
          readAndUpdateForDay(moment(val));
        }
    }
    $scope.localTimeString = function(dt) {
      var hr = ((dt.hour > 12))? dt.hour - 12 : dt.hour;
      var post = ((dt.hour >= 12))? " pm" : " am";
      var min = (dt.minute.toString().length == 1)? "0" + dt.minute.toString() : dt.minute.toString();
      return hr + ":" + min + post;
    }

    $scope.datepickerObject = {

      todayLabel: 'Hoy',  //Optional
      closeLabel: 'Cerrar',  //Optional
      setLabel: 'Set',  //Optional
      setButtonType : 'button-positive',  //Optional
      todayButtonType : 'button-stable',  //Optional
      closeButtonType : 'button-stable',  //Optional
      inputDate: new Date(),  //Optional
      from: new Date(2015, 1, 1),
      to: new Date(),
      mondayFirst: true,  //Optional
      templateType: 'popup', //Optional
      showTodayButton: 'true', //Optional
      modalHeaderColor: 'bar-positive', //Optional
      modalFooterColor: 'bar-positive', //Optional
      callback: $scope.setCurrDay, //Mandatory
      dateFormat: 'dd/MM/yyyy', //Optional
      closeOnSelect: true, //Optional
      monthsList: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'], //Optional
      weeksList: ['D','L','M','M','J','V','S'], //Optional
    };

    $scope.pickDay = function() {
      ionicDatePicker.openDatePicker($scope.datepickerObject);
    }

    $scope.$on(Timeline.UPDATE_DONE, function(event, args) {
      console.log("Got timeline update done event with args "+JSON.stringify(args));
      $scope.$apply(function() {
          $scope.data = Timeline.data;
          $scope.datepickerObject.inputDate = Timeline.data.currDay.toDate();
          $scope.data.currDayTrips.forEach(function(trip, index, array) {
              PostTripManualMarker.addUnpushedIncidents(trip);
          });
          $scope.data.currDayTripWrappers = Timeline.data.currDayTrips.map(
            DiaryHelper.directiveForTrip);
          $ionicScrollDelegate.scrollTop(true);
      });
    });

    $scope.$on(CommonGraph.UPDATE_DONE, function(event, args) {
      console.log("Got common graph update done event with args "+JSON.stringify(args));
      $scope.$apply(function() {
          // If we don't have the trip wrappers yet, then we can just bail because
          // the counts will be filled in when that is done. If the currDayTripWrappers
          // is already defined, that may have won the race, and not been able to update
          // the counts, so let us do it here.
          if (!angular.isUndefined($scope.data) && !angular.isUndefined($scope.data.currDayTripWrappers)) {
             $scope.data.currDayTripWrappers.forEach(function(tripWrapper, index, array) {
                DiaryHelper.fillCommonTripCount(tripWrapper);
             });
          };
      });
    });

    $scope.setColor = function(mode) {
      var colors = {"icon ion-android-bicycle":'green',
    "icon ion-android-walk":'brown',
    "icon ion-speedometer":'purple',
    "icon ion-android-bus": "purple",
    "icon ion-android-train": "navy",
    "icon ion-android-car": "salmon",
    "icon ion-plane": "red"};
      return { color: colors[mode] };
    }

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
      if ($ionicScrollDelegate.getScrollPosition().top < 5) {
       readAndUpdateForDay(Timeline.data.currDay);
       $scope.$broadcast('invalidateSize');
      }
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
    $scope.getEarlierOrLater = DiaryHelper.getEarlierOrLater;
    $scope.getLongerOrShorter = DiaryHelper.getLongerOrShorter;
    $scope.getHumanReadable = DiaryHelper.getHumanReadable;
    $scope.allModes = DiaryHelper.allModes;
    $scope.getKmph = DiaryHelper.getKmph;
    $scope.getPercentages = DiaryHelper.getPercentages;
    $scope.getFormattedDistance = DiaryHelper.getFormattedDistance;
    $scope.getSectionDetails = DiaryHelper.getSectionDetails;
    $scope.getFormattedTime = DiaryHelper.getFormattedTime;
    $scope.getFormattedTimeRange = DiaryHelper.getFormattedTimeRange;
    $scope.getFormattedDuration = DiaryHelper.getFormattedDuration;
    $scope.getTripDetails = DiaryHelper.getTripDetails;
    $scope.starColor = DiaryHelper.starColor;
    $scope.arrowColor = DiaryHelper.arrowColor;
    $scope.getArrowClass = DiaryHelper.getArrowClass;
    $scope.isCommon = DiaryHelper.isCommon;
    $scope.isDraft = DiaryHelper.isDraft;
    // $scope.expandEarlierOrLater = DiaryHelper.expandEarlierOrLater;
    // $scope.increaseRestElementsTranslate3d = DiaryHelper.increaseRestElementsTranslate3d;

    $scope.makeCurrent = function() {
        $ionicPopup.alert({template: "Coming soon, after Shankari's quals in early March!"});
    }

    $scope.userModes = [
        "walk", "bicycle", "car", "bus", "train", "unicorn"
    ];
    $scope.parseEarlierOrLater = DiaryHelper.parseEarlierOrLater;

    $scope.getTimeSplit = function(tripList) {
        var retVal = {};
        var tripTimes = tripList.map(function(dt) {
            return dt.data.properties.duration;
        });

    };

    // Tour steps
    var tour = {
      config: {
        mask: {
          visibleOnNoTarget: true,
          clickExit: true
        },
        previousText: 'Anterior',
        nextText: 'Siguiente',
        finishText: 'Fin',
      },
      steps: [{
        target: '#date-picker-button',
        content: 'Selecciona la fecha que quieres ver.'
      },
      {
        target: '.diary-entry',
        content: 'Selecciona cada viaje para ver más detalles del mismo.'
      },
      {
        target: '#map-fix-button',
        content: 'Utiliza este botón si los mapas no se cargan de manera adecuada.'
      }]
    };

    var startWalkthrough = function () {
      nzTour.start(tour).then(function(result) {
        Logger.log("list walkthrough start completed, no error");
      }).catch(function(err) {
        Logger.log("list walkthrough start errored" + err);
      });
    };

    $scope.refreshTiles = function() {
      $scope.$broadcast('invalidateSize');
    };

    /*
    * Checks if it is the first time the user has loaded the diary tab. If it is then
    * show a walkthrough and store the info that the user has seen the tutorial.
    */
    var checkDiaryTutorialDone = function () {
      var DIARY_DONE_KEY = 'diary_tutorial_done';
      var diaryTutorialDone = storage.get(DIARY_DONE_KEY);
      if (!diaryTutorialDone) {
        startWalkthrough();
        storage.set(DIARY_DONE_KEY, true);
      }
    };

    $scope.startWalkthrough = function () {
      startWalkthrough();
    }

    $scope.$on('$ionicView.enter', function(ev) {
      // Workaround from                                  
      // https://github.com/driftyco/ionic/issues/3433#issuecomment-195775629
      if(ev.targetScope !== $scope)
        return;
      checkDiaryTutorialDone();
    });

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

    $scope.toDetail = function(param) {
      $state.go('root.main.diary-detail', {tripId: param});
    };

    $scope.redirect = function(){
      $state.go("root.main.current");
    };

    var in_trip;
    $scope.checkTripState = function() {
      window.cordova.plugins.BEMDataCollection.getState().then(function(result) {
        Logger.log("Current trip state" + JSON.stringify(result));
        if(JSON.stringify(result) ==  "\"STATE_ONGOING_TRIP\"" || 
          JSON.stringify(result) ==  "\"local.state.ongoing_trip\"") {
          in_trip = true;
        } else {
          in_trip = false;
        }
      });
    };

    // storing boolean to in_trip and return it in inTrip function
    // work because ng-show is watching the inTrip function.
    // Returning a promise to ng-show did not work.
    // Changing in_trip = bool value; in checkTripState function 
    // to return bool value and using checkTripState function in ng-show
    // did not work.
    $scope.inTrip = function() {
      $scope.checkTripState();
      return in_trip;
    };

    $scope.showModes = DiaryHelper.showModes;

    $ionicPopover.fromTemplateUrl('templates/diary/mode-popover.html', {
           scope: $scope
        }).then(function(popover) {
           $scope.modePopover = popover;
        });

        $scope.openModePopover = function($event, start_ts, end_ts) {
            $scope.draftMode = {"start_ts": start_ts, "end_ts": end_ts}
            Logger.log("in openModePopover, setting draftMode = "+JSON.stringify($scope.draftMode));
           $scope.modePopover.show($event);
        };

        var closeModePopover = function($event) {
          $scope.draftMode = angular.undefined;
          Logger.log("in closeModePopover, setting draftMode = "+JSON.stringify($scope.draftMode));
           $scope.modePopover.hide($event);
        };

        $ionicPopover.fromTemplateUrl('templates/diary/purpose-popover.html', {
           scope: $scope
        }).then(function(popover) {
           $scope.purposePopover = popover;
        });

        $scope.openPurposePopover = function($event, start_ts, end_ts) {
           $scope.draftPurpose = {"start_ts": start_ts, "end_ts": end_ts}
           Logger.log("in openPurposePopover, setting draftPurpose = "+JSON.stringify($scope.draftPurpose));
           $scope.purposePopover.show($event);
        };

       var closePurposePopover = function($event) {
           $scope.draftPurpose = angular.undefined;
           Logger.log("in closePurposePopover, setting draftPurpose = "+JSON.stringify($scope.draftPurpose));
           $scope.purposePopover.hide($event);
        };

         $scope.chosen = {mode:'',purpose:'',other:''};

        var checkOtherOption = function(choice) {
         if(choice == 'other_mode' || choice == 'other_purpose') {
           var text = choice == 'other_mode' ? "list of modes" : "purpose";
           $ionicPopup.show({title: "Please fill in the " + text + " not listed.",
             scope: $scope,
             template: '<input type = "text" ng-model = "chosen.other">',
             buttons: [
                 { text: 'Cancel' }, {
                    text: '<b>Save</b>',
                    type: 'button-positive',
                       onTap: function(e) {
                          if (!$scope.chosen.other) {
                                e.preventDefault();
                          } else {
                             if(choice == 'other_mode') {
                               $scope.storeMode($scope.chosen.other);
                               $scope.chosen.other = '';
                             } else {
                               $scope.storePurpose($scope.chosen.other);
                               $scope.chosen.other = '';
                             }
                             return $scope.chosen.other;
                          }
                       }
                 }
             ]
           });

         }
        };

       $scope.choosePurpose = function() {
         if($scope.chosen.purpose != "other_purpose"){
           $scope.storePurpose($scope.chosen.purpose);
         } else {
           checkOtherOption($scope.chosen.purpose);
         }
         closePurposePopover();
       };

       $scope.chooseMode = function (){
         console.log("choose mode: " + $scope.chosen.mode);
         if($scope.chosen.mode != "other_mode"){
           $scope.storeMode($scope.chosen.mode);
         }else {
           checkOtherOption($scope.chosen.mode);
         }
         closeModePopover();
        }

        $scope.modeOptions = [
        {text:'Caminando', value:'walk'},
        {text:'Bicicleta',value:'bike'},
        {text:'Auto - como conductor',value:'car_driver'},
        {text:'Auto - como acompañante',value:'car_companion'},
        {text:'Moto - como conductor',value:'moto_driver'},
        {text:'Moto - como acompañante',value:'moto_companion'},
        {text:'Ómnibus',value:'bus'},
        {text:'Taxi',value:'taxi'},
        {text:'Muv', value: 'muv'},
        {text:'Tren',value:'train'},
        {text:'Transporte laboral',value:'employees_customers_transport'},
        {text:'Otro',value:'other_mode'}];

        $scope.purposeOptions = [
        {text:'Casa', value:'home'},
        {text:'Trabajo',value:'work'},
        {text:'Colegio/Universidad',value:'school'},
        {text:'Trámites',value:'procedures'},
        {text:'Recreación, deporte',value:'exercise'},
        {text:'Encuentro social',value:'entertainment'},
        {text:'Atención de salud',value:'personal_med'},
        {text:'Compras y mercado',value:'shopping'},
        {text:'Buscar/Llevar a alguien',value:'pick_drop'},
        {text:'Religioso', value:'religious'},
        {text:'Otro',value:'other_purpose'}];

        $scope.storeMode = function(mode_val) {
          $scope.draftMode.label = mode_val;
          Logger.log("in storeMode, after setting mode_val = "+mode_val+", draftMode = "+JSON.stringify($scope.draftMode));
          $window.cordova.plugins.BEMUserCache.putMessage(MODE_CONFIRM_KEY, $scope.draftMode);
        }

        $scope.storePurpose = function(purpose_val) {
          $scope.draftPurpose.label = purpose_val;
          Logger.log("in storePurpose, after setting purpose_val = "+purpose_val+", draftPurpose = "+JSON.stringify($scope.draftPurpose));
          $window.cordova.plugins.BEMUserCache.putMessage(PURPOSE_CONFIRM_KEY, $scope.draftPurpose);
        }

});
