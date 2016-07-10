/*'use strict';

angular.module('emission.main.goals.party',['emission.services'])

.controller('PartyCtrl', function(CommHelper, $scope, $ionicModal, $http){

	var callOpts = {'method': 'GET', 'method_url': "/api/v3/user",
                    'method_args': null};
    //callOpts = {'method': 'GET', 'method_url': "/export/avatar-",
    				//'method_args': };

    
	CommHelper.habiticaProxy(callOpts, function(response){
		 $scope.user = response.data;
		 console.log(response.data);
		}, function(error){
			$scope.err = error.data;
			console.log(error);
		});

});*/