import LogPage from './control/LogPage';
angular.module('emission.main.recent', ['emission.services', LogPage.module])

.controller('logCtrl', function(ControlHelper, $scope, EmailHelper) {
    //can remove when we have react routing!
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
    for (let key in $scope.config.key_data_mapping) {
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
    let usercacheFn, usercacheKey;
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
          for (let i = 0; i < entryList.length; i++) {
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
