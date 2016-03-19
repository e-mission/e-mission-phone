angular.module('emission.main.diary',['emission.main.diary.list',
                                      'emission.main.diary.detail',
                                      'emission.main.diary.services'])

.config(function($stateProvider, $ionicConfigProvider) {
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

  .state('root.main.diary.detail', {
    url: '/detail/:tripId',
    views: {
        'main-detail': {
            templateUrl: 'templates/diary/detail.html',
            controller: 'DiaryDetailCtrl'
        }
     }
  });

  $ionicConfigProvider.tabs.style('standard')
  $ionicConfigProvider.tabs.position('bottom');
})
