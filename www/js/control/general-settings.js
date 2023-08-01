'use strict';

import angular from 'angular';
import ProfileSettings from './ProfileSettings';

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
                                        ProfileSettings.module])

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

    //this function used in ProfileSettings to viewPrivacyPolicy
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

    // $ionicPlatform.ready().then(function() {
    //     DynamicConfig.configReady().then(function(newConfig) {
    //         $scope.ui_config = newConfig;
    //         // backwards compat hack to fill in the raw_data_use for programs that don't have it
    //         const default_raw_data_use = {
    //             "en": `to monitor the ${newConfig.intro.program_or_study}, send personalized surveys or provide recommendations to participants`,
    //             "es": `para monitorear el ${newConfig.intro.program_or_study}, enviar encuestas personalizadas o proporcionar recomendaciones a los participantes`
    //         }
    //         Object.entries(newConfig.intro.translated_text).forEach(([lang, val]) => {
    //             val.raw_data_use = val.raw_data_use || default_raw_data_use[lang];
    //         });
    //         // TODO: we should be able to use $translate for this, right?
    //         $scope.template_text = newConfig.intro.translated_text[$scope.lang];
    //         if (!$scope.template_text) {
    //             $scope.template_text = newConfig.intro.translated_text["en"]
    //         }
    //         // Backwards compat hack to fill in the `app_required` based on the
    //         // old-style "program_or_study"
    //         // remove this at the end of 2023 when all programs have been migrated over
    //         if ($scope.ui_config.intro.app_required == undefined) {
    //             $scope.ui_config.intro.app_required = $scope.ui_config?.intro.program_or_study == 'program';
    //         }
    //         $scope.ui_config.opcode = $scope.ui_config.opcode || {};
    //         if ($scope.ui_config.opcode.autogen == undefined) {
    //             $scope.ui_config.opcode.autogen = $scope.ui_config?.intro.program_or_study == 'study';
    //         }
    //         $scope.refreshScreen();
    //     });
    // });

    //in ProfileSettings in DevZone
    $scope.showLog = function() {
        $state.go("root.main.log");
    }
    //inProfileSettings in DevZone
    $scope.showSensed = function() {
        $state.go("root.main.sensed");
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

    var handleNoConsent = function(resultDoc) {
    // var handleNoConsent = function(resultDoc) {
    //     $ionicPopup.confirm({template: i18next.t('general-settings.consent-not-found')})
    //     .then(function(res){
    //         if (res) {
    //            $state.go("root.reconsent");
    //         } else {
    //            $ionicPopup.alert({
    //             template: i18next.t('general-settings.no-consent-message')});
    //         }
    //     });
    // }

    // var handleConsent = function(resultDoc) {
    //     $scope.consentDoc = resultDoc;
    //     $ionicPopup.confirm({
    //         template: i18next.t('general-settings.consented-to',{protocol_id: $scope.consentDoc.protocol_id,approval_date: $scope.consentDoc.approval_date}),
    //         scope: $scope,
    //         title: i18next.t('general-settings.consent-found'),
    //         buttons: [
    //         // {text: "<a href='https://e-mission.eecs.berkeley.edu/consent'>View</a>",
    //         //  type: 'button-calm'},
    //         {text: "<b>"+ i18next.t('general-settings.consented-ok') +"</b>",
    //          type: 'button-positive'} ]
    //     }).finally(function(res) {
    //         $scope.consentDoc = null;
    //     });
    // }

    // //in ProfileSettings in DevZone (above two functions are helpers)
    // $scope.checkConsent = function() {
    //     StartPrefs.getConsentDocument().then(function(resultDoc){
    //         if (resultDoc == null) {
    //             handleNoConsent(resultDoc);
    //         } else {
    //             handleConsent(resultDoc);
    //         }
    //     }, function(error) {
    //         Logger.displayError("Error reading consent document from cache", error)
    //     });
    // }

    // //in ProfileSettings change carbon set
    // $scope.changeCarbonDataset = function() {
    //     $ionicActionSheet.show({
    //       buttons: CarbonDatasetHelper.getCarbonDatasetOptions(),
    //       titleText: i18next.t('general-settings.choose-dataset'),
    //       cancelText: i18next.t('general-settings.cancel'),
    //       buttonClicked: function(index, button) {
    //         console.log("changeCarbonDataset(): chose locale " + button.value);
    //         CarbonDatasetHelper.saveCurrentCarbonDatasetLocale(button.value);
    //         $scope.carbonDatasetString = i18next.t('general-settings.carbon-dataset') + ": " + CarbonDatasetHelper.getCurrentCarbonDatasetCode();
    //         return true;
    //       }
    //     });
    // };

    //this feature has been eliminated (as of right now)
    // $scope.copyToClipboard = (textToCopy) => {
    //     navigator.clipboard.writeText(textToCopy).then(() => {
    //         ionicToast.show('{Copied to clipboard!}', 'bottom', false, 2000);
    //     });
    // }  


});
