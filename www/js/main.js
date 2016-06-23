'use strict';

angular.module('emission.main', ['emission.main.diary', 'emission.main.common', 'emission.main.heatmap', 'ngCordova', 'emission.services'])

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
  .state('root.main.sensed', {
    url: "/sensed",
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
.controller('sensedDataCtrl', function($scope, $cordovaEmailComposer, $ionicActionSheet) {
    var currentStart = 0;

    /* Let's keep a reference to the database for convenience */
    var db = window.cordova.plugins.BEMUserCache;

    $scope.config = {}
    $scope.config.key_data_mapping = {
        "Transitions": {
            fn: db.getMessages,
            key: "statemachine/transition"
        },
        "Locations": {
            fn: db.getSensorData,
            key: "background/location"
        },
        "Motion Type": {
            fn: db.getSensorData,
            key: "background/motion_activity"
        },
    }

    $scope.emailCache = function() {
        var parentDir = "unknown";

         $cordovaEmailComposer.isAvailable().then(function() {
           // is available
         }, function () {
            alert("Email account is not configured, cannot send email");
            return;
         });

        if (ionic.Platform.isAndroid()) {
            parentDir = "app://databases";
        } 
        if (ionic.Platform.isIOS()) {
            alert("You must have the mail app on your phone configured with an email address. Otherwise, this won't work");
            parentDir = cordova.file.dataDirectory+"../LocalDatabase";
        }
        
        /*
        window.Logger.log(window.Logger.LEVEL_INFO,
            "Going to export logs to "+parentDir);
         */
        alert("Going to email database from "+parentDir+"/userCacheDB");

        var email = {
            to: ['shankari@eecs.berkeley.edu'],
            attachments: [
                parentDir+"/userCacheDB"
            ],
            subject: 'emission logs',
            body: 'please fill in what went wrong'
        }

        $cordovaEmailComposer.open(email).then(function() {
           window.Logger.log(window.Logger.LEVEL_DEBUG,
               "Email queued successfully");
        },
        function () {
           // user cancelled email. in this case too, we want to remove the file
           // so that the file creation earlier does not fail.
           window.Logger.log(window.Logger.LEVEL_INFO,
               "Email cancel reported, seems to be an error on android");
        });
    }

    $scope.config.keys = []
    for (var key in $scope.config.key_data_mapping) {
        $scope.config.keys.push(key);
    }

    $scope.selected = {}
    $scope.selected.key = $scope.config.keys[0]

    $scope.changeSelection = function() {
        $ionicActionSheet.show({
            buttons: [
              { text: 'Locations' },
              { text: 'Motion Type' },
              { text: 'Transitions' },
            ],
            buttonClicked: function(index, button) {
              $scope.setSelected(button.text);
              return true;
            }
        });
    }

    $scope.setSelected = function(newVal) {
      $scope.selected.key = newVal;
      $scope.updateEntries();
    } 

  $scope.updateEntries = function() {
    if (angular.isUndefined($scope.selected.key)) {
        var usercacheFn = db.getMessages;
        var usercacheKey = "statemachine/transition";
    } else {
        var usercacheFn = $scope.config.key_data_mapping[$scope.selected.key]["fn"]
        var usercacheKey = $scope.config.key_data_mapping[$scope.selected.key]["key"]
    }
    usercacheFn(usercacheKey, function(entryList) {
      $scope.entries = [];
      $scope.$apply(function() {
          for (i = 0; i < entryList.length; i++) {
            // $scope.entries.push({metadata: {write_ts: 1, write_fmt_time: "1"}, data: "1"})
            var currEntry = entryList[i];
            currEntry.data = JSON.stringify(JSON.parse(currEntry.data), null, 2);
            // window.Logger.log(window.Logger.LEVEL_DEBUG,
            //     "currEntry.data = "+currEntry.data);
            $scope.entries.push(currEntry);
            // This should really be within a try/catch/finally block
            $scope.$broadcast('scroll.refreshComplete');
          }
      })
    }, function(error) {
        $ionicPopup.alert({template: JSON.stringify(error)})
            .then(function(res) {console.log("finished showing alert");});
    })
  }

  $scope.updateEntries();
})
   
.controller('mapCtrl', function($scope, Config) {
    /* Let's keep a reference to the database for convenience */
    var db = window.cordova.plugins.BEMUserCache;
    $scope.mapCtrl = {};
    $scope.mapCtrl.selKey = "background/location";

    angular.extend($scope.mapCtrl, {
        defaults : Config.getMapTiles()
    });

    $scope.refreshMap = function() {
        db.getSensorData($scope.mapCtrl.selKey, function(entryList) {
            var coordinates = entryList.map(function(locWrapper, index, locList) {
                var parsedData = JSON.parse(locWrapper.data);
                return [parsedData.longitude, parsedData.latitude];
            });
            $scope.$apply(function() {
                $scope.mapCtrl.geojson = {};
                $scope.mapCtrl.geojson.data = {
                  "type": "LineString",
                  "coordinates": coordinates
                }
            });
        });
    };

    $scope.refreshMap();
})
.controller('logCtrl', function($scope, $cordovaFile, $cordovaEmailComposer, $ionicPopup) {
    console.log("Launching logCtrl");
    var RETRIEVE_COUNT = 100;
    $scope.logCtrl = {};

    $scope.refreshEntries = function() {
        window.Logger.getMaxIndex(function(maxIndex) {
            console.log("maxIndex = "+maxIndex);
            $scope.logCtrl.currentStart = maxIndex;
            $scope.logCtrl.gotMaxIndex = true;
            $scope.logCtrl.reachedEnd = false;
            $scope.entries = [];
            $scope.addEntries();
        }, function (e) {
            var errStr = "While getting max index "+JSON.stringify(e, null, 2);
            console.log(errStr);
            alert(errStr);
        });
    }

    $scope.moreDataCanBeLoaded = function() {
        return $scope.logCtrl.gotMaxIndex && !($scope.logCtrl.reachedEnd);
    }

    $scope.clear = function() {
        window.Logger.clearAll();
        window.Logger.log(window.Logger.LEVEL_INFO, "Finished clearing entries from unified log");
        $scope.refreshEntries();
    }

    $scope.addEntries = function() {
        console.log("calling addEntries");
        window.Logger.getMessagesFromIndex($scope.logCtrl.currentStart, RETRIEVE_COUNT,
            function(entryList) {
                $scope.$apply($scope.processEntries(entryList));
                console.log("entry list size = "+$scope.entries.length);
                console.log("Broadcasting infinite scroll complete");
                $scope.$broadcast('scroll.infiniteScrollComplete')
            }, function(e) {
                var errStr = "While getting messages from the log "+JSON.stringify(e, null, 2);
                console.log(errStr);
                alert(errStr);
                $scope.$broadcast('scroll.infiniteScrollComplete')
            }
        )
    }

    $scope.processEntries = function(entryList) {
        for (i = 0; i < entryList.length; i++) {
            var currEntry = entryList[i];
            $scope.entries.push(currEntry);
        }
        if (entryList.length == 0) {
            console.log("Reached the end of the scrolling");
            $scope.logCtrl.reachedEnd = true;
        } else {
            $scope.logCtrl.currentStart = entryList[entryList.length-1].ID
            console.log("new start index = "+$scope.logCtrl.currentStart);
        }
    }

    $scope.emailLog = function() {
        var parentDir = "unknown";

         $cordovaEmailComposer.isAvailable().then(function() {
           // is available
         }, function () {
            alert("Email account is not configured, cannot send email");
            return;
         });

        if (ionic.Platform.isAndroid()) {
            parentDir = "app://databases";
        } 
        if (ionic.Platform.isIOS()) {
            alert("You must have the mail app on your phone configured with an email address. Otherwise, this won't work");
            parentDir = cordova.file.dataDirectory+"../LocalDatabase";
        }
        
        /*
        window.Logger.log(window.Logger.LEVEL_INFO,
            "Going to export logs to "+parentDir);
         */
        alert("Going to email database from "+parentDir+"/loggerDB");

        var email = {
            to: ['shankari@eecs.berkeley.edu'],
            attachments: [
                parentDir+"/loggerDB"
            ],
            subject: 'emission logs',
            body: 'please fill in what went wrong'
        }

        $cordovaEmailComposer.open(email).then(function() {
           window.Logger.log(window.Logger.LEVEL_DEBUG,
               "Email queued successfully");
        },
        function () {
           // user cancelled email. in this case too, we want to remove the file
           // so that the file creation earlier does not fail.
           window.Logger.log(window.Logger.LEVEL_INFO,
               "Email cancel reported, seems to be an error on android");
        });
    }

    $scope.refreshEntries();
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
        $state.go("root.main.sensed");
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
    $scope.getButtonStyle = function(color) {
        return {
            'text-align': 'center',
            'float': 'right',
            'height': '100%', 
            'background-color': '#' + color,
            'color': '#fff',
            'padding': '15px 15px',
            'width': + ($window.screen.width * 0.25).toString() + 'px'
        }
    }
    $scope.getIconButtonStyle = function(color) {
        return {
            'text-align': 'center',
            'float': 'right',
            'height': '100%', 
            'background-color': '#' + color,
            'color': '#fff',
            'padding': '15px 15px',
            'width': '50px'
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
