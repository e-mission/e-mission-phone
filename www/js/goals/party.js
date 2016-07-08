/*'use strict';

angular.module('emission.main.goals.party',[])

.controller('PartyCtrl', function($scope, $ionicModal, $http){

	var UUID= '4f369eef-aed4-4408-bcbf-b34896daf7e3';

	$http.get('https://habitica.com/api/v3/members/'+ UUID)
	.then(function(response){
		$scope.user = response.data;
		//console.log(response.data);
	},function(err){
		$scope.error = err.data;
		console.log($scope.error);
	});
});
*/