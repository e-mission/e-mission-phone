describe('Testing Functions that are declared, but have no code in controller.js', function() {
  beforeEach(module('emission.controllers'));
  
  var $controller;// = function(_$controller_)
  
  beforeEach(inject(function(_$controller_){
    // The injector unwraps the underscores (_) from around the parameter names when matching
    $controller = _$controller_;
  }));
  
  it("RootCtrl takes a scope variable", function() {
    var $scope = {}
    
    var controller = $controller('RootCtrl', { $scope: $scope });
    
  });
  
  it("DashCtrl takes a scope variable", function() {
    var $scope = {}
    
    var controller = $controller('DashCtrl', { $scope: $scope });
    
  });
  
  
});


