'use strict';

angular.module('emission.main.signup', ['emission.services'])

.controller('SignupCtrl', function($scope, CommHelper, $ionicLoading, $state, $rootScope, $ionicPopup) {
	var theUser = $scope.username;
	var regConfig = {'username': theUser};

	$scope.signup = function(){
		console.log(regConfig);
		$ionicLoading.show({
			template: 'Loading...'
		});
		CommHelper.habiticaRegister(regConfig, function(response) {
			$ionicLoading.hide();
			$state.go("root.main.goals");
		}, function(error) {
			$ionicLoading.hide();
			$state.go("root.main.goals");
			$ionicPopup.alert({title: "<h4 class='center-align'>Username is Required</h4>",
								okText: "Try Again",
								okType: "button-assertive"});
			console.log(JSON.stringify(error));
		});
	};
});