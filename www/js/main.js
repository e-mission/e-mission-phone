'use strict';

angular.module('emission.main', ['emission.main.recent', 'emission.main.diary', 'emission.main.common', 'emission.main.heatmap', 'ngCordova', 'emission.services'])

.config(function($stateProvider, $ionicConfigProvider, $urlRouterProvider) {
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

  .state('root.main.control', {
    url: '/control',
    views: {
      'main-control': {
        templateUrl: 'templates/control/main-control.html',
        controller: 'ControlCtrl'
      }
    }
  })
   .state('root.main.log', {
    url: "/log", // /root/main/recent/log
    views: {
      'main-control': {
        templateUrl: "templates/recent/log.html",
        controller: 'logCtrl'
      }
    }
  })

  .state('root.main.sensedData', {
    url: "/sensedData",
    views: {
      'main-control': {
        templateUrl: "templates/recent/sensedData.html",
        controller: 'sensedDataCtrl'
      }
    }
  })
    .state('root.main.map', {
      url: "/map",
      views: {
        'main-control': {
          templateUrl: "templates/recent/map.html",
          controller: 'mapCtrl'
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

.controller('MainCtrl', function($scope, $state) {
    // Currently this is blank since it is basically a placeholder for the
    // three screens. But we can totally add hooks here if we want. It is the
    // controller for all the screens because none of them do anything for now.
})

.controller('ControlCtrl', function($scope, $window, $ionicScrollDelegate, $state, $ionicPopup, $ionicActionSheet, $ionicPopover) {
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

    $scope.showLog = function() {
        $state.go("root.main.log");
    }
    $scope.showSensed = function() {
        $state.go("root.main.sensedData");
    }
    $scope.showMap = function() {
        $state.go("root.main.map");
    }
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

    $scope.trackingOn = function() {
        return $scope.settings.collect.state != "STATE_TRACKING_STOPPED";
    }
    $scope.userStartStopTracking = function() {
        if ($scope.startStopBtnToggle){
            $scope.forceTransition('STOP_TRACKING');
            $scope.startStopBtnToggle = false;
        } else {
            $scope.forceTransition('START_TRACKING');
            $scope.startStopBtnToggle = true;
        }
    }
    $scope.startStopBtnToggle = $scope.trackingOn(); 
    $scope.getAvatarStyle = function() {
        return {
            'width': ($window.screen.width * 0.30).toString() + 'px', 
            'height': ($window.screen.width * 0.30).toString() + 'px',
            'border-radius': ($window.screen.width * 0.15).toString() + 'px',
            'margin-top': ($window.screen.width * 0.1).toString() + 'px',
            'margin-bottom': ($window.screen.width * 0.1).toString() + 'px',
            'border-style': 'solid',
            'border-width': '7px',
            'border-color': '#fff'
        }
    }
    $scope.getIconButtonStyle = function(color) {
        return {
            'text-align': 'center',
            'float': 'right',
            'height': '100%', 
            'background-color': '#' + color,
            'color': '#fff',
            'padding': '1.2em',
            'width': '5em',
            'font-size': '1.2em'
        }
    }
    $scope.getIconStyle = function() {
        return {
            'font-size': '20px'
        }
    }
    $scope.getExpandButtonClass = function() {
        return ($scope.expanded)? "icon ion-ios-arrow-up" : "icon ion-ios-arrow-down";
    }
    $scope.parseState = function(state) {
        if (state) {
            return state.substring(6);
        }
    }
    $scope.toggleCollection = function() {
        if ($scope.collectionExpanded()) {
            $scope.expanded = false;
            document.querySelector('#displayRow').setAttribute('style', 'display: none;');
            $ionicScrollDelegate.scrollTo(0, 0, true);
            
        } else {
            $scope.expanded = true;
            document.querySelector('#displayRow').setAttribute('style', 'display: block;');
            $ionicScrollDelegate.scrollTo(0, 1000, true);
            
            
        }
    }
    $scope.collectionExpanded = function() {
        return $scope.expanded;
    }
});
