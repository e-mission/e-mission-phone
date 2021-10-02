angular.module('emission.tripconfirm.verifycheck',
    ['emission.tripconfirm.services',
        'emission.main.diary.services'])
.directive('verifycheck', function($timeout) {
  return {
    scope: {
    },
    link: function(scope, element, attrs, controllers) {
        element.on('click', function(event) {
            console.log("element is ", element);
            console.log("parent row is", element.parents("ion-item"));
            let rowElement = element.parents("ion-item")
            console.log("row Element is", rowElement);
            let multilabel = rowElement.find("multilabel");
            console.log("child multilabel is", multilabel);
            let multilabelScope = angular.element(multilabel).isolateScope();
            console.log("multilabel scope is", multilabelScope);
        });
    },
    template: 'VC'
  };
})
