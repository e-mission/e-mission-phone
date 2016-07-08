'use strict';

angular.module('emission.main.signup', ['emission.services'])

.controller('SignupCtrl', function($scope, CommHelper, $ionicLoading, $state, $rootScope,$ionicPopup) {
	var regConfig = {'username': $scope.username};

	$scope.signup = function(){
		console.log(regConfig);
		$ionicLoading.show({
			template: 'Loading...'
		});
		CommHelper.habiticaRegister(regConfig, function(response) {
			$state.go("root.main.goals");
		}, function(error) {
			$ionicLoading.hide();
			$ionicPopup.alert({title: "<h4 class='center-align'>Username is Required</h4>",
								okText: "Try Again",
								okType: "button-assertive"});
			console.log(JSON.stringify(error));
		});
	};
});