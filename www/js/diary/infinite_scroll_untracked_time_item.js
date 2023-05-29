
/**
 * A directive to display untracked time within the diary view.
 */

import angular from 'angular';

angular.module('emission.main.diary.infscrolluntrackedtimeitem',
    ['emission.main.diary.infscrolllist',
        'emission.survey.multilabel.services',
        'emission.services',
        'emission.config.imperial',
        'emission.config.dynamic',
        'emission.plugin.logger',
        'emission.stats.clientstats',])

  .directive("infiniteScrollUntrackedTimeItem", function () {
    return {
      restrict: 'E',
      scope: {
        triplike: '=',
        config: '=',
      },
      controller: 'UntrackedTimeItemCtrl',
      templateUrl: 'templates/diary/untracked_time_list_item.html'
    };
  })

  .controller("UntrackedTimeItemCtrl", function ($scope, $state, DynamicConfig) {
    // controller not needed for now
  });
