'use strict';

angular.module('emission.main', ['emission.main.diary',
                                 'emission.main.control',
                                 'emission.main.metrics',
                                 'emission.config.dynamic',
                                 'emission.services',
                                 'emission.services.upload'])

.config(function($stateProvider, $ionicConfigProvider, $urlRouterProvider) {
  $stateProvider
  // setup an abstract state for the tabs directive
    .state('root.main', {
    url: '/main',
    abstract: true,
    templateUrl: 'templates/main.html',
    controller: 'MainCtrl'
  })

  .state('root.main.metrics', {
    url: '/metrics',
    views: {
      'main-metrics': {
        templateUrl: 'templates/main-metrics.html',
        controller: 'MetricsCtrl'
      }
    }
  })

  .state('root.main.control', {
    url: '/control',
    params: {
        launchAppStatusModal: false
    },
    views: {
      'main-control': {
        templateUrl: 'templates/control/main-control.html',
        controller: 'ControlCtrl'
      }
    }
  })

  .state('root.main.log', {
    url: '/log',
    views: {
      'main-control': {
        templateUrl: 'templates/recent/log.html',
        controller: 'logCtrl'
      }
    }
  });

  $ionicConfigProvider.tabs.style('standard')
  $ionicConfigProvider.tabs.position('bottom');
})

.controller('appCtrl', function($scope, $ionicModal, $timeout) {
    $scope.openNativeSettings = function() {
        window.Logger.log(window.Logger.LEVEL_DEBUG, "about to open native settings");
        window.cordova.plugins.BEMLaunchNative.launch("NativeSettings", function(result) {
            window.Logger.log(window.Logger.LEVEL_DEBUG,
                "Successfully opened screen NativeSettings, result is "+result);
        }, function(err) {
            window.Logger.log(window.Logger.LEVEL_ERROR,
                "Unable to open screen NativeSettings because of err "+err);
        });
    }
})

.controller('MainCtrl', function($scope, $state, $rootScope, $translate, $ionicPlatform, DynamicConfig) {
    // Currently this is blank since it is basically a placeholder for the
    // three screens. But we can totally add hooks here if we want. It is the
    // controller for all the screens because none of them do anything for now.

    moment.locale($translate.use());

    $scope.tabsCustomClass = function() {
        return "tabs-icon-top tabs-custom";
    }

    $ionicPlatform.ready().then(function() {
      DynamicConfig.configReady().then((newConfig) => {
        $scope.dCfg = newConfig;
        $scope.showMetrics = newConfig.survey_info['trip-labels'] == 'MULTILABEL';
        console.log("screen-select: showMetrics = "+$scope.showMetrics);;
        console.log("screen-select: in dynamic config load, tabs list is ", $('.tab-item'));
      });
    });

    $scope.$on('$ionicView.enter', function(ev) {
        console.log("screen-select: after view enter, tabs list is ", $('.tab-item'));
        const labelEl = $('.tab-item[icon="ion-checkmark-round"]')
        const diaryEl = $('.tab-item[icon="ion-map"]')
        const dashboardEl = $('.tab-item[icon="ion-ios-analytics"]')
        console.log("screen-select: label ",labelEl," diary ",diaryEl," dashboardEl" ,dashboardEl);
        // If either these don't exist, we will get an empty array.
        // preceding or succeeding with an empty array is a NOP
        labelEl.before(diaryEl);
        labelEl.after(dashboardEl);
    });
});
