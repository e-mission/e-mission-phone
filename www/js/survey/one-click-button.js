angular.module('emission.survey.verifycheck', [])
.directive('verifycheck', function($timeout) {
  return {
    scope: {
        linkedtag: "@",
        linkedid: "@", // specific ID, if present, simplifies the dom traversal logic
    },
    controller: "OneClickButtonCtrl",
    templateUrl: 'templates/survey/one-click-button.html'
  };
})
.controller("OneClickButtonCtrl", function($scope, $element, $attrs) {
    var findLinkedLabelScope = function() {
        if ($scope.linkedid) {
            let linkedsurveytag = angular.element(document.getElementById($scope.linkedid));
            console.log("matching linkedsurvey with id "+$scope.linkedid+" is ",linkedsurveytag);
            let linkedlabel = linkedsurveytag.find($scope.linkedtag);
            console.log("child linkedlabel is", linkedlabel);
            let linkedlabelScope = angular.element(linkedlabel).isolateScope();
            console.log("linkedlabel scope is", linkedlabelScope);
            return linkedlabelScope;
        } else {
            console.log("$element is ", $element, "linkedtag is ",$scope.linkedtag);
            console.log("parent row is", $element.parents("ion-item"));
            let rowElement = $element.parents("ion-item")
            console.log("row Element is", rowElement);
            let linkedlabel = rowElement.find($scope.linkedtag);
            console.log("child linkedlabel is", linkedlabel);
            let linkedlabelScope = angular.element(linkedlabel).isolateScope();
            console.log("linkedlabel scope is", linkedlabelScope);
            return linkedlabelScope;
        }
    };

    $scope.verifyTrip = function() {
      let linkedLabelScope = findLinkedLabelScope();
      linkedLabelScope.verifyTrip();
    }
});
