'use strict';

angular.module('emission.styles', [])

.service('StylesHelper', function($window, $rootScope, $scope) {
	$scope.dark_theme = $rootScope.dark_theme;
	this.listCardClass = function() {
      if ($window.screen.width <= 320) {
        return ($scope.dark_theme)? "list card list-card-dark list-card-sm" : "list card list-card list-card-sm"; 
      } else if ($window.screen.width <= 375) {
        return ($scope.dark_theme)? "list card list-card-dark list-card-md" : "list card list-card list-card-md"; 
      } else {
        return ($scope.dark_theme)? "list card list-card-dark list-card-lg" : "list card list-card list-card-lg"; 
      }
      
    }
});