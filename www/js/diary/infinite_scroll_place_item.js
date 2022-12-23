
/**
 * A directive to display each place within the diary view.
 */

angular.module('emission.main.diary.infscrollplaceitem',
    ['emission.main.diary.infscrolllist',
        'emission.survey.multilabel.services',
        'emission.main.diary.infscrolldetail',
        'ng-walkthrough',
        'nvd3',
        'emission.plugin.kvstore',
        'emission.services',
        'emission.config.imperial',
        'emission.config.dynamic',
        'emission.plugin.logger',
        'emission.stats.clientstats',
        'emission.survey.enketo.add-note-button',])

.directive("infiniteScrollPlaceItem", function(){
    return{
      restrict: 'E',
      scope: {
        trip: '='
      },
      // controller: 'PlaceItemCtrl',
      templateUrl: 'templates/diary/place_list_item.html'
    };
  })

// controller is not needed for now

//   .controller("PlaceItemCtrl", function($scope, $state, DynamicConfig) {
//     console.log("Place Item Controller called");

//     $scope.init = () => {
//       console.log("During initialization of the button control", $scope.trip);
//       DynamicConfig.configReady().then((newConfig) => {
//         Logger.log("Resolved UI_CONFIG_READY promise in intro.js, filling in templates");
//         $scope.ui_config = newConfig;
//       })
//     }

//     $scope.init();

// });
