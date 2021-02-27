'use strict';

angular.module('emission.main.control',['emission.services',
                                        'emission.i18n.utils',
                                        'emission.main.control.collection',
                                        'emission.main.control.sync',
                                        'emission.main.control.tnotify',
                                        'ionic-datepicker',
                                        'ionic-datepicker.provider',
                                        'emission.splash.startprefs',
                                        'emission.splash.updatecheck',
                                        'emission.main.metrics.factory',
                                        'emission.stats.clientstats',
                                        'emission.plugin.kvstore',
                                        'emission.plugin.logger'])

.controller('ControlCtrl', function($scope, $window, $ionicScrollDelegate,
               $ionicPlatform,
               $state, $ionicPopup, $ionicActionSheet, $ionicPopover,
               $rootScope, KVStore, ionicDatePicker,
               StartPrefs, ControlHelper, EmailHelper, UploadHelper,
               ControlCollectionHelper, ControlSyncHelper,
               ControlTransitionNotifyHelper,
               CarbonDatasetHelper,
               UpdateCheck, i18nUtils,
               CalorieCal, ClientStats, CommHelper, Logger,
               $translate) {

    var datepickerObject = {
      todayLabel: $translate.instant('list-datepicker-today'),  //Optional
      closeLabel: $translate.instant('list-datepicker-close'),  //Optional
      setLabel: $translate.instant('list-datepicker-set'),  //Optional
      monthsList: moment.monthsShort(),
      weeksList: moment.weekdaysMin(),
      titleLabel: $translate.instant('general-settings.choose-date'),
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

    $scope.carbonDatasetString = $translate.instant('general-settings.carbon-dataset') + ": " + CarbonDatasetHelper.getCurrentCarbonDatasetCode();

    $scope.uploadLog = function () {
        UploadHelper.uploadFile("loggerDB")
    };

    $scope.emailLog = function () {
        // Passing true, we want to send logs
        EmailHelper.sendEmail("loggerDB")
    };

    $scope.viewPrivacyPolicy = function($event) {
        // button -> list element -> scroll
        // const targetEl = $event.currentTarget.parentElement.parentElement;
        if ($scope.ppp) {
            $scope.ppp.show($event);
        } else {
            i18nUtils.geti18nFileName("templates/", "intro/consent-text", ".html").then((consentFileName) => {
                $scope.consentTextFile = consentFileName;
                $ionicPopover.fromTemplateUrl("templates/control/main-consent.html", {scope: $scope}).then((p) => {
                    $scope.ppp = p;
                    $scope.ppp.show($event);
                });
            }).catch((err) => Logger.displayError("Error while displaying privacy policy", err));
        }
    }

    $scope.userData = []
    $scope.getUserData = function() {
        return CalorieCal.get().then(function(userDataFromStorage) {
        $scope.rawUserData = userDataFromStorage;
        if ($scope.userDataSaved()) {
            $scope.userData = []
            var height = userDataFromStorage.height.toString();
            var weight = userDataFromStorage.weight.toString();
            var temp  =  {
                age: userDataFromStorage.age,
                height: height + (userDataFromStorage.heightUnit == 1? ' cm' : ' ft'),
                weight: weight + (userDataFromStorage.weightUnit == 1? ' kg' : ' lb'),
                gender: userDataFromStorage.gender == 1? $translate.instant('gender-male') : $translate.instant('gender-female')
            }
            for (var i in temp) {
                $scope.userData.push({key: i, value: temp[i]});
            }
        }
        });
    }

    $scope.userDataSaved = function() {
        if (angular.isDefined($scope.rawUserData) && $scope.rawUserData != null) {
            return $scope.rawUserData.userDataSaved;
        } else {
            return false;
        }
    }
    $ionicPlatform.ready().then(function() {
        $scope.refreshScreen();
    });
    $scope.getLowAccuracy = function() {
        //  return true: toggle on; return false: toggle off.
        var isMediumAccuracy = ControlCollectionHelper.isMediumAccuracy();
        if (!angular.isDefined(isMediumAccuracy)) {
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

    $scope.getConnectURL = function() {
        ControlHelper.getSettings().then(function(response) {
            $scope.$apply(function() {
                $scope.settings.connect.url = response.connectUrl;
                console.log(response);
            });
        }, function(error) {
            console.log("While getting connect Url :" + error);
        });
    };

    $scope.getCollectionSettings = function() {
        ControlCollectionHelper.getCollectionSettings().then(function(showConfig) {
            $scope.$apply(function() {
                $scope.settings.collect.show_config = showConfig;
            })
        });
    };

    $scope.getSyncSettings = function() {
        ControlSyncHelper.getSyncSettings().then(function(showConfig) {
            $scope.$apply(function() {
                $scope.settings.sync.show_config = showConfig;
            })
        });
    };

    $scope.getTNotifySettings = function() {
        ControlTransitionNotifyHelper.getTNotifySettings().then(function(showConfig) {
            $scope.$apply(function() {
                $scope.settings.tnotify.show_config = showConfig;
            })
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
        return ControlCollectionHelper.getState().then(function(response) {
            $scope.$apply(function() {
                $scope.settings.collect.state = response;
            });
            return response;
        }, function(error) {
            $ionicPopup.alert("while getting current state, "+error);
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

    $scope.nukeUserCache = function() {
        var nukeChoiceActions = [{text: $translate.instant('general-settings.nuke-ui-state-only'),
                                  action: KVStore.clearOnlyLocal},
                                 {text: $translate.instant('general-settings.nuke-native-cache-only'),
                                  action: KVStore.clearOnlyNative},
                                 {text: $translate.instant('general-settings.nuke-everything'),
                                  action: KVStore.clearAll}];

        $ionicActionSheet.show({
            titleText: $translate.instant('general-settings.clear-data'),
            cancelText: $translate.instant('general-settings.cancel'),
            buttons: nukeChoiceActions,
            buttonClicked: function(index, button) {
                button.action();
                return true;
            }
        });
    }

    $scope.testTripEndNotify = function() {
        $ionicPopup.alert({template: 'test for local notification 0.9.0-beta.3+ only'});
        /*
        var testCfg = {
            id: 737678,
            title: $translate.instant('post-trip-prompt.notification-title'),
            text: "Testing if this works",
            icon: 'file://img/icon.png',
            actions: "TRIP_CONFIRM"
        };
        $window.cordova.plugins.notification.local.addActions('TRIP_CONFIRM', [{
            id: 'MUTE',
            type: 'button',
            title: 'Mute',
            ui: 'decline'
        },{
            id: 'SNOOZE',
            type: 'button',
            title: 'Snooze',
            launch: true
        },{
            id: 'CHOOSE',
            type: 'button',
            title: "Choose",
            launch: true
        }]);
        $window.cordova.plugins.notification.local.schedule(testCfg);
        */
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
        $ionicPlatform.ready().then(function() {
        $scope.refreshScreen();
        });
    })

    // Execute action on hidden popover
    $scope.$on('control.update.complete', function() {
        $scope.refreshScreen();
    });

    $scope.$on('popover.hidden', function() {
        $scope.refreshScreen();
    });

    $scope.refreshScreen = function() {
        console.log("Refreshing screen");
        $scope.settings = {};
        $scope.settings.collect = {};
        $scope.settings.sync = {};
        $scope.settings.tnotify = {};
        $scope.settings.auth = {};
        $scope.settings.connect = {};
        $scope.settings.channel = function(newName) {
          return arguments.length ? (UpdateCheck.setChannel(newName)) : $scope.settings.storedChannel;
        };
        UpdateCheck.getChannel().then(function(retVal) {
            $scope.$apply(function() {
                $scope.settings.storedChannel = retVal;
            });
        });
        $scope.getConnectURL();
        $scope.getCollectionSettings();
        $scope.getSyncSettings();
        $scope.getTNotifySettings();
        $scope.getEmail();
        $scope.getState().then($scope.isTrackingOn).then(function(isTracking) {
            $scope.$apply(function() {
                console.log("Setting settings.collect.trackingOn = "+isTracking);
                $scope.settings.collect.trackingOn = isTracking;
            });
        });
        $scope.getUserData();
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

    var getStartTransitionKey = function() {
        if($scope.isAndroid()) {
            return "local.transition.exited_geofence";
        }
        else if($scope.isIOS()) {
            return "T_EXITED_GEOFENCE";
        }
    }

    var getEndTransitionKey = function() {
        if($scope.isAndroid()) {
            return "local.transition.stopped_moving";
        }
        else if($scope.isIOS()) {
            return "T_TRIP_ENDED";
        }
    }

    var getOngoingTransitionState = function() {
        if($scope.isAndroid()) {
            return "local.state.ongoing_trip";
        }
        else if($scope.isIOS()) {
            return "STATE_ONGOING_TRIP";
        }
    }

    $scope.forceSync = function() {
        ClientStats.addEvent(ClientStats.getStatKeys().BUTTON_FORCE_SYNC).then(
            function() {
                console.log("Added "+ClientStats.getStatKeys().BUTTON_FORCE_SYNC+" event");
            });
        ControlSyncHelper.forceSync().then(function() {
            /*
             * Change to sensorKey to "background/location" after fixing issues
             * with getLastSensorData and getLastMessages in the usercache
             * See https://github.com/e-mission/e-mission-phone/issues/279 for details
             */
            var sensorKey = "statemachine/transition";
            return window.cordova.plugins.BEMUserCache.getAllMessages(sensorKey, true);
        }).then(function(sensorDataList) {
            Logger.log("sensorDataList = "+JSON.stringify(sensorDataList));
            // If everything has been pushed, we should
            // only have one entry for the battery, which is the one that was
            // inserted on the last successful push.
            var isTripEnd = function(entry) {
                if (entry.metadata.key == getEndTransitionKey()) {
                    return true;
                } else {
                    return false;
                }
            };
            var syncLaunchedCalls = sensorDataList.filter(isTripEnd);
            var syncPending = (syncLaunchedCalls.length > 0);
            Logger.log("sensorDataList.length = "+sensorDataList.length+
                       ", syncLaunchedCalls.length = "+syncLaunchedCalls.length+
                       ", syncPending? = "+syncPending);
            return syncPending;
        }).then(function(syncPending) {
            Logger.log("sync launched = "+syncPending);
            if (syncPending) {
                Logger.log("data is pending, showing confirm dialog");
                $ionicPopup.confirm({template: 'data pending for push'}).then(function(res) {
                    if (res) {
                        $scope.forceSync();
                    } else {
                        Logger.log("user refused to re-sync");
                    }
                });
            } else {
                $ionicPopup.alert({template: 'all data pushed!'});
            }
        }).catch(function(error) {
            Logger.displayError("Error while forcing sync", error);
        });
    };

    var getTransition = function(transKey) {
        var entry_data = {};
        return $scope.getState().then(function(curr_state) {
            entry_data.curr_state = curr_state;
            if (transKey == getEndTransitionKey()) {
                entry_data.curr_state = getOngoingTransitionState();
            }
            entry_data.transition = transKey;
            entry_data.ts = moment().unix();
            return entry_data;
        })
    }

    $scope.endForceSync = function() {
        /* First, quickly start and end the trip. Let's listen to the promise
         * result for start so that we ensure ordering */
        var sensorKey = "statemachine/transition";
        return getTransition(getStartTransitionKey()).then(function(entry_data) {
            return window.cordova.plugins.BEMUserCache.putMessage(sensorKey, entry_data);
        }).then(function() {
                return getTransition(getEndTransitionKey()).then(function(entry_data) {
                    return window.cordova.plugins.BEMUserCache.putMessage(sensorKey, entry_data);
                })
        }).then($scope.forceSync);
    }

    $scope.forceState = ControlCollectionHelper.forceState;
    $scope.editCollectionConfig = ControlCollectionHelper.editConfig;
    $scope.editSyncConfig = ControlSyncHelper.editConfig;
    $scope.editTNotifyConfig = ControlTransitionNotifyHelper.editConfig;


    $scope.isAndroid = function() {
        return ionic.Platform.isAndroid();
    }

    $scope.isIOS = function() {
        return ionic.Platform.isIOS();
    }

    $ionicPopover.fromTemplateUrl('templates/control/main-sync-settings.html', {
        scope: $scope
    }).then(function(popover) {
        $scope.syncSettingsPopup = popover;
    });
    $scope.isTrackingOn = function() {
        return $ionicPlatform.ready().then(function() {
            if($scope.isAndroid()){
                return $scope.settings.collect.state != "local.state.tracking_stopped";
            } else if ($scope.isIOS()) {
                return $scope.settings.collect.state != "STATE_TRACKING_STOPPED";
            }
        });
    };
    $scope.userStartStopTracking = function() {
        if ($scope.settings.collect.trackingOn){
            return ControlCollectionHelper.forceTransition('STOP_TRACKING');
        } else {
            return ControlCollectionHelper.forceTransition('START_TRACKING');
        }
    }
    $scope.getExpandButtonClass = function() {
        return ($scope.expanded)? "icon ion-ios-arrow-up" : "icon ion-ios-arrow-down";
    }
    $scope.getUserDataExpandButtonClass = function() {
        return ($scope.dataExpanded)? "icon ion-ios-arrow-up" : "icon ion-ios-arrow-down";
    }
    $scope.eraseUserData = function() {
        CalorieCal.delete().then(function() {
            $ionicPopup.alert({template: $translate.instant('general-settings.user-data-erased')});
        });
    }
    $scope.parseState = function(state) {
        if (state) {
            if($scope.isAndroid()){
                return state.substring(12);
            } else if ($scope.isIOS()) {
                return state.substring(6);
            }
        }
    }
    $scope.changeCarbonDataset = function() {
        $ionicActionSheet.show({
          buttons: CarbonDatasetHelper.getCarbonDatasetOptions(),
          titleText: $translate.instant('general-settings.choose-dataset'),
          cancelText: $translate.instant('general-settings.cancel'),
          buttonClicked: function(index, button) {
            console.log("changeCarbonDataset(): chose locale " + button.value);
            CarbonDatasetHelper.saveCurrentCarbonDatasetLocale(button.value);
            $scope.carbonDatasetString = $translate.instant('general-settings.carbon-dataset') + ": " + CarbonDatasetHelper.getCurrentCarbonDatasetCode();
            return true;
          }
        });
    };
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
        $ionicPopup.confirm({template: $translate.instant('general-settings.consent-not-found')})
        .then(function(res){
            if (res) {
               $state.go("root.reconsent");
            } else {
               $ionicPopup.alert({
                template: $translate.instant('general-settings.no-consent-message')});
            }
        });
    }

    var handleConsent = function(resultDoc) {
        $scope.consentDoc = resultDoc;
        $ionicPopup.confirm({
            template: $translate.instant('general-settings.consented-to',{protocol_id: $scope.consentDoc.protocol_id,approval_date: $scope.consentDoc.approval_date}),
            scope: $scope,
            title: $translate.instant('general-settings.consent-found'),
            buttons: [
            // {text: "<a href='https://e-mission.eecs.berkeley.edu/consent'>View</a>",
            //  type: 'button-calm'},
            {text: "<b>"+ $translate.instant('general-settings.consented-ok') +"</b>",
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
            Logger.displayError("Error reading consent document from cache", error)
        });
    }

    var prepopulateMessage = {
        message: $translate.instant('general-settings.share-message'), // not supported on some apps (Facebook, Instagram)
        subject: $translate.instant('general-settings.share-subject'), // fi. for email
        url: $translate.instant('general-settings.share-url')
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
