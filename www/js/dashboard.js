'use strict';

angular.module('emission.main.dashboard',[])

.controller('DashboardCtrl' , function($scope) {

	$scope.extendFootprintCard = function() {
		expandFootprintDOM();
		if($scope.expandedf){
			$scope.expandedf = false;
		} else {
			$scope.expandedf = true
		}
	}

	$scope.checkFootprintCardExpanded = function() {
        return ($scope.expandedf)? "icon ion-chevron-up" : "icon ion-chevron-down";
    }

    $scope.extendCalorieCard = function() {
    	expandCalorieDOM();
		if($scope.expandedc){
			$scope.expandedc = false;
		} else {
			$scope.expandedc = true
		}
	}

	$scope.checkCalorieCardExpanded = function() {
        return ($scope.expandedc)? "icon ion-chevron-up" : "icon ion-chevron-down";
    }

    var expandFootprintDOM = function() {
       var div = document.getElementById('dashboard-footprint');
       if (div.style.height == '500px'){ 
           	div.style.height = '180px'
       } else { 
          	div.style.height = '500px'
       	}
    }

    var expandCalorieDOM = function() {
       var div = document.getElementById('dashboard-calorie');
       if (div.style.height == '500px'){ 
           	div.style.height = '180px'
       } else { 
          	div.style.height = '500px'
       	}
	}	
});