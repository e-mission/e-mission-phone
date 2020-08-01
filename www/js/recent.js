angular.module('emission.main.recent', ['emission.services'])


.controller('appCtrl', function($scope, $timeout) {
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

.controller('logCtrl', function(ControlHelper, $scope, EmailHelper) {
    console.log("Launching logCtr");
    var RETRIEVE_COUNT = 100;
    $scope.logCtrl = {};

    $scope.refreshEntries = function() {
        window.Logger.getMaxIndex().then(function(maxIndex) {
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
        window.Logger.getMessagesFromIndex($scope.logCtrl.currentStart, RETRIEVE_COUNT)
            .then(function(entryList) {
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
            currEntry.fmt_time = moment.unix(currEntry.ts).format("llll");
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

    $scope.emailLog = function () {
        EmailHelper.sendEmail("loggerDB");
    }

    $scope.refreshEntries();
})

.controller('sensedDataCtrl', function($scope, $ionicActionSheet, EmailHelper) {
    var currentStart = 0;

    /* Let's keep a reference to the database for convenience */
    var db = window.cordova.plugins.BEMUserCache;

    $scope.config = {}
    $scope.config.key_data_mapping = {
        "Transitions": {
            fn: db.getAllMessages,
            key: "statemachine/transition"
        },
        "Locations": {
            fn: db.getAllSensorData,
            key: "background/location"
        },
        "Motion Type": {
            fn: db.getAllSensorData,
            key: "background/motion_activity"
        },
    }

    $scope.emailCache = function () {
        EmailHelper.sendEmail("userCacheDB");
    }

    $scope.config.keys = []
    for (key in $scope.config.key_data_mapping) {
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
        usercacheFn = db.getAllMessages;
        usercacheKey = "statemachine/transition";
    } else {
        usercacheFn = $scope.config.key_data_mapping[$scope.selected.key]["fn"]
        usercacheKey = $scope.config.key_data_mapping[$scope.selected.key]["key"]
    }
    usercacheFn(usercacheKey, true).then(function(entryList) {
      $scope.entries = [];
      $scope.$apply(function() {
          for (i = 0; i < entryList.length; i++) {
            // $scope.entries.push({metadata: {write_ts: 1, write_fmt_time: "1"}, data: "1"})
            var currEntry = entryList[i];
            currEntry.metadata.write_fmt_time = moment.unix(currEntry.metadata.write_ts)
                                                    .tz(currEntry.metadata.time_zone)
                                                    .format("llll");
            currEntry.data = JSON.stringify(currEntry.data, null, 2);
            // window.Logger.log(window.Logger.LEVEL_DEBUG,
            //     "currEntry.data = "+currEntry.data);
            $scope.entries.push(currEntry);
          }
      })
      // This should really be within a try/catch/finally block
      $scope.$broadcast('scroll.refreshComplete');
    }, function(error) {
        window.Logger.log(window.Logger.LEVEL_ERROR, "Error updating entries"+ error);
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

    $scope.$on('leafletDirectiveMap.resize', function(event, data) {
          console.log("recent/map received resize event, invalidating map size");
          data.leafletObject.invalidateSize();
    });

    $scope.refreshMap = function() {
        db.getAllSensorData($scope.mapCtrl.selKey, function(entryList) {
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
});



