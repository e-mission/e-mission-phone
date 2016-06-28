'use strict';

angular.module('emission.main.goals',[])

.controller('GoalsCtrl', function($scope){
$scope.data = {};
$scope.goal = "...";

$scope.saveGoal = function() {
    if ($scope.data.userGoal){
      $scope.goal = $scope.data.userGoal;
      console.log("Submitting Form", data);
    }else {
      alert("Please fill out your goal!");
    }
  };
})
