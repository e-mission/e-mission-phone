'use strict';

angular.module('emission.main.goals.inventory',['emission.services'])

.controller('UserInventoryCtrl', function(CommHelper, $scope, $ionicModal, $http){

	var getUserInfo = function(){
		var callOpts = {'method': 'GET', 'method_url': "/api/v3/user",
	                    'method_args': null};

		CommHelper.habiticaProxy(callOpts).then(function(response){
			$scope.$apply(function() {
				$scope.profile = response.data;
			});
			console.log("Proxy Sucess");
			console.log(response)
			$ionicLoading.hide();
			}, function(error){
				$ionicLoading.hide();
				console.log("User profile error");
			});
	};
	getUserInfo();


	/*$scope.shirt;
	var updateUser = function(){
		var callOpts = {'method': 'PUT', 'method_url': "/api/v3/user",
							'method_args': {'preferences.shirt': $scope.shirt}}

		CommHelper.habiticaProxy(callOpts).then(function(response){

		}, function(error){

		});
	}*/


});