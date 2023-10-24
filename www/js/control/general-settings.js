'use strict';

import angular from 'angular';
import ProfileSettings from './ProfileSettings';

angular
  .module('emission.main.control', [
    'emission.services',
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
    'emission.config.dynamic',
    ProfileSettings.module,
  ])

  .controller(
    'ControlCtrl',
    function (
      $scope,
      $ionicPlatform,
      $state,
      $ionicPopover,
      i18nUtils,
      $ionicModal,
      $stateParams,
      Logger,
      KVStore,
      CalorieCal,
      ClientStats,
      StartPrefs,
      ControlHelper,
      EmailHelper,
      UploadHelper,
      ControlCollectionHelper,
      ControlSyncHelper,
      CarbonDatasetHelper,
      NotificationScheduler,
      DynamicConfig,
    ) {
      console.log('controller ControlCtrl called without params');

      //used to have on "afterEnter" that checked for 2 things
      //modal launch -> migrated into AppStatusModal w/ use of custom hook!
      //stateParams.openTimeOfDayPicker -> functionality lost for now
      //to change reminder time if accessing profile by specific android notification flow
      //would open the date picker
    },
  );
