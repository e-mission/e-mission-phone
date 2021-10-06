'use strict';

angular.module('emission.survey', [
                    "emission.survey.verifycheck",
                    "emission.survey.external.launch",
                    "emission.survey.multilabel.buttons",
                    "emission.survey.multilabel.infscrollfilters",
                    ])

.factory("SurveyOptions", function() {
    var surveyoptions = {};
    console.log("This is currently a NOP; we load the individual components dynamically");
    surveyoptions.MULTILABEL = {
        filter: "InfScrollFilters",
        service: "MultiLabelService",
        elementTag: "multilabel"
    }

    return surveyoptions;
})
.directive("linkedsurvey", function($compile) {
    return {
        scope: {
            elementTag:"@",
            trip: "=",
        },
        templateUrl: "templates/survey/wrapper.html",
    };
});
