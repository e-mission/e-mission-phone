angular.module('emission.survey.verifycheck', [])
.directive('verifycheck', function($timeout) {
  return {
    scope: {
        linkedtag: "@",
        trip: "=",
        invokedfrom: "="
    },
    controller: "OneClickButtonCtrl",
    templateUrl: 'templates/survey/multilabel/one-click-button.html'
  };
})
.controller("OneClickButtonCtrl", function($scope, $element, $attrs) {
    var findLinkedLabelScope = function() {
        console.log("$element is ", $element, "linkedtag is ",$scope.linkedTag);
        console.log("parent row is", $element.parents("ion-item"));
        let rowElement = $element.parents("ion-item")
        console.log("row Element is", rowElement);
        let linkedlabel = rowElement.find($scope.linkedtag);
        console.log("child linkedlabel is", linkedlabel);
        let linkedlabelScope = angular.element(linkedlabel).isolateScope();
        console.log("linkedlabel scope is", linkedlabelScope);
        return linkedlabelScope;
    };

    $scope.verifyTrip = function() {
      let linkedLabelScope = findLinkedLabelScope();
      linkedLabelScope.verifyTrip();
    }
});
