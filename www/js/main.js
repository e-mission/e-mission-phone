'use strict';

angular.module('emission.main', ['emission.main.diary', 'emission.main.recent'])

.config(function($stateProvider, $ionicConfigProvider) {
  $stateProvider
  // setup an abstract state for the tabs directive
    .state('root.main', {
    url: '/main',
    abstract: true,
    templateUrl: 'templates/main.html',
    controller: 'MainCtrl'
  })

  .state('root.main.diary', {
    url: '/diary',
    views: {
      'main-diary': {
        templateUrl: 'templates/main-diary.html',
        controller: 'TripsCtrl'
      }
    }
  })

  .state('root.main.recent', {
      url: '/recent',
      abstract: true,
      views: {
        'main-recent': {
          templateUrl: 'templates/main-recent.html',
          controller: 'MainCtrl'
        }
      }
    })
  .state('root.main.control', {
    url: '/control',
    views: {
      'main-control': {
        templateUrl: 'templates/main-control.html',
        controller: 'ControlCtrl'
      }
    }
  });

  $ionicConfigProvider.tabs.style('standard')
  $ionicConfigProvider.tabs.position('bottom');
})

.controller('MainCtrl', function($scope, $state) {
    // Currently this is blank since it is basically a placeholder for the
    // three screens. But we can totally add hooks here if we want. It is the
    // controller for all the screens because none of them do anything for now.
})

.controller('ControlCtrl', function($scope, $state, $ionicPopup) {
    $scope.getConnectURL = function() {
        window.cordova.plugins.BEMConnectionSettings.getSettings(function(result) {
            $scope.$apply(function() {
                $scope.settings.connect.url = result.connectURL;
            });
        });
    };

    $scope.getConnectionSettings = function() {
        window.cordova.plugins.BEMDataCollection.getConfig(function(result) {
            $scope.$apply(function() {
                $scope.settings.collect = {};
                var retVal = [];
                for (var prop in result) {
                    retVal.push({'key': prop, 'val': result[prop]});
                }
                $scope.settings.collect= retVal;
            });
        });
    };

    $scope.settings = {};
    $scope.settings.connect = {};
    $scope.getConnectURL();
    $scope.getConnectionSettings();

    $scope.returnToIntro = function() {
        $state.go("root.intro");
    };

    $scope.forceTripStart = function() {
        window.cordova.plugins.BEMDataCollection.forceTripStart(function(result) {
            $scope.$apply(function() {
                $ionicPopup.alert({template: 'success -> '+result});
            });
        }, function(error) {
            $scope.$apply(function() {
                $ionicPopup.alert({template: 'error -> '+error});
            });
        });
    };

    $scope.forceTripEnd = function() {
        window.cordova.plugins.BEMDataCollection.forceTripEnd(function(result) {
            $scope.$apply(function() {
                $ionicPopup.alert({template: 'success -> '+result});
            });
        }, function(error) {
            $scope.$apply(function() {
                $ionicPopup.alert({template: 'error -> '+error});
            });
        });
    };

    $scope.forceRemotePush = function() {
        window.cordova.plugins.BEMDataCollection.forceRemotePush(function(result) {
            $scope.$apply(function() {
                $ionicPopup.alert({template: 'success -> '+result});
            });
        }, function(error) {
            $scope.$apply(function() {
                $ionicPopup.alert({template: 'error -> '+error});
            });
        });
    };

});
