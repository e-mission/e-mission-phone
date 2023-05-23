angular.module('emission.main.diary',['emission.main.diary.infscrolllist',
                                      'emission.main.diary.infscrolldetail',
                                      'emission.main.diary.services',
                                      'emission.main.diary.current'])

.config(function($stateProvider) {
  $stateProvider
  .state('root.main.inf_scroll', {
      url: "/inf_scroll",
      views: {
        'main-inf-scroll': {
          templateUrl: "templates/diary/infinite_scroll_list.html",
          controller: 'InfiniteDiaryListCtrl'
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

  .state('root.main.current', {
      url: "/current",
      views: {
        'main-diary': {
          templateUrl: "templates/diary/current.html",
          controller: 'CurrMapCtrl'
        },
      }
      
  });
});
