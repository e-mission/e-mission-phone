import angular from 'angular';
import LabelTab from './diary/LabelTab';

angular.module('emission.main.diary',['emission.main.diary.services',
                                      'emission.survey.multilabel.buttons',
                                      'emission.survey.multilabel.infscrollfilters',
                                      'emission.survey.enketo.add-note-button',
                                      'emission.survey.enketo.trip.infscrollfilters',
                                      'emission.plugin.logger'])

.config(function($stateProvider) {
  $stateProvider
  .state('root.main.inf_scroll', {
      url: "/inf_scroll",
      views: {
        'main-inf-scroll': {
          template: "<label-tab></label-tab>",
        },
      }
  })
});
