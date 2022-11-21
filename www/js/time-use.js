angular.module('emission.main.time-use',[
  'emission.main.time-use.list'
])

.config(function($stateProvider) {
  $stateProvider
  .state('root.main.time-use', {
    url: '/time-use',
    views: {
      'main-time-use': {
        templateUrl: 'templates/time-use/list.html',
        controller: 'TimeUseListCtrl'
      }
    }
  });
});
