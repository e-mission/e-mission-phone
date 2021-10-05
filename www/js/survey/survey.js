'use strict';

angular.module('emission.survey', [
                    "emission.survey.external.launch",
                    "emission.survey.multilabel.buttons",
                    "emission.survey.multilabel.infscrollfilters",
                    ])

.factory("SurveyOptions", function() {
    var surveyoptions = {};
    console.log("This is currently a NOP; we load the individual components dynamically");

    return surveyoptions;
});
