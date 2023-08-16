'use strict';

import angular from 'angular';

import UserInputButton from './enketo/UserInputButton';

angular.module('emission.survey', [
                    "emission.survey.external.launch",
                    "emission.survey.multilabel.buttons",
                    "emission.survey.multilabel.infscrollfilters",
                    "emission.survey.enketo.add-note-button",
                    "emission.survey.enketo.trip.infscrollfilters",
                    UserInputButton.module,
                    ])

.factory("SurveyOptions", function() {
    var surveyoptions = {};
    console.log("This is currently a NOP; we load the individual components dynamically");
    surveyoptions.MULTILABEL = {
        filter: "MultiLabelInfScrollFilters",
        service: "MultiLabelService",
        elementTag: "multilabel"
    }
    surveyoptions.ENKETO = {
        filter: "EnketoTripInfScrollFilters",
        service: "EnketoTripButtonService",
        elementTag: "enketo-trip-button"
    }

    return surveyoptions;
})
.directive("linkedsurvey", function($compile) {
    return {
        scope: {
            elementTag:"@",
            timelineEntry: "=",
            recomputedelay: "@",
        },
        templateUrl: "templates/survey/wrapper.html",
    };
});
