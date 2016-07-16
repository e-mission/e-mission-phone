'use strict';

angular.module('emission.main.goals',['emission.services', 'ngSanitize'])

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
								$window, $http, $ionicGesture, $ionicPopup, $timeout){
	$scope.goals = [];
	$scope.goal = {};

	$ionicModal.fromTemplateUrl('templates/goals/goal-modal.html', {
		scope: $scope,
		animation: 'slide-in-up'
	}).then(function(modal) {
		$scope.modal = modal;
	});

	/*$scope.onGesture = function(gesture) {
    	console.log(gesture);
  	}*/

  	//var element = angular.element(document.querySelector('#todo')); 

	$scope.data = {
    	showDelete: false
  	};  

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

	$scope.theUser = {}

	$scope.signup = function(){
		console.log($scope.theUser.username);
		var regConfig = {'username': $scope.theUser.username};
		console.log(regConfig);
		$ionicLoading.show({
			template: '<ion-spinner icon="bubbles" class="costume"></ion-spinner>'
		});
		CommHelper.habiticaRegister(regConfig, function(response) {
			console.log("Success!")
			$scope.screen = response.success;
			//console.log(response);
			$window.location.reload();
		}, function(error) {
			$ionicLoading.hide();
			$ionicPopup.alert({title: "<h4 class='center-align'>Username is Required</h4>",
								okText: "Try Again",
								okType: "button-assertive"});
			console.log(JSON.stringify(error));
		});
	};
 

    $ionicLoading.show({
			template: '<ion-spinner icon="bubbles" class="costume"></ion-spinner>'
		});

    var userInfo = function(){
	var callOpts = {'method': 'GET', 'method_url': "/api/v3/user",
                    'method_args': null};

	CommHelper.habiticaProxy(callOpts, function(response){
		$scope.screen = response.success;
		$scope.$apply(function() {
			$scope.profile = response.data;
		})
		console.log("Proxy Sucess");
		$scope.gold = Math.round($scope.profile.stats.gp);
		$scope.gem = Math.round($scope.profile.balance);
		$scope.silver = Math.round(($scope.profile.stats.gp - 
			Math.floor($scope.profile.stats.gp))*100);
		console.log($scope.profile);
		$ionicLoading.hide();
		}, function(error){
			$ionicLoading.hide();
			console.log(error.data);
			console.log("error");
		});
	};

	userInfo();

	var callOpts = {'method': 'GET', 'method_url': "/api/v3/tasks/user",
                    'method_args': null};
    var tasks;
    CommHelper.habiticaProxy(callOpts, function(response){
		$scope.$apply(function() {
			tasks = response.data;
		})
		console.log(tasks);
			for(var habit in tasks){
				if(tasks[habit].type == "habit"){
					$scope.goal.name = tasks[habit].text;
					$scope.goal.note = tasks[habit].notes;
					$scope.goal._id = tasks[habit]._id;
					$scope.createGoal();
				}
			}
		}, function(error){
			console.log(JSON.stringify(error));
			console.log("error");
		});

    $scope.createGoalPhone = function() {
	   	var callOpts = {'method': 'POST', 'method_url': "/api/v3/tasks/user",
	                    'method_args': {'type': "habit", 'text': $scope.goal.name, 'notes': $scope.goal.note}};

	    CommHelper.habiticaProxy(callOpts, function(response){
	    		$scope.goal._id = response.data._id;
	    		console.log(response.data)
				$scope.createGoal()
				console.log("Sucessfully added the habit");
				$scope.goal = {};
				$scope.modal.hide();
			}, function(error){
				console.log(JSON.stringify(error));
				console.log("error");
			});
	};

	console.log("Outside createGoal phone");


	$scope.deleteGoal = function(taskId,  goal) {
		$scope.removeGoal(goal);
	   	var callOpts = {'method': 'DELETE', 'method_url': "/api/v3/tasks/" + taskId,
	                    'method_args': null};

	    CommHelper.habiticaProxy(callOpts, function(response){
				console.log("Sucessfully deleted the habit");
			}, function(error){
				console.log(JSON.stringify(error));
				console.log("error");
			});
	};

	$scope.scoreUp = function(taskId) {
	   	var callOpts = {'method': 'POST', 'method_url': "/api/v3/tasks/" + taskId+ "/score/up",
	                    'method_args': null};

	    CommHelper.habiticaProxy(callOpts, function(response){
				userInfo();
				console.log("Score up");
			}, function(error){
				console.log(JSON.stringify(error));
				console.log("error");
			});
	};

	$scope.scoreDown = function(taskId) {
	   	var callOpts = {'method': 'POST', 'method_url': "/api/v3/tasks/" + taskId+ "/score/down",
	                    'method_args': null};

	    CommHelper.habiticaProxy(callOpts, function(response){
				userInfo();
				console.log("Score down");
			}, function(error){
				console.log(JSON.stringify(error));
				console.log("error");
			});
	};

	$scope.joinParty = function() {
	   	var callOpts = {'method': 'POST', 'method_url': "/api/v3/groups/dfb01232-1d59-4f12-9c74-94b595dc1984/join",
	                    'method_args': null};

	    CommHelper.habiticaProxy(callOpts, function(response){
				console.log("Sucessfully joing the party");
				//console.log(response);
			}, function(error){
				console.log(error);
				console.log("error");
			});
	};


	/*$http.get('http://54.159.38.241:3000/export/avatar-'+userId+'.html')
    .then(function(response) {
          var html = response.data;
          console.log(html)
          $scope.rawHtml = $sce.trustAsHtml(html);
	}), function(error) {
    	console.log(JSON.stringify(error));
    	console.log(error.data);
	}*/
   	

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



