'use strict';

angular.module('emission.main.signup', ['emission.services'])

.controller('SignupCtrl', function($scope, CommHelper, $ionicLoading, $state, $rootScope, $ionicPopup) {
	$scope.user = {}
	
	$scope.signup = function(){
		console.log($scope.user.username);
		var regConfig = {'username': $scope.user.username};
		console.log(regConfig);
		$ionicLoading.show({
			template: 'Loading...'
		});
		CommHelper.habiticaRegister(regConfig, function(response) {
			$ionicLoading.hide();
			$state.go('root.main.goals');
		}, function(error) {
			$ionicLoading.hide();
			$state.go('root.main.goals');
			$ionicPopup.alert({title: "<h4 class='center-align'>Username is Required</h4>",
								okText: "Try Again",
								okType: "button-assertive"});
			console.log(JSON.stringify(error));
		});
	};
});