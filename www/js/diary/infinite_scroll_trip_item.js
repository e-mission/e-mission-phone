
/**
 * A directive to display each trip within the diary view.
 */

angular.module('emission.main.diary.infscrolltripitem', [
                                                        'emission.main.diary.infscrolllist',
                                                        'emission.survey.multilabel.services',
                                                        'emission.main.diary.infscrolldetail',
                                                        'ui-leaflet', 'ng-walkthrough',
                                                        'nvd3', 'emission.plugin.kvstore',
                                                        'emission.services',
                                                        'emission.config.imperial',
                                                        'emission.plugin.logger',
                                                        'emission.stats.clientstats',
                                                        'emission.incident.posttrip.manual'
])

.directive("infiniteScrollTripItem", function(){
    return{
      restrict: 'E',
      scope: {
        trip: '=',
        mapLimiter: '='
      },
      controller: 'TripItemCtrl',
      templateUrl: 'templates/diary/trip_list_item.html'
    };
  })

  .controller("TripItemCtrl", function($scope, $injector, $ionicPlatform,
                                        $state, leafletMapEvents, 
                                        nzTour, Timeline, DiaryHelper, SurveyOptions,
                                        Config, $ionicScrollDelegate
                                        ){
    console.log("Trip Item Controller called");
    const DEFAULT_ITEM_HT = 274;
    $scope.surveyOpt = SurveyOptions.MULTILABEL;
    $scope.itemHt = DEFAULT_ITEM_HT;

    // Added function from infiniteDiaryListCtrl
    $scope.showDetail = function($event) {
      $state.go("root.main.inf_scroll-detail", {
          tripId: $scope.trip.id
      });
      console.log("Testing if showDetail has the trip defined: ", $scope.trip);
    }
    console.log("Trip in Trip Item Ctrl is ", $scope.trip);
    console.log("Trip's Date is ", $scope.trip? $scope.trip.display_date : "unknown");

    // Explain Draft Function for the button to explain what a draft is
    $scope.explainDraft = function($event) {
      $event.stopPropagation();
      $ionicPopup.alert({
        template: $translate.instant('list-explainDraft-alert')
      });
      // don't want to go to the detail screen
    }

    // In-Line Map, functionality pulled from Infinite Scroll Detail
    $scope.mapCtrl = {};
    angular.extend($scope.mapCtrl, {
      defaults : {
        zoomControl: false
      }
    });

    angular.extend($scope.mapCtrl.defaults, Config.getMapTiles())

    var mapEvents = leafletMapEvents.getAvailableMapEvents();
    for (var k in mapEvents) {
      var eventName = 'leafletDirectiveMap.infscroll-tripitem.' + mapEvents[k];
      $scope.$on(eventName, function(event, data){
          try {
              console.log("in mapEvents, event = "+JSON.stringify(event.name)+
                    " leafletEvent = "+JSON.stringify(data.leafletEvent.type)+
                    " leafletObject = "+JSON.stringify(data.leafletObject.getBounds()));
          } catch (e) {
              if (e instanceof TypeError) {
                  console.log("in mapEvents, event = "+JSON.stringify(event.name)+
                        " leafletEvent = "+JSON.stringify(data.leafletEvent.type)+
                        " leafletObject is undefined");
              } else {
                  console.log(e);
              }
          }
          $scope.eventDetected = event.name;
      });
    }

    $scope.refreshTiles = function() {
      $scope.$broadcast('invalidateSize');
    }
});
