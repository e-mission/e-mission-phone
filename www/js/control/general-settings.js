'use strict';

import angular from 'angular';
import QrCode from './QrCode';

angular.module('emission.main.control',['emission.services',
                                        'emission.i18n.utils',
                                        'emission.main.control.collection',
                                        'emission.main.control.sync',
                                        'emission.splash.localnotify',
                                        'emission.splash.notifscheduler',
                                        'ionic-datepicker',
                                        'ionic-toast',
                                        'ionic-datepicker.provider',
                                        'emission.splash.startprefs',
                                        'emission.main.metrics.factory',
                                        'emission.stats.clientstats',
                                        'emission.plugin.kvstore',
                                        'emission.survey.enketo.demographics',
                                        'emission.plugin.logger',
                                        'emission.config.dynamic',
                                        QrCode.module])

.controller('ControlCtrl', function($scope, $window,
               $ionicScrollDelegate, $ionicPlatform,
               $state, $ionicPopup, $ionicActionSheet, $ionicPopover,
               $ionicModal, $stateParams,
               $rootScope, KVStore, ionicDatePicker, ionicToast,
               StartPrefs, ControlHelper, EmailHelper, UploadHelper,
               ControlCollectionHelper, ControlSyncHelper,
               CarbonDatasetHelper, NotificationScheduler, LocalNotify,
               i18nUtils,
               CalorieCal, ClientStats, CommHelper, Logger, DynamicConfig) {

    console.log("controller ControlCtrl called without params");

    var datepickerObject = {
      todayLabel: i18next.t('list-datepicker-today'),  //Optional
      closeLabel: i18next.t('list-datepicker-close'),  //Optional
      setLabel: i18next.t('list-datepicker-set'),  //Optional
      monthsList: moment.monthsShort(),
      weeksList: moment.weekdaysMin(),
      titleLabel: i18next.t('general-settings.choose-date'),
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

    $scope.overallAppStatus = false;

    $ionicModal.fromTemplateUrl('templates/control/app-status-modal.html', {
        scope: $scope
    }).then(function(modal) {
        $scope.appStatusModal = modal;
        if ($stateParams.launchAppStatusModal == true) {
            $scope.$broadcast("recomputeAppStatus");
            $scope.appStatusModal.show();
        }
    });

    $scope.openDatePicker = function(){
      ionicDatePicker.openDatePicker(datepickerObject);
    };

    $scope.carbonDatasetString = i18next.t('general-settings.carbon-dataset') + ": " + CarbonDatasetHelper.getCurrentCarbonDatasetCode();

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

    $scope.viewQRCode = function($event) {
        $scope.tokenURL = "emission://login_token?token="+$scope.settings.auth.opcode;
        if ($scope.qrp) {
            $scope.qrp.show($event);
        } else {
            $ionicPopover.fromTemplateUrl("templates/control/qrc.html", {scope: $scope}).then((q) => {
                $scope.qrp = q;
                $scope.qrp.show($event);
            }).catch((err) => Logger.displayError("Error while displaying QR Code", err));
        }
    }

    $scope.dummyNotification = () => {
        cordova.plugins.notification.local.addActions('dummy-actions', [
            { id: 'action', title: 'Yes' },
            { id: 'cancel', title: 'No' }
        ]);
        cordova.plugins.notification.local.schedule({
            id: new Date().getTime(),
            title: 'Dummy Title',
            text: 'Dummy text',
            actions: 'dummy-actions',
            trigger: {at: new Date(new Date().getTime() + 5000)},
        });
    }

    $scope.updatePrefReminderTime = (storeNewVal=true) => {
        const m = moment($scope.settings.notification.prefReminderTimeVal);
        $scope.settings.notification.prefReminderTime = m.format('LT'); // display in user's locale
        if (storeNewVal)
            NotificationScheduler.setReminderPrefs({ reminder_time_of_day: m.format('HH:mm') }); // store in HH:mm
    }

    $scope.fixAppStatus = function() {
        $scope.$broadcast("recomputeAppStatus");
        $scope.appStatusModal.show();
    }

    $scope.appStatusChecked = function() {
        // Hardcoded value so we can publish the hacky version today and then debug/fix the
        // infinite loop around waiting_for_trip_start -> tracking_error
        $window.cordova.plugins.notification.local.clearAll();
        $scope.appStatusModal.hide();
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
                gender: userDataFromStorage.gender == 1? i18next.t('gender-male') : i18next.t('gender-female')
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
        DynamicConfig.configReady().then(function(newConfig) {
            $scope.ui_config = newConfig;
            // backwards compat hack to fill in the raw_data_use for programs that don't have it
            const default_raw_data_use = {
                "en": `to monitor the ${newConfig.intro.program_or_study}, send personalized surveys or provide recommendations to participants`,
                "es": `para monitorear el ${newConfig.intro.program_or_study}, enviar encuestas personalizadas o proporcionar recomendaciones a los participantes`
            }
            Object.entries(newConfig.intro.translated_text).forEach(([lang, val]) => {
                val.raw_data_use = val.raw_data_use || default_raw_data_use[lang];
            });
            // TODO: we should be able to use $translate for this, right?
            $scope.template_text = newConfig.intro.translated_text[$scope.lang];
            if (!$scope.template_text) {
                $scope.template_text = newConfig.intro.translated_text["en"]
            }
            // Backwards compat hack to fill in the `app_required` based on the
            // old-style "program_or_study"
            // remove this at the end of 2023 when all programs have been migrated over
            if ($scope.ui_config.intro.app_required == undefined) {
                $scope.ui_config.intro.app_required = $scope.ui_config?.intro.program_or_study == 'program';
            }
            $scope.ui_config.opcode = $scope.ui_config.opcode || {};
            if ($scope.ui_config.opcode.autogen == undefined) {
                $scope.ui_config.opcode.autogen = $scope.ui_config?.intro.program_or_study == 'study';
            }
            $scope.refreshScreen();
        });
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
            Logger.displayError("While getting connect url", error);
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

    $scope.getOPCode = function() {
        ControlHelper.getOPCode().then(function(opcode) {
           console.log("opcode = "+opcode);
            $scope.$apply(function() {
                if (opcode == null) {
                  $scope.settings.auth.opcode = "Not logged in";
                } else {
                  $scope.settings.auth.opcode = opcode;
                }
            });
        }, function(error) {
            Logger.displayError("while getting opcode, ",error);
        });
    };
    $scope.showLog = function() {
        $state.go("root.main.log");
    }
    $scope.showSensed = function() {
        $state.go("root.main.sensed");
    }
    $scope.getState = function() {
        return ControlCollectionHelper.getState().then(function(response) {
            $scope.$apply(function() {
                $scope.settings.collect.state = response;
            });
            return response;
        }, function(error) {
            Logger.displayError("while getting current state", error);
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
                    Logger.displayError("while clearing user cache, error ->", error);
               });
            }
        });
    }

    $scope.nukeUserCache = function() {
        var nukeChoiceActions = [{text: i18next.t('general-settings.nuke-ui-state-only'),
                                  action: KVStore.clearOnlyLocal},
                                 {text: i18next.t('general-settings.nuke-native-cache-only'),
                                  action: KVStore.clearOnlyNative},
                                 {text: i18next.t('general-settings.nuke-everything'),
                                  action: KVStore.clearAll}];

        $ionicActionSheet.show({
            titleText: i18next.t('general-settings.clear-data'),
            cancelText: i18next.t('general-settings.cancel'),
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
            Logger.displayError("while invalidating cache, error->", error);
        });
    }

    $scope.$on('$ionicView.afterEnter', function() {
        console.log("afterEnter called with stateparams", $stateParams);
        $ionicPlatform.ready().then(function() {
            $scope.refreshScreen();
            if ($stateParams.launchAppStatusModal == true) {
                $scope.$broadcast("recomputeAppStatus");
                $scope.appStatusModal.show();
                $stateParams.launchAppStatusModal = false;
            }
            if ($stateParams.openTimeOfDayPicker) {
                $('input[name=timeOfDay]').focus();
            }
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
        $scope.settings.notification = {};
        $scope.settings.auth = {};
        $scope.settings.connect = {};
        $scope.settings.clientAppVer = ClientStats.getAppVersion();
        $scope.getConnectURL();
        $scope.getCollectionSettings();
        $scope.getSyncSettings();
        $scope.getOPCode();
        $scope.getState().then($scope.isTrackingOn).then(function(isTracking) {
            $scope.$apply(function() {
                console.log("Setting settings.collect.trackingOn = "+isTracking);
                $scope.settings.collect.trackingOn = isTracking;
            });
        });
        KVStore.get("OP_GEOFENCE_CFG").then(function(storedCfg) {
            $scope.$apply(function() {
                if (storedCfg == null) {
                    console.log("Setting settings.collect.experimentalGeofenceOn = false");
                    $scope.settings.collect.experimentalGeofenceOn = false;
                } else {
                    console.log("Setting settings.collect.experimentalGeofenceOn = true");
                    $scope.settings.collect.experimentalGeofenceOn = true;
                }
            });
        });
        if ($scope.ui_config.reminderSchemes) {
            NotificationScheduler.getReminderPrefs().then((prefs) => {
                $scope.$apply(() => {
                    const m = moment(prefs.reminder_time_of_day, 'HH:mm');
                    $scope.settings.notification.prefReminderTimeVal = m.toDate();
                    $scope.settings.notification.prefReminderTimeOnLoad = prefs.reminder_time_of_day;
                    $scope.updatePrefReminderTime(false); // update the displayed time
                });
            });
        }
        $scope.getUserData();
    };

    $scope.copyToClipboard = (textToCopy) => {
        navigator.clipboard.writeText(textToCopy).then(() => {
            ionicToast.show('{Copied to clipboard!}', 'bottom', false, 2000);
        });
    }

    $scope.logOut = function() {
        $ionicPopup.confirm({
            title: i18next.t('general-settings.are-you-sure'),
            template: i18next.t('general-settings.log-out-warning'),
            cancelText: i18next.t('general-settings.cancel'),
            okText: i18next.t('general-settings.confirm')
        }).then(function(res) {
            if (!res) return; // user cancelled
            
            // reset the saved config, then trigger a hard refresh
            const CONFIG_PHONE_UI="config/app_ui_config";
            $window.cordova.plugins.BEMUserCache.putRWDocument(CONFIG_PHONE_UI, {})
                .then($window.location.reload(true));
        });
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
            $ionicPopup.alert({template: i18next.t('general-settings.user-data-erased')});
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
          titleText: i18next.t('general-settings.choose-dataset'),
          cancelText: i18next.t('general-settings.cancel'),
          buttonClicked: function(index, button) {
            console.log("changeCarbonDataset(): chose locale " + button.value);
            CarbonDatasetHelper.saveCurrentCarbonDatasetLocale(button.value);
            $scope.carbonDatasetString = i18next.t('general-settings.carbon-dataset') + ": " + CarbonDatasetHelper.getCurrentCarbonDatasetCode();
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

    var handleNoConsent = function(resultDoc) {
        $ionicPopup.confirm({template: i18next.t('general-settings.consent-not-found')})
        .then(function(res){
            if (res) {
               $state.go("root.reconsent");
            } else {
               $ionicPopup.alert({
                template: i18next.t('general-settings.no-consent-message')});
            }
        });
    }

    var handleConsent = function(resultDoc) {
        $scope.consentDoc = resultDoc;
        $ionicPopup.confirm({
            template: i18next.t('general-settings.consented-to',{protocol_id: $scope.consentDoc.protocol_id,approval_date: $scope.consentDoc.approval_date}),
            scope: $scope,
            title: i18next.t('general-settings.consent-found'),
            buttons: [
            // {text: "<a href='https://e-mission.eecs.berkeley.edu/consent'>View</a>",
            //  type: 'button-calm'},
            {text: "<b>"+ i18next.t('general-settings.consented-ok') +"</b>",
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
        message: i18next.t('general-settings.share-message'), // not supported on some apps (Facebook, Instagram)
        subject: i18next.t('general-settings.share-subject'), // fi. for email
        url: i18next.t('general-settings.share-url')
    }

    $scope.share = function() {
        window.plugins.socialsharing.shareWithOptions(prepopulateMessage, function(result) {
            console.log("Share completed? " + result.completed); // On Android apps mostly return false even while it's true
            console.log("Shared to app: " + result.app); // On Android result.app is currently empty. On iOS it's empty when sharing is cancelled (result.completed=false)
        }, function(msg) {
            console.log("Sharing failed with message: " + msg);
        });
    }

    $scope.shareQR = function() {
        var prepopulateQRMessage = {};  
        const c = document.getElementsByClassName('qrcode-link');
        const cbase64 = c[0].getAttribute('href');
        prepopulateQRMessage.files = [cbase64];
        prepopulateQRMessage.url = $scope.settings.auth.opcode;

        window.plugins.socialsharing.shareWithOptions(prepopulateQRMessage, function(result) {
            console.log("Share completed? " + result.completed); // On Android apps mostly return false even while it's true
            console.log("Shared to app: " + result.app); // On Android result.app is currently empty. On iOS it's empty when sharing is cancelled (result.completed=false)
        }, function(msg) {
            console.log("Sharing failed with message: " + msg);
        });
    }

});
