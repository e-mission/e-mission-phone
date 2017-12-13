'use strict';

angular.module('emission.main.accessmap', [
  'emission.plugin.logger',
  'ng-walkthrough',
  'nzTour',
  'angularLocalStorage',
  'emission.services'
]).
  controller('AccessMapCtrl',
    function ($scope, $state, $ionicPopup, nzTour, $ionicPopover, storage,
              CommHelper, $sce) {
      // Tour steps
      var tour = {
        config: {
          mask: {
            visibleOnNoTarget: true,
            clickExit: true,
          },
        },
        steps: [
          {
            target: '#accessmap-webframe',
            content: 'Use AccessMap to plan your route and go on to trips',
          },
          {
            target: '#accessmap-webframe',
            content: 'When a trip ends, wait for prompt, then find your trip in diary',
          },
          {
            target: '#accessmap-webframe',
            content: 'Click ">" button of a particular trip to expand the trip detail, and click take survey',
          },
          {
            target: '#accessmap-webframe',
            content: 'Please login before taking the survey, so we can associate this trip with you',
          },
          {
            target: '#accessmap-help',
            content: 'Click here to read this tutorial again',
          },
        ],
      };

      $scope.startWalkthrough = function () {
        nzTour.start(tour).then(function (result) {
          Logger.log('list walkthrough start completed, no error');
        }).catch(function (err) {
          Logger.log('list walkthrough start errored' + err);
        });
      };

      /*
        * Checks if it is the first time the user has loaded the diary tab. If it is then
        * show a walkthrough and store the info that the user has seen the tutorial.
        */
      var checkTutorialDone = function () {
        var ACCESSMAP_DONE_KEY = 'accessmap_tutorial_done';
        var accessmapTutorialDone = storage.get(ACCESSMAP_DONE_KEY);
        if (!accessmapTutorialDone) {
          $scope.startWalkthrough();
          storage.set(ACCESSMAP_DONE_KEY, true);
        }
      };

      $scope.$on('$ionicView.enter', function(ev) {
        // Workaround from
        // https://github.com/driftyco/ionic/issues/3433#issuecomment-195775629
        if(ev.targetScope !== $scope) {
          return;
        }

        checkTutorialDone();

        // Load AccessMap with uuid
        CommHelper.getUser().then(function(userProfile) {
          var uuidRaw = userProfile.user_id['$uuid'];
          var parts = [];
          parts.push(uuidRaw.slice(0,8));
          parts.push(uuidRaw.slice(8,12));
          parts.push(uuidRaw.slice(12,16));
          parts.push(uuidRaw.slice(16,20));
          parts.push(uuidRaw.slice(20,32));
          var uuid = parts.join('-');
          $scope.currentProjectUrl = $sce.trustAsResourceUrl('https://emission-accessmap.open-to-all.com/?emissionId=' + uuid);
          console.log("ACCESSMAP URL: " + $scope.currentProjectUrl);
        });
      });
    });
