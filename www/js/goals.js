'use strict';

angular.module('emission.main.goals',['emission.services'])

/*.config(function($stateProvider, $ionicConfigProvider, $urlRouterProvider) {
  $stateProvider

  .state('root.main.goals.party', {
    url: '/party',
    views: {
      'main-goals': {
        templateUrl: 'templates/goals/party.html',
        controller: 'PartyCtrl'
      }
    }
  });
  })*/

.controller('GoalsCtrl', function(CommHelper, $scope, $ionicModal, $http, $window, $log){
	$scope.goals = [];
	$scope.goal = {};

	$ionicModal.fromTemplateUrl('templates/goals/goal-modal.html', {
		scope: $scope,
		animation: 'slide-in-up'
	}).then(function(modal) {
		$scope.modal = modal;
	});

	$scope.openModal = function() {
    	$scope.modal.show();
  	};
  	$scope.closeModal = function() {
  		$scope.goal = {};
    	$scope.modal.hide();
  	};
	$scope.createGoal = function () {
		$scope.goals.push($scope.goal);
		$scope.goal = {};
		$scope.modal.hide();
	};

	$scope.removeGoal = function(goal) {
		$scope.goals.splice($scope.goals.indexOf(goal), 1);
	};

	$scope.completeGoal = function(goal) {
		$scope.goal.completed = true;
	};

	var callOpts = {'method': 'GET', 'method_url': "/api/v3/user",
                    'method_args': null};
    //callOpts = {'method': 'GET', 'method_url': "/export/avatar-",
    				//'method_args': };

    
	CommHelper.habiticaProxy(callOpts, function(response){
		 $scope.user = response.data;
		 console.log(error);
		}, function(error){
			$scope.err = error.data;
			console.log(error);
		});

   

	/*var UUID= '4f369eef-aed4-4408-bcbf-b34896daf7e3';

	$http.get('https://habitica.com/api/v3/members/'+ UUID)
	.then(function(response){
		$scope.user = response.data;
		//console.log(response.data);
	},function(err){
		$scope.error = err.data;
		console.log($scope.error);
	});
	//function firstUpperCase(string) {
	//	return string[0].toUpperCase() + string.slice(1);
	//}*/
});



