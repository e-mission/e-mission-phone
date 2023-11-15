import angular from 'angular';
import LabelTab from './diary/LabelTab';

angular
  .module('emission.main.diary', [
    'emission.plugin.logger',
    'emission.survey.enketo.answer',
  ])

  .config(function ($stateProvider) {
    $stateProvider.state('root.main.inf_scroll', {
      url: '/inf_scroll',
      views: {
        'main-inf-scroll': {
          template: '<label-tab></label-tab>',
        },
      },
    });
  });
