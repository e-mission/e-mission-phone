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


.controller('GoalsCtrl', function(CommHelper, $state, $ionicLoading, $scope, $rootScope, $ionicModal, 
								$window, $ionicPopup){
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

	$scope.theUser = {}

	$scope.signup = function(){
		console.log($scope.theUser.username);
		var regConfig = {'username': $scope.theUser.username};
		console.log(regConfig);
		$ionicLoading.show({
			template: 'Loading...'
		});
		CommHelper.habiticaRegister(regConfig, function(response) {
			console.log("Success!")
			$scope.screen = response.success;
			console.log(response);
			$window.location.path().reload();
		}, function(error) {
			$ionicLoading.hide();
			$ionicPopup.alert({title: "<h4 class='center-align'>Username is Required</h4>",
								okText: "Try Again",
								okType: "button-assertive"});
			console.log(JSON.stringify(error));
		});
	};
 
    $ionicLoading.show({
			template: 'Loading...'
		});

	var callOpts = {'method': 'GET', 'method_url': "/api/v3/user",
                    'method_args': null};
    //callOpts = {'method': 'GET', 'method_url': "/export/avatar-",
    				//'method_args': };
    
	CommHelper.habiticaProxy(callOpts, function(response){
		$scope.screen = response.success;
		$scope.user = response.data;
		console.log(response.data);
		console.log("Proxy Sucess");
		$ionicLoading.hide();
		}, function(error){
			$ionicLoading.hide();
			console.log(error);
			console.log("error");
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



