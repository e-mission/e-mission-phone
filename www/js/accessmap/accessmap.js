'use strict';

angular.module('emission.main.accessmap', [
  'emission.plugin.logger',
  'ng-walkthrough',
  'nzTour',
  'angularLocalStorage',
]).
  controller('AccessMapCtrl',
    function ($scope, $state, $ionicPopup, nzTour, $ionicPopover, storage) {
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
            content: 'When a trip ends, wait for prompt, then find the trip in diary',
          },
          {
            target: '#accessmap-webframe',
            content: 'You can see the detail or take survey for a particular trip in diary',
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
      });
    });
