angular.module('emission.main.time-use',[
  'emission.main.time-use.list',
  'emission.survey.enketo.time-use'
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
