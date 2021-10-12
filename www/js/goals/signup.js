/*'use strict';

angular.module('emission.main.signup', ['emission.services'])

/*.run(function($ionicPlatform, $rootScope, SignUpCheck) {

  SignUpCheck.userCheck()
    .then(function(user) {
      $rootScope.user = user;
    })
    */

/*.controller('SignupCtrl', function($scope, CommHelper, $ionicLoading, $state, $rootScope, $ionicPopup) {
	$scope.theUser = {}

	$scope.signup = function(){
		console.log($scope.theUser.username);
		var regConfig = {'username': $scope.theUser.username};
		console.log(regConfig);
		$ionicLoading.show({
			template: 'Loading...'
		});
		CommHelper.habiticaRegister(regConfig, function(response) {
			$state.go('root.main.goals');
			console.log("Success!")
			$rootScope.screen = response.success;
			console.log(response);
			$ionicLoading.hide();
		}, function(error) {
			$ionicLoading.hide();
			$ionicPopup.alert({title: "<h4 class='center-align'>Username is Required</h4>",
								okText: "Try Again",
								okType: "button-assertive"});
			console.log(JSON.stringify(error));
		});
	};
});

/*.factory('SignUpCheck', function(GoalsCtrl, $q) {
  return {
    userCheck : function() {
      var q = $q.defer()
      var theUser = GoalsCtrl.getUser();
      if(user === undefined){
        q.resolve(false);
      } else {
        q.resolve(user);
      }, function(error) {
        q.reject();
      }
      return q.promise;
    }
  }
});*/
