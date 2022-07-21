/*
*   A directive for the popup to save the OPcode QR code.
*/

angular.module('emission.save-opcode-item', [])

.directive("opcodeshare", function(){
  return{
    //restrict: 'E',
    scope: {
      token: '@',
      alwayssave: '@'
    },
    controller: 'Opcode',
    templateUrl: 'templates/intro/save-opcode-item.html'
  };
})

.controller("Opcode", function(
                            $scope,
                            Opcode
){
  $scope.show = function() {
    Opcode.show($scope, $scope.token, $scope.alwayssave);
  }

  $scope.shareOpcode = function() {
    Opcode.shareOpcode($scope.token);
  }
})

.service("Opcode", function(
                          $ionicPopup,
                          $translate,
                          i18nUtils
){
  var opc = {};
  opc.alreadySaved = false;

  this.show = function($scope, token, alwayssave) {
    $scope.token = token;

    if(alwayssave == "true") {
      opc.alreadySaved = false;
    }
    if(opc.alreadySaved == true) {
      return false;
    }
    const savePopup = $ionicPopup.show({
      template: '<center><qrcode class="col" aria-label="qrcode for user email" data="{{token}}" size="220" download></qrcode></center>'
              + '<div class="col" ng-controller="Opcode" style="height: 150%"><button class="col" style="height: 100%; background-color: #01D0A7" ng-click="shareOpcode({{token}})" class="control-icon-button"> <u>{{token}}</u> </button></div>',
      title: $translate.instant('login.save-your-opcode') + '<br>',
      scope: $scope,
      buttons: [
        {
          text: '<b>' + $translate.instant('login.continue')+ '</b>',
          type: 'button-positive',
          onTap: function(e) {
            opc.alreadySaved = true;
            return true;
          }
        }
      ]
    })
  };

  this.shareOpcode = function(token) {
    var shareOPcodeMessage = {};
    const c = document.getElementsByClassName('qrcode-link');
    const cbase64 = c[0].getAttribute('href');
    shareOPcodeMessage.files = [cbase64];
    shareOPcodeMessage.url = token;

    window.plugins.socialsharing.shareWithOptions(shareOPcodeMessage, function(result) {
      console.log("Share completed? " + result.completed); // On Android apps mostly return false even while it's true
      console.log("Shared to app: " + result.app); // On Android result.app is currently empty. On iOS it's empty when sharing is cancelled (result.completed=false)
    }, function(msg) {
      console.log("Sharing failed with message: " + msg);
    });
  }

  this.reset = function() {
    opc.alreadySaved = false;
  }
});