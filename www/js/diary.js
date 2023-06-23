import angular from 'angular';
import LabelTab from './diary/list/LabelTab';

angular.module('emission.main.diary',['emission.main.diary.infscrolldetail',
                                      'emission.main.diary.services',
                                      'emission.survey',
                                      LabelTab.module])

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

  .state('root.main.inf_scroll-detail', {
      url: "/inf_scroll/:tripId",
      views: {
        'main-inf-scroll': {
          templateUrl: "templates/diary/infinite_scroll_detail.html",
          controller: 'InfiniteDiaryDetailCtrl'
        },
      }
  })
});
