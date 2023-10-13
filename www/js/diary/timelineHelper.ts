import moment from "moment";
import { displayError, logDebug } from "../plugin/logger";
import { getBaseModeByKey, getBaseModeOfLabeledTrip } from "./diaryHelper";
import { getUnifiedDataForInterval} from "../unifiedDataLoader";
import i18next from "i18next";

const cachedGeojsons = new Map();
/**
 * @description Gets a formatted GeoJSON object for a trip, including the start and end places and the trajectory.
 */
export function useGeojsonForTrip(trip, labelOptions, labeledMode?) {
  if (!trip) return;
  const gjKey = `trip-${trip._id.$oid}-${labeledMode || 'detected'}`;
  if (cachedGeojsons.has(gjKey)) {
    return cachedGeojsons.get(gjKey);
  }

  let trajectoryColor: string|null;
  if (labeledMode) {
    trajectoryColor = getBaseModeOfLabeledTrip(trip, labelOptions)?.color;
  }

  logDebug("Reading trip's " + trip.locations.length + " location points at " + (new Date()));
  var features = [
    location2GeojsonPoint(trip.start_loc, "start_place"),
    location2GeojsonPoint(trip.end_loc, "end_place"),
    ...locations2GeojsonTrajectory(trip, trip.locations, trajectoryColor)
  ];

  const gj = {
    data: {
      id: gjKey,
      type: "FeatureCollection",
      features: features,
      properties: {
        start_ts: trip.start_ts,
        end_ts: trip.end_ts
      }
    }
  }
  cachedGeojsons.set(gjKey, gj);
  return gj;
}

/**
 * @description Unpacks composite trips into a Map object of timeline items, by id.
 *        The Map object is used here because 1) it is ordered, and 2) it prevents duplicate keys --
 *         this way trip A's end place is not duplicated as trip B's start place.
 * @param ctList a list of composite trips
 * @param unpackPlaces whether to unpack the start and end places of each composite trip into the Map
 * @returns a Map() of timeline items, by id
 */
export function compositeTrips2TimelineMap(ctList: any[], unpackPlaces?: boolean) {
  const timelineEntriesMap = new Map();
  ctList.forEach((cTrip) => {
    if (unpackPlaces) {
      const start_place = cTrip.start_confirmed_place;
      const end_place = cTrip.end_confirmed_place;
      if (start_place && (isNaN(start_place.duration) || start_place.duration >= 60)) {
        timelineEntriesMap.set(start_place._id.$oid, start_place);
      }
      timelineEntriesMap.set(cTrip._id.$oid, cTrip);
      if (end_place && (isNaN(end_place.duration) || end_place.duration >= 60)) {
        timelineEntriesMap.set(end_place._id.$oid, end_place);
      }
    } else {
      timelineEntriesMap.set(cTrip._id.$oid, cTrip);
    }
  });
  return timelineEntriesMap;
}

export function populateCompositeTrips(ctList, showPlaces, labelsFactory, labelsResultMap, notesFactory, notesResultMap) {
  try {
    ctList.forEach((ct, i) => {
      if (showPlaces && ct.start_confirmed_place) {
        const cp = ct.start_confirmed_place;
        cp.getNextEntry = () => ctList[i];
        labelsFactory.populateInputsAndInferences(cp, labelsResultMap);
        notesFactory.populateInputsAndInferences(cp, notesResultMap);
      }
      if (showPlaces && ct.end_confirmed_place) {
        const cp = ct.end_confirmed_place;
        cp.getNextEntry = () => ctList[i + 1];
        labelsFactory.populateInputsAndInferences(cp, labelsResultMap);
        notesFactory.populateInputsAndInferences(cp, notesResultMap);
        ct.getNextEntry = () => cp;
      } else {
        ct.getNextEntry = () => ctList[i + 1];
      }
      labelsFactory.populateInputsAndInferences(ct, labelsResultMap);
      notesFactory.populateInputsAndInferences(ct, notesResultMap);
    });
  } catch (e) {
    displayError(e, i18next.t('errors.while-populating-composite'));
  }
}

const getUnprocessedInputQuery = (pipelineRange) => ({
  key: "write_ts",
  startTs: pipelineRange.end_ts - 10,
  endTs: moment().unix() + 10
});

function getUnprocessedResults(labelsFactory, notesFactory, labelsPromises, notesPromises) {
  return Promise.all([...labelsPromises, ...notesPromises]).then((comboResults) => {
    const labelsConfirmResults = {};
    const notesConfirmResults = {};
    const labelResults = comboResults.slice(0, labelsPromises.length);
    const notesResults = comboResults.slice(labelsPromises.length);
    labelsFactory.processManualInputs(labelResults, labelsConfirmResults);
    notesFactory.processManualInputs(notesResults, notesConfirmResults);
    return [labelsConfirmResults, notesConfirmResults];
  });
}

