angular.module('emission.main.control.sync', ['emission.services'])
.factory("ControlSyncHelper", function($window, 
        $ionicActionSheet, $ionicPopup, $ionicPopover, $rootScope,
        CommHelper) {

    var csh = {};
    csh.new_config = {};
    csh.config = {};
    csh.settingsPopup = {};

    /* 
     * Functions to read and format values for display
     */

    csh.getSyncSettings = function() {
        return csh.getConfig().then(function(response) {
            var config = response;
            csh.config = config;
            return csh.formatConfigForDisplay(config);
        });
    };

    csh.formatConfigForDisplay = function(config) {
        var retVal = [];
        for (var prop in config) {
            retVal.push({'key': prop, 'val': config[prop]});
        }
        return retVal;
    }

    /* 
     * Functions to edit and save values
     */

    var getPopoverScope = function() {
        var new_scope = $rootScope.$new();
        new_scope.saveAndReload = csh.saveAndReload;
        new_scope.isIOS = ionic.Platform.isIOS;
        new_scope.isAndroid = ionic.Platform.isAndroid;
        new_scope.setSyncInterval = csh.setSyncInterval;
        return new_scope;
    }

    csh.editConfig = function($event) {
        csh.new_config = JSON.parse(JSON.stringify(csh.config));
        var popover_scope = getPopoverScope();
        popover_scope.new_config = csh.new_config;
        $ionicPopover.fromTemplateUrl('templates/control/main-sync-settings.html', {
            scope: popover_scope
        }).then(function(popover) {
            csh.settingsPopup = popover;
            console.log("settings popup = "+csh.settingsPopup);
            csh.settingsPopup.show($event);
        });
        return csh.new_config;
    }

    csh.saveAndReload = function() {
        console.log("new config = "+csh.new_config);
        csh.setConfig(csh.new_config).then(function() {
            csh.config = csh.new_config;
            $rootScope.$broadcast('control.update.complete', 'sync config');
            csh.settingsPopup.hide();
            csh.settingsPopup.remove();
            CommHelper.updateUser({
                // TODO: worth thinking about where best to set this
                // Currently happens in native code. Now that we are switching
                // away from parse, we can store this from javascript here. 
                // or continue to store from native
                // this is easier for people to see, but means that calls to
                // native, even through the javascript interface are not complete
                curr_sync_interval: csh.new_config.sync_interval
            });
        }).catch(function(err){
            window.logger.Logger.displayError("Error while setting sync config", err);
        });
    };

    csh.setSyncInterval = function() {
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
                csh.new_config.sync_interval = button.value;
                return true;
            }
        });
    };

    /*
     * BEGIN: Simple read/write wrappers
     */

    csh.setConfig = function(config) {
      return window.cordova.plugins.BEMServerSync.setConfig(config);
    };

    csh.getConfig = function() {
      return window.cordova.plugins.BEMServerSync.getConfig();
    };

    csh.forceSync = function() {
      return window.cordova.plugins.BEMServerSync.forceSync();
    };

    return csh;
});
