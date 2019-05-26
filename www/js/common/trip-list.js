angular.module("emission.main.common.trip-list", [
    "ui-leaflet",
    "emission.main.common.services",
    "emission.services",
]).controller("CommonTripListCtrl", function ($scope, CommonGraph) {
    console.log("controller CommonListCtrl called");
    $scope.trips = CommonGraph.data.graph.common_trips;
});