/**
 * @description Gets unprocessed inputs (labels or Enketo responses) that were recorded after the given
 * pipeline range and have not yet been pushed to the server.
 * @param pipelineRange an object with start_ts and end_ts representing the range of time
 *     for which travel data has been processed through the pipeline on the server
 * @param labelsFactory the Angular factory for processing labels (MultilabelService or
 *     EnketoTripButtonService)
 * @param notesFactory the Angular factory for processing notes (EnketoNotesButtonService)
 * @returns Promise an array with 1) results for labels and 2) results for notes
 */
export function getLocalUnprocessedInputs(pipelineRange, labelsFactory, notesFactory) {
  const BEMUserCache = window['cordova'].plugins.BEMUserCache;
  const tq = getUnprocessedInputQuery(pipelineRange);
  const labelsPromises = labelsFactory.MANUAL_KEYS.map((key) =>
    BEMUserCache.getMessagesForInterval(key, tq, true).then(labelsFactory.extractResult)
  );
  const notesPromises = notesFactory.MANUAL_KEYS.map((key) =>
    BEMUserCache.getMessagesForInterval(key, tq, true).then(notesFactory.extractResult)
  );
  return getUnprocessedResults(labelsFactory, notesFactory, labelsPromises, notesPromises);
}

/**
 * @description Gets all unprocessed inputs (labels or Enketo responses) that were recorded after the given
 * pipeline range, including those on the phone and that and have been pushed to the server but not yet processed.
 * @param pipelineRange an object with start_ts and end_ts representing the range of time
 *     for which travel data has been processed through the pipeline on the server
 * @param labelsFactory the Angular factory for processing labels (MultilabelService or
 *     EnketoTripButtonService)
 * @param notesFactory the Angular factory for processing notes (EnketoNotesButtonService)
 * @returns Promise an array with 1) results for labels and 2) results for notes
 */
export function getAllUnprocessedInputs(pipelineRange, labelsFactory, notesFactory) {
  const tq = getUnprocessedInputQuery(pipelineRange);
  const getMethod = window['cordova'].plugins.BEMUserCache.getMessagesForInterval;
  
  const labelsPromises = labelsFactory.MANUAL_KEYS.map((key) => 
    getUnifiedDataForInterval(key, tq, getMethod).then(labelsFactory.extractResult)
  );
  const notesPromises = notesFactory.MANUAL_KEYS.map((key) => 
    getUnifiedDataForInterval(key, tq, getMethod).then(notesFactory.extractResult)
  );
  return getUnprocessedResults(labelsFactory, notesFactory, labelsPromises, notesPromises);
}

/**
 * @param locationPoint an object containing coordinates as array of [lat, lon]
 * @param featureType a string describing the feature, e.g. "start_place"
 * @returns a GeoJSON feature with type "Point", the given location's coordinates and the given feature type
 */
const location2GeojsonPoint = (locationPoint: any, featureType: string) => ({
  type: "Feature",
  geometry: {
    type: "Point",
    coordinates: locationPoint.coordinates,
  },
  properties: {
    feature_type: featureType,
  }
});

/**
 * @param trip
 * @param locationList an array of locations to use for the trajectory.
 * @param trajectoryColor The color to use for the whole trajectory, if any. Otherwise, a color will be lookup up for the sensed mode of each section.
 * @returns for each section of the trip, a GeoJSON feature with type "LineString" and an array of coordinates.
 */
const locations2GeojsonTrajectory = (trip, locationList, trajectoryColor?) => {
  let sectionsPoints;
  if (!trip.sections) {
    // this is a unimodal trip so we put all the locations in one section
    sectionsPoints = [locationList];
  } else {
    // this is a multimodal trip so we sort the locations into sections by timestamp
    sectionsPoints = trip.sections.map((s) =>
      trip.locations.filter((l) =>
        l.ts >= s.start_ts && l.ts <= s.end_ts
      )
    );
  }

  return sectionsPoints.map((sectionPoints, i) => {
    const section = trip.sections?.[i];
    return {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: sectionPoints.map((pt) => pt.loc.coordinates),
      },
      style: {
        /* If a color was passed as arg, use it for the whole trajectory. Otherwise, use the
          color for the sensed mode of this section, and fall back to dark grey */
        color: trajectoryColor || getBaseModeByKey(section?.sensed_mode_str)?.color || "#333",
      },
    }
  });
}
