'use strict';

angular.module('emission.main.control',['emission.services',
                                        'ionic-datepicker',
                                        'ionic-datepicker.provider',
                                        'emission.splash.startprefs',
                                        'emission.splash.updatecheck',
                                        'emission.main.metrics.factory',
                                        'emission.stats.clientstats',
                                        'angularLocalStorage'])

.controller('ControlCtrl', function($scope, $window, $ionicScrollDelegate,
               $state, $ionicPopup, $ionicActionSheet, $ionicPopover,
               $rootScope, storage, ionicDatePicker,
               StartPrefs, ControlHelper, UpdateCheck,
               CalorieCal, ClientStats, CommHelper) {

    var datepickerObject = {
      todayLabel: 'Today',  //Optional
      closeLabel: 'Close',  //Optional
      setLabel: 'Set',  //Optional
      titleLabel: 'Choose date to download data',
      setButtonType : 'button-positive',  //Optional
      todayButtonType : 'button-stable',  //Optional
      closeButtonType : 'button-stable',  //Optional
      inputDate: moment().subtract(1, 'week').toDate(),  //Optional
      from: new Date(2015, 1, 1),
      to: new Date(),
      mondayFirst: true,  //Optional
      templateType: 'popup', //Optional
      showTodayButton: 'true', //Optional
      modalHeaderColor: 'bar-positive', //Optional
      modalFooterColor: 'bar-positive', //Optional
      callback: ControlHelper.getMyData, //Mandatory
      dateFormat: 'dd MMM yyyy', //Optional
      closeOnSelect: true //Optional
    }

    $scope.openDatePicker = function(){
      ionicDatePicker.openDatePicker(datepickerObject);
    };

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
        var isMediumAccuracy = ControlCollectionHelper.isMediumAccuracy();
        if (!angular.isDefined(isMediumAccuracy) {
            // config not loaded when loading ui, set default as false
            // TODO: Read the value if it is not defined.
            // Otherwise, don't we have a race with reading?
            // we don't really $apply on this field... 
            return false;
        } else {
            return isMediumAccuracy;
        }
    }
    $scope.toggleLowAccuracy = ControlCollectionHelper.toggleLowAccuracy;
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

    $scope.getCollectionSettings = ControlCollectionHelper.getCollectionSettings().then(function(showConfig) {
        $scope.$apply(function() {
            $scope.settings.collect.show_config = retVal;
        })
    });

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

    var clearUsercache = function() {
        $ionicPopup.alert({template: "WATCH OUT! If there is unsynced data, you may lose it. If you want to keep the data, use 'Force Sync' before doing this"})
        .then(function(result) {
            if (result) {
                window.cordova.plugins.BEMUserCache.clearAll()
                .then(function(result) {
                    $scope.$apply(function() {
                        $ionicPopup.alert({template: 'success -> '+result});
                    });
                }, function(error) {
                    $scope.$apply(function() {
                        $ionicPopup.alert({template: 'error -> '+error});
                    });
               });
            }
        });
    }

    var clearBoth = function() {
        storage.clearAll();
        clearUsercache();
    }

    $scope.nukeUserCache = function() {
        var nukeChoiceActions = [{text: "UI state only",
                                  action: storage.clearAll},
                                 {text: 'Native cache only',
                                  action: clearUsercache},
                                 {text: 'Everything',
                                  action: clearBoth}];

        $ionicActionSheet.show({
            titleText: "Clear data",
            cancelText: "Cancel",
            buttons: nukeChoiceActions,
            buttonClicked: function(index, button) {
                button.action();
                return true;
            }
        });
    }

    $scope.invalidateCache = function() {
        window.cordova.plugins.BEMUserCache.invalidateAllCache().then(function(result) {
            $scope.$apply(function() {
                $ionicPopup.alert({template: 'success -> '+result});
            });
        }, function(error) {
            $scope.$apply(function() {
                $ionicPopup.alert({template: 'error -> '+error});
            });
        });
    }

    $scope.$on('$ionicView.afterEnter', function() {
        $scope.refreshScreen();
    })

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
        ClientStats.addEvent(ClientStats.getStatKeys().BUTTON_FORCE_SYNC).then(
            function() {
                console.log("Added "+ClientStats.getStatKeys().BUTTON_FORCE_SYNC+" event");
            });
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
    $scope.editCollectionConfig = ControlCollectionHelper.editConfig;
    $scope.setAccuracy = ControlCollectionHelper.setAccuracy;
    $scope.editSyncConfig = function($event) {
        $scope.settings.sync.new_config = JSON.parse(JSON.stringify($scope.settings.sync.config));
        console.log("settings popup = "+$scope.syncSettingsPopup);
        $scope.syncSettingsPopup.show($event);
    }

    $scope.saveAndReloadSyncSettingsPopover = function() {
        console.log("new config = "+$scope.settings.sync.new_config);
        ControlHelper.serverSyncSetConfig($scope.settings.sync.new_config)
        .then(function(){
            CommHelper.updateUser({
                // TODO: worth thinking about where best to set this
                // Currently happens in native code. Now that we are switching
                // away from parse, we can store this from javascript here. 
                // or continue to store from native
                // this is easier for people to see, but means that calls to
                // native, even through the javascript interface are not complete
                curr_sync_interval: $scope.settings.sync.new_config.sync_interval
            });
            $scope.getSyncSettings();
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
    ControlCollectionHelper.init();
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

    var handleNoConsent = function(resultDoc) {
        $ionicPopup.confirm({template: "Consent for data collection not found, consent now?"})
        .then(function(res){
            if (res) {
               $state.go("root.reconsent");
            } else {
               $ionicPopup.alert({
                template: "OK! Note that you won't get any personalized stats until you do!"});
            }
        });
    }

    var handleConsent = function(resultDoc) {
        $scope.consentDoc = resultDoc;
        $ionicPopup.confirm({
            template: 'Consented to protocol {{consentDoc.protocol_id}}, {{consentDoc.approval_date}}',
            scope: $scope,
            title: "Consent found!",
            buttons: [
            // {text: "<a href='https://e-mission.eecs.berkeley.edu/consent'>View</a>",
            //  type: 'button-calm'},
            {text: "<b>OK</b>",
             type: 'button-positive'} ]
        }).finally(function(res) {
            $scope.consentDoc = null;
        });
    }

    $scope.checkConsent = function() {
        StartPrefs.getConsentDocument().then(function(resultDoc){
            if (resultDoc == null) {
                handleNoConsent(resultDoc);
            } else {
                handleConsent(resultDoc);
            }
        }, function(error) {
            $ionicPopup.alert({template: error});
        });
    }

    var prepopulateMessage = {
      message: 'Join me in making transportation greener and healthier \nDownload the emission app:', // not supported on some apps (Facebook, Instagram)
      subject: 'Emission - UC Berkeley Research Project', // fi. for email
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
});
