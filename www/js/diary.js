angular.module('emission.main.diary',['emission.main.diary.list',
                                      'emission.main.diary.infscrolllist',
                                      'emission.main.diary.detail',
                                      'emission.main.diary.services',
                                      'emission.main.diary.current',])

.config(function($stateProvider) {
  $stateProvider
  .state('root.main.diary', {
    url: '/diary',
    views: {
      'main-diary': {
        templateUrl: 'templates/diary/list.html',
        controller: 'DiaryListCtrl'
      }
    }
  })

  .state('root.main.diary-detail', {
    url: '/diary/:tripId',
    views: {
        'main-diary': {
            templateUrl: 'templates/diary/detail.html',
            controller: 'DiaryDetailCtrl'
        }
     }
  })

  .state('root.main.inf_scroll', {
      url: "/inf_scroll",
      views: {
        'main-inf-scroll': {
          templateUrl: "templates/diary/infinite_scroll_list.html",
          controller: 'InfiniteDiaryListCtrl'
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
