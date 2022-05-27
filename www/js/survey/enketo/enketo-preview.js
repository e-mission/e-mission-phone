angular.module('emission.survey.enketo.preview',
    ['emission.stats.clientstats'])
.directive('enketoSurveyPreview', function() {
  return {
    scope: {
        surveyResult: "="
    },
    controller: "EnketoSurveyPreviewCtrl",
    templateUrl: 'templates/survey/enketo/preview.html'
  };
})
.controller("EnketoSurveyPreviewCtrl", function($scope, $element, $attrs,
    ClientStats) {
  console.log("Invoked enketo directive controller for showing survey preview with ", $scope.surveyResult);
  $scope.appendNonZeroEntries = function(jsonNode) {
    console.log("Appending non-zero entries from ", jsonNode);
      /*
        Consider a JSON object of type

        $: {xmlns:jr: "http://openrosa.org/javarosa", xmlns:odk: "http://www.opendatakit.org/xforms", xmlns:orx: "http://openrosa.org/xforms", id: "snapshot_xml"}
        deviceid: "deviceid not found"
        end: "2022-05-22T10:34:11.435-07:00"
        group_lm5fq00: {$: {}, num_vehicles: "0", driver_licence: "no", drive: "", Vehicle_year: "", …}
        group_my6jo52: {$: {}, hh_size: "1", num_workers: "0", num_adults: "0", num_kids: "1"}
        group_uy6od86: {$: {}, age: "5_minus", gender: "others", home_location_001: "MiMi", employment: "not_currently_", …}
        meta: {$: {}, instanceID: "uuid:314620a5-2dba-4db1-99d8-e73c47bc71bc"}
        start: "2022-05-12T16:59:48.286-07:00"
        today: "2022-05-11"
      */
      Object.keys(jsonNode).forEach((key, index) => {
        let currVal = jsonNode[key];
        console.log("Iterating over "+key+" at "+index+" type "+typeof(currVal)+" length "+currVal.length);
        console.log("Checks are "+(currVal instanceof String)+" && "+(currVal.length > 0));

        if (key === "$") {
        /* if this is similar to
            $: {xmlns:jr: "http://openrosa.org/javarosa", xmlns:odk: "http://www.opendatakit.org/xforms", xmlns:orx: "http://openrosa.org/xforms", id: "snapshot_xml"}
           we ignore */
            console.log("Ignoring namespaces "+currVal);
        } else {
            // make sure to use typeof instead of instanceof since instanceof does not work
            // properly with literal strings
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/instanceof#using_instanceof_with_string
            if ((typeof(currVal) == "string") && (currVal.length > 0)) {
                // if this is similar to 'today: "2022-05-11"'
                console.log("Found string value, appending ", key, " -> ", currVal);
                $scope.nonZeroEntries.push({key: key, value: currVal});
            }
            if (typeof(currVal) == "object") {
                /* if this is similar to
                   group_uy6od86: {$: {}, age: "5_minus", gender: "others",
                   we recurse */
                console.log("Found object value, recursing on ", key, " -> ", currVal);
                $scope.appendNonZeroEntries(currVal);
            }
        }
      });
  }
  $scope.setupNonZeroEntries = function(rootNode) {
    $scope.nonZeroEntries = [];
    $scope.appendNonZeroEntries(rootNode);
  }
  $scope.resultJSON = $.xml2json($scope.surveyResult.data.xmlResponse);
  $scope.setupNonZeroEntries($scope.resultJSON);
});
