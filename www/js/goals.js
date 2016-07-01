'use strict';

angular.module('emission.main.goals',[])

.controller('GoalsCtrl', function($scope, $ionicModal){
	$scope.goals = [];
	$scope.goal = {};

	$ionicModal.fromTemplateUrl('templates/goal-modal.html', {
		scope: $scope,
		animation: 'slide-in-up'
	}).then(function(modal) {
		$scope.modal = modal;
	});

	$scope.toggleItem = function(goal){
    goal.checked = !goal.checked;
  	};

	$scope.openModal = function() {
    	$scope.modal.show();
  	};
  	$scope.closeModal = function() {
  		$scope.goal= {};
    	$scope.modal.hide();
  	};

	$scope.createGoal = function () {
		$scope.goals.push($scope.goal);
		$scope.goal = {};
		$scope.modal.hide();
	}

	$scope.removeGoal = function(goal) {
		$scope.goals.splice($scope.goals.indexOf(goal), 1);
	}

	$scope.completeGoal = function(index) {
		if(index > -1)
			$scope.goals[index].completed = true;
	}
})
