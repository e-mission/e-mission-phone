'use strict';

angular.module('emission.main.goalslogin',['emission.services', 'ngSanitize', 'ngAnimate', 'angularLocalStorage'])

/*.run(function(CommHelper, $state, ionicPlatform, $rootScope, storage) {
	$ionicPlatform.ready(function() {
	    var getUserInfo = function(){
	        var callOpts = {'method': 'GET', 'method_url': "/api/v3/user",
	                        'method_args': null};

	        CommHelper.habiticaProxy(callOpts).then(function(response){
	            console.log("Success!");
	            console.log(response);
	            $state.go('root.main.goals.goalhome');
	        }, function(error) {
	            console.log("Not signed up");
	        });
		};
		getUserInfo();	
    });
})*/

.controller("GoalsLoginCtrl", function(CommHelper, $state, $rootScope, storage, $ionicLoading, $ionicPopup) {
	$scope.theUser = {};
	$scope.signup = function(){
		console.log($scope.theUser.username);
		var regConfig = {'username': $scope.theUser.username};
		console.log(regConfig);
		$ionicLoading.show({
			template: '<ion-spinner icon="bubbles"></ion-spinner>'
		});
		CommHelper.habiticaRegister(regConfig).then(function(response) {
			console.log("Success!");
			console.log(response);
			storage.set('party_id',response.habitica_group_id);
			$state.go('root.main.goals.goalhome');
		}, function(error) {
			$ionicLoading.hide();
			$ionicPopup.alert({title: "<h4 class='center-align'>Username is Required</h4>",
								okText: "Try Again",
								okType: "button-assertive"});
			console.log("Not signed up from sing up call");
		});
	};
});

