'use strict';

angular.module('emission.main', ['emission.main.diary', 'emission.main.common', 'emission.main.recent', 'emission.main.heatmap'])

.config(function($stateProvider, $ionicConfigProvider) {
  $stateProvider
  // setup an abstract state for the tabs directive
    .state('root.main', {
    url: '/main',
    abstract: true,
    templateUrl: 'templates/main.html',
    controller: 'MainCtrl'
  })

  .state('root.main.common', {
    url: '/common',
    views: {
      'main-common': {
        templateUrl: 'templates/main-common.html',
        controller: 'CommonCtrl'
      }
    }
  })

  .state('root.main.heatmap', {
    url: '/heatmap',
    views: {
      'main-heatmap': {
        templateUrl: 'templates/main-heatmap.html',
        controller: 'HeatmapCtrl'
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
        templateUrl: 'templates/control/main-control.html',
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

.controller('ControlCtrl', function($scope, $state, $ionicPopup, $ionicActionSheet, $ionicPopover) {
    $scope.getConnectURL = function() {
        window.cordova.plugins.BEMConnectionSettings.getSettings(function(result) {
            $scope.$apply(function() {
                $scope.settings.connect.url = result.connectURL;
            });
        });
    };

    $scope.getCollectionSettings = function() {
        var promiseList = []
        promiseList.push(window.cordova.plugins.BEMDataCollection.getConfig());
        promiseList.push(window.cordova.plugins.BEMDataCollection.getAccuracyOptions());

        Promise.all(promiseList).then(function(resultList) {
            var config = resultList[0];
            var accuracyOptions = resultList[1];
            $scope.settings.collect.config = config;
            $scope.settings.collect.accuracyOptions = accuracyOptions;
            var retVal = [];
            for (var prop in config) {
                if (prop == "accuracy") {
                    for (var name in accuracyOptions) {
                        if (accuracyOptions[name] == config[prop]) {
                            retVal.push({'key': prop, 'val': name});
                        }
                    }
                } else {
                    retVal.push({'key': prop, 'val': config[prop]});
                }
            }
            $scope.$apply(function() {
                $scope.settings.collect.show_config = retVal;
            });
        });
    };

    $scope.getEmail = function() {
        /*
        return new Promise(function(resolve, reject) {
            window.cordova.plugins.BEMJWTAuth.getJWT(function(result) {
                resolve(result);
            }, function(error) {
                resolve(error);
            });
        });
        */
        window.cordova.plugins.BEMJWTAuth.getUserEmail(function(result) {
            console.log("user email = "+result);
            $scope.$apply(function() {
                if (result == null) {
                  $scope.settings.auth.email = "Not logged in";
                } else {
                  $scope.settings.auth.email = result;
                }
            });
        }, function(error) {
            $ionicPopup.alert("while getting email, "+error);
        });
    };

    $scope.getState = function() {
        /*
        return new Promise(function(resolve, reject) {
            window.cordova.plugins.BEMJWTAuth.getJWT(function(result) {
                resolve(result);
            }, function(error) {
                resolve(error);
            });
        });
        */
        window.cordova.plugins.BEMDataCollection.getState(function(result) {
            $scope.$apply(function() {
                $scope.settings.collect.state = result;
            });
        }, function(error) {
            $ionicPopup.alert("while getting email, "+error);
        });
    };

    $scope.refreshScreen = function() {
        $scope.settings = {};
        $scope.settings.collect = {};
        $scope.settings.auth = {};
        $scope.settings.connect = {};

        $scope.getConnectURL();
        $scope.getCollectionSettings();
        $scope.getEmail();
        $scope.getState();
    };

    $scope.returnToIntro = function() {
        $state.go("root.intro");
    };

    $scope.forceTransition = function(transition) {
        window.cordova.plugins.BEMDataCollection.forceTransition(transition).then(function(result) {
            $scope.$apply(function() {
                $ionicPopup.alert({template: 'success -> '+result});
            });
        }, function(error) {
            $scope.$apply(function() {
                $ionicPopup.alert({template: 'error -> '+error});
            });
        });
    };

    $scope.forceSync = function() {
        return new Promise(function(resolve, reject) {
            window.cordova.plugins.BEMServerSync.forceSync(function(result) {
                // the alert is thenable, so I can resolve with it, I think
                resolve($ionicPopup.alert({template: 'success -> '+result}));
            }, function(error) {
                // the alert is thenable, so I can resolve with it, I think
                resolve($ionicPopup.alert({template: 'error -> '+error}));
            });
        });
    };

    $scope.forceState = function() {
        var forceStateActions = [{text: "Initialize",
                                  transition: "INITIALIZE"},
                                 {text: 'Start trip', 
                                  transition: "EXITED_GEOFENCE"},
                                 {text: 'End trip',
                                  transition: "STOPPED_MOVING"},
                                 {text: 'Visit ended',
                                  transition: "VISIT_ENDED"},
                                 {text: 'Visit started',
                                  transition: "VISIT_STARTED"},
                                 {text: 'Remote push', 
                                  transition: "RECEIVED_SILENT_PUSH"}];
        $ionicActionSheet.show({
            buttons: forceStateActions,
            titleText: "Force state",
            cancelText: "Cancel",
            buttonClicked: function(index, button) {
                $scope.forceTransition(button.transition);
                return true;
            }
        });
    };

    $scope.editConfig = function($event) {
        $scope.settings.collect.new_config = JSON.parse(JSON.stringify($scope.settings.collect.config));
        console.log("settings popup = "+$scope.settingsPopup);
        $scope.settingsPopup.show($event);
        /*
        var editPopup = $ionicPopup.confirm({
            templateUrl: 'templates/control/main-collect-settings.html',
            scope: $scope
        });
        editPopup.then($scope.saveAndReloadSettingsPopup);
        });
        */
    }
    
    $scope.saveAndReloadSettingsPopup = function(result) {
        console.log("new config = "+$scope.settings.collect.new_config);
        if (result == true) {
            window.cordova.plugins.BEMDataCollection.setConfig($scope.settings.collect.new_config)
            .then($scope.getCollectionSettings);
        }
    };

    $scope.saveAndReloadSettingsPopover = function() {
        console.log("new config = "+$scope.settings.collect.new_config);
        window.cordova.plugins.BEMDataCollection.setConfig($scope.settings.collect.new_config)
            .then($scope.getCollectionSettings);
        $scope.settingsPopup.hide();
    };

    // Execute action on hide popover
    $scope.$on('$destroy', function() {
      $scope.settingsPopup.remove();
    });

    $scope.setAccuracy= function() {
        var accuracyActions = [];
        for (name in $scope.settings.collect.accuracyOptions) {
            accuracyActions.push({text: name, value: $scope.settings.collect.accuracyOptions[name]});
        }
        $ionicActionSheet.show({
            buttons: accuracyActions,
            titleText: "Select accuracy",
            cancelText: "Cancel",
            buttonClicked: function(index, button) {
                $scope.settings.collect.new_config.accuracy = button.value;
                return true;
            }
        });
    };


    $scope.isAndroid = function() {
        return ionic.Platform.isAndroid();
    }

    $scope.isIOS = function() {
        return ionic.Platform.isIOS();
    }

    $scope.refreshScreen();
    $ionicPopover.fromTemplateUrl('templates/control/main-collect-settings.html', {
        scope: $scope
    }).then(function(popover) {
        $scope.settingsPopup = popover;
    });
});
