'use strict';

import angular from 'angular';
import ProfileSettings from './ProfileSettings';

angular.module('emission.main.control',['emission.services',
                                        'emission.i18n.utils',
                                        'emission.main.control.collection',
                                        'emission.main.control.sync',
                                        'emission.splash.localnotify',
                                        'emission.splash.notifscheduler',
                                        'emission.splash.startprefs',
                                        'emission.main.metrics.factory',
                                        'emission.stats.clientstats',
                                        'emission.plugin.kvstore',
                                        'emission.plugin.logger',
                                        ProfileSettings.module])

.controller('ControlCtrl', function($scope, $ionicPlatform,
               $state, $ionicPopover, i18nUtils,
               $ionicModal, $stateParams, Logger,
               KVStore, CalorieCal, ClientStats,
               StartPrefs, ControlHelper, EmailHelper, UploadHelper,
               ControlCollectionHelper, ControlSyncHelper,
               CarbonDatasetHelper, NotificationScheduler) {

    console.log("controller ControlCtrl called without params");

    //There is an appStatusModal in ProfileSettings, but this is called upon entering the view
    //might have to migrate later when at a point where it's not React inside of Angular
    //stateParams must relate to the overall app? afterEnter called when you open the view!
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

    //this function used in ProfileSettings to viewPrivacyPolicy
    //make sure to refresh on exit when migrated!
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

    //these change the page within the app, still need to find the React equivalent
    //in ProfileSettings in DevZone
    $scope.showLog = function() {
        $state.go("root.main.log");
    }
    //inProfileSettings in DevZone
    $scope.showSensed = function() {
        $state.go("root.main.sensed");
    }

    //this feature has been eliminated (as of right now)
    // $scope.copyToClipboard = (textToCopy) => {
    //     navigator.clipboard.writeText(textToCopy).then(() => {
    //         ionicToast.show('{Copied to clipboard!}', 'bottom', false, 2000);
    //     });
    // }  
});
