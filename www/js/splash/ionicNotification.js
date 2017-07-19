angular.module('emission.splash.ionicNotification', ['ionic.cloud'])
.factory('ionicNotification', function($state, $rootScope, $ionicPush) {
	var ionicNotification = {};

	ionicNotification.redirectNotification = function() {
		$rootScope.$on('cloud:push:notification', function (event, data) {
			if(angular.isDefined(data.message.payload.redirectTo)) {
					$rootScope.redirectTo = data.message.payload.redirectTo;
			}
		});
	};

	return ionicNotification;
});