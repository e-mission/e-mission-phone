'use strict';

angular.module('emission.main.control',['emission.services',
                                        'emission.splash.startprefs',
                                        'emission.splash.updatecheck',
                                        'emission.main.metrics.factory'])

.controller('ControlCtrl', function($scope, $window, $ionicScrollDelegate,
               $state, $ionicPopup, $ionicActionSheet, $ionicPopover,
               $rootScope, StartPrefs, ControlHelper, UpdateCheck, 
               CalorieCal) {
    $scope.emailLog = ControlHelper.emailLog;
    $scope.dark_theme = $rootScope.dark_theme;
    $scope.userData = []
    $scope.getUserData = function() {
        var userDataFromStorage = CalorieCal.get();
        $scope.userData = []
        var height = userDataFromStorage.height.toString();
        var weight = userDataFromStorage.weight.toString();
        var temp  =  {
            age: userDataFromStorage.age,
            height: height + (userDataFromStorage.heightUnit == 1? ' cm' : ' ft'),
            weight: weight + (userDataFromStorage.weightUnit == 1? ' kg' : ' lb'),
            gender: userDataFromStorage.gender == 1? 'Male' : 'Female'
        }
        for (var i in temp) {
            $scope.userData.push({key: i, value: temp[i]});
        }
    }

    $scope.userDataSaved = function() {
        return CalorieCal.get().userDataSaved == true;
    }
    if ($scope.userDataSaved()) {
        $scope.getUserData();
    }
    $scope.getLowAccuracy = function() {
        //  return true: toggle on; return false: toggle off.
        if ($scope.settings.collect.config == null) {
            return false; // config not loaded when loading ui, set default as false
        } else {
            var accuracy = $scope.settings.collect.config.accuracy;
            var v;
            for (var k in $scope.settings.collect.accuracyOptions) {
                if ($scope.settings.collect.accuracyOptions[k] == accuracy) {
                    v = k;
                    break;
                }
            }
            if ($scope.isIOS()) {
                return v != "kCLLocationAccuracyBestForNavigation" && v != "kCLLocationAccuracyBest" && v != "kCLLocationAccuracyTenMeters";
            } else if ($scope.isAndroid()) {
                return v != "PRIORITY_HIGH_ACCURACY";
            } else {
                $ionicPopup.alert("Emission does not supprt this platform");
            }

        }
    }
    $scope.toggleLowAccuracy = function() {
        $scope.settings.collect.new_config = JSON.parse(JSON.stringify($scope.settings.collect.config));
        if ($scope.getLowAccuracy()) {
            if ($scope.isIOS()) {
                $scope.settings.collect.new_config.accuracy = $scope.settings.collect.accuracyOptions["kCLLocationAccuracyBest"];
            } else if ($scope.isAndroid()) {
                $scope.settings.collect.new_config.accuracy = $scope.settings.collect.accuracyOptions["PRIORITY_HIGH_ACCURACY"];
            }
        } else {
            if ($scope.isIOS()) {
                $scope.settings.collect.new_config.accuracy = $scope.settings.collect.accuracyOptions["kCLLocationAccuracyHundredMeters"];
            } else if ($scope.isAndroid()) {
                $scope.settings.collect.new_config.accuracy = $scope.settings.collect.accuracyOptions["PRIORITY_BALANCED_POWER_ACCURACY"];
            }
        }
        ControlHelper.dataCollectionSetConfig($scope.settings.collect.new_config)
        .then(function(){
            console.log("setConfig Sucess");
        }, function(err){
            console.log("setConfig Error: " + err);
        });
    }
    $scope.ionViewBackgroundClass = function() {
        return ($scope.dark_theme)? "ion-view-background-dark" : "ion-view-background";
    }
    $scope.getDarkTheme = function() {
        return $scope.dark_theme;
    }
    $scope.toggleDarkTheme = function() {
        if ($scope.dark_theme) {
            $rootScope.dark_theme = false;
            $scope.dark_theme = false;
            StartPrefs.setDefaultTheme(null);
            $state.reload();
        } else {
            $rootScope.dark_theme = true;
            $scope.dark_theme = true;
            StartPrefs.setDefaultTheme('dark_theme');
            $state.reload();
        }
    }

    $scope.getConnectURL = function() {
        ControlHelper.getSettings().then(function(response) {
            $scope.$apply(function() {
                $scope.settings.connect.url = response.connectURL;
                console.log(response);
            });
        }, function(error) {
            console.log("While getting connect Url :" + error);
        });
    };

    $scope.getCollectionSettings = function() {
        var promiseList = []
        promiseList.push(ControlHelper.dataCollectionGetConfig());
        promiseList.push(ControlHelper.getAccuracyOptions());
        Promise.all(promiseList).then(function(resultList){
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
                })
            })
    };

    $scope.getSyncSettings = function() {
        ControlHelper.serverSyncGetConfig().then(function(response) {
            var config = response;
            $scope.settings.sync.config = config;
            var retVal = [];
            for (var prop in config) {
                retVal.push({'key': prop, 'val': config[prop]});
            }
            $scope.$apply(function() {
                $scope.settings.sync.show_config = retVal;
            });
        });
    };
    $scope.getEmail = function() {
        ControlHelper.getUserEmail().then(function(response) {
           console.log("user email = "+response);
            $scope.$apply(function() {
                if (response == null) {
                  $scope.settings.auth.email = "Not logged in";
                } else {
                  $scope.settings.auth.email = response;
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
        ControlHelper.getState().then(function(response) {
            $scope.$apply(function() {
                $scope.settings.collect.state = response;
            });
        }, function(error) {
            $ionicPopup.alert("while getting email, "+error);
        });
    };

    $scope.refreshScreen = function() {
        $scope.settings = {};
        $scope.settings.collect = {};
        $scope.settings.sync = {};
        $scope.settings.auth = {};
        $scope.settings.connect = {};
        $scope.settings.channel = function(newName) {
          return arguments.length ? (UpdateCheck.setChannel(newName)) : UpdateCheck.getChannel();
        };

        $scope.getConnectURL();
        $scope.getCollectionSettings();
        $scope.getSyncSettings();
        $scope.getEmail();
        $scope.getState();
    };

    $scope.returnToIntro = function() {
      var testReconsent = false
      if (testReconsent) {
        $rootScope.req_consent.approval_date = Math.random();
        StartPrefs.loadPreferredScreen();
      } else {
        $state.go("root.intro");
      }
    };

    $scope.forceTransition = function(transition) {
        ControlHelper.forceTransition(transition).then(function(result) {
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
        ControlHelper.forceSync().then(function(response) {
            $ionicPopup.alert({template: 'success -> '+response});
        }, function(error) {
            $ionicPopup.alert({template: 'error -> '+error});
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
    $scope.editCollectionConfig = function($event) {
        $scope.settings.collect.new_config = JSON.parse(JSON.stringify($scope.settings.collect.config));
        console.log("settings popup = "+$scope.collectSettingsPopup);
        $scope.collectSettingsPopup.show($event);
    }

    $scope.editSyncConfig = function($event) {
        $scope.settings.sync.new_config = JSON.parse(JSON.stringify($scope.settings.sync.config));
        console.log("settings popup = "+$scope.syncSettingsPopup);
        $scope.syncSettingsPopup.show($event);
    }

    $scope.saveAndReloadSettingsPopup = function(result) {
        console.log("new config = "+$scope.settings.collect.new_config);
        if (result == true) {
            ControlHelper.dataCollectionSetConfig($scope.settings.collect.new_config)
            .then(function(){
                $scope.getCollectionSettings()
            },function(err){
                console.log("setConfig Error: " + err);
            });
        }
    };

    $scope.saveAndReloadCollectionSettingsPopover = function() {
        console.log("new config = "+$scope.settings.collect.new_config);
        ControlHelper.dataCollectionSetConfig($scope.settings.collect.new_config)
        .then(function(){
            $scope.getCollectionSettings()
        }, function(err){
            console.log("setConfig Error: " + err);
        });
        $scope.collectSettingsPopup.hide();
    };

    $scope.saveAndReloadSyncSettingsPopover = function() {
        console.log("new config = "+$scope.settings.sync.new_config);
        ControlHelper.serverSyncSetConfig($scope.settings.sync.new_config)
        .then(function(){
            $scope.getSyncSettings()
        }, function(err){
            console.log("setConfig Error: " + err);
        });
        $scope.syncSettingsPopup.hide();
    };
    // Execute action on hide popover
    $scope.$on('$destroy', function() {
      $scope.collectSettingsPopup.remove();
      $scope.syncSettingsPopup.remove();
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
    $scope.setSyncInterval = function() {
        var syncIntervalActions = [];
        syncIntervalActions.push({text: "1 min", value: 60});
        syncIntervalActions.push({text: "10 min", value: 10 * 60});
        syncIntervalActions.push({text: "30 min", value: 30 * 60});
        syncIntervalActions.push({text: "1 hr", value: 60 * 60});
        $ionicActionSheet.show({
            buttons: syncIntervalActions,
            titleText: "Select sync interval",
            cancelText: "Cancel",
            buttonClicked: function(index, button) {
                $scope.settings.sync.new_config.sync_interval = button.value;
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
        $scope.collectSettingsPopup = popover;
    });
    $ionicPopover.fromTemplateUrl('templates/control/main-sync-settings.html', {
        scope: $scope
    }).then(function(popover) {
        $scope.syncSettingsPopup = popover;
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
    $scope.getExpandButtonClass = function() {
        return ($scope.expanded)? "icon ion-ios-arrow-up" : "icon ion-ios-arrow-down";
    }
    $scope.getUserDataExpandButtonClass = function() {
        return ($scope.dataExpanded)? "icon ion-ios-arrow-up" : "icon ion-ios-arrow-down";
    }
    $scope.eraseUserData = function() {
        CalorieCal.delete();
        $ionicPopup.alert({template: 'User data erased.'});

    }
    $scope.parseState = function(state) {
        if (state) {
            return state.substring(6);
        }
    }
    $scope.expandDeveloperZone = function() {
        if ($scope.collectionExpanded()) {
            $scope.expanded = false;
            $ionicScrollDelegate.resize();
            $ionicScrollDelegate.scrollTo(0, 0, true);

        } else {
            $scope.expanded = true;
            $ionicScrollDelegate.resize();
            $ionicScrollDelegate.scrollTo(0, 1000, true);
        }
    }
    $scope.toggleUserData = function() {
        if ($scope.dataExpanded) {
            $scope.dataExpanded = false;
        } else {
            $scope.dataExpanded = true;
        }
    }
    $scope.collectionExpanded = function() {
        return $scope.expanded;
    }
    $scope.userDataExpanded = function() {
        return $scope.dataExpanded && $scope.userDataSaved();
    }
    $scope.checkUpdates = function() {
      UpdateCheck.checkForUpdates();
    }
    $scope.checkConsent = function() {
        ControlHelper.getDocument().then(function(resultList){
            $ionicPopup.alert({template: resultList});
        }, function(error) {
            $ionicPopup.alert({template: error});
        });
    }
    var options = {
      message: 'Join me in making transportation greener and healthier \n Download the emission app:', // not supported on some apps (Facebook, Instagram)
      subject: 'Emission - UC Berkeley Research Project', // fi. for email
      //files: ['', ''], // an array of filenames either locally or remotely
      url: 'https://bic2cal.eecs.berkeley.edu/#download',
      //chooserTitle: 'Pick an app' // Android only, you can override the default share sheet title
    }

    $scope.share = function() {
        window.plugins.socialsharing.shareWithOptions(options, function(result) {
            console.log("Share completed? " + result.completed); // On Android apps mostly return false even while it's true
            console.log("Shared to app: " + result.app); // On Android result.app is currently empty. On iOS it's empty when sharing is cancelled (result.completed=false)
        }, function(msg) {
            console.log("Sharing failed with message: " + msg);
        });
    }
});
