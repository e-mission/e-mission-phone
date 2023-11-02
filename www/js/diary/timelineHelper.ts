import moment from "moment";
import { getAngularService } from "../angular-react-helper";
import { displayError, logDebug } from "../plugin/logger";
import { getBaseModeByKey, getBaseModeByValue } from "./diaryHelper";
import i18next from "i18next";
import { UserInputEntry } from "../types/diaryTypes";
import { getLabelInputDetails, getLabelInputs } from "../survey/multilabel/confirmHelper";
import { getNotDeletedCandidates, getUniqueEntries } from "../survey/inputMatcher";

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

  let trajectoryColor: string | null;
  if (labeledMode) {
    trajectoryColor = getBaseModeByValue(labeledMode, labelOptions)?.color;
  }

  logDebug("Reading trip's " + trip.locations.length + ' location points at ' + new Date());
  var features = [
    location2GeojsonPoint(trip.start_loc, 'start_place'),
    location2GeojsonPoint(trip.end_loc, 'end_place'),
    ...locations2GeojsonTrajectory(trip, trip.locations, trajectoryColor),
  ];

  const gj = {
    data: {
      id: gjKey,
      type: 'FeatureCollection',
      features: features,
      properties: {
        start_ts: trip.start_ts,
        end_ts: trip.end_ts,
      },
    },
  };
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

/* 'LABELS' are 1:1 - each trip or place has a single label for each label type
  (e.g. 'MODE' and 'PURPOSE' for MULTILABEL configuration, or 'SURVEY' for ENKETO configuration) */
export let unprocessedLabels: { [key: string]: UserInputEntry[] } = {};
/* 'NOTES' are 1:n - each trip or place can have any number of notes */
export let unprocessedNotes: UserInputEntry[] = [];

const getUnprocessedInputQuery = (pipelineRange) => ({
  key: 'write_ts',
  startTs: pipelineRange.end_ts - 10,
  endTs: moment().unix() + 10,
});

function updateUnprocessedInputs(labelsPromises, notesPromises, appConfig) {
  Promise.all([...labelsPromises, ...notesPromises]).then((comboResults) => {
    const labelResults = comboResults.slice(0, labelsPromises.length);
    const notesResults = comboResults.slice(labelsPromises.length).flat(2);
    // fill in the unprocessedLabels object with the labels we just read
    labelResults.forEach((r, i) => {
      if (appConfig.survey_info?.['trip-labels'] == 'ENKETO') {
        unprocessedLabels['SURVEY'] = r;
      } else {
        unprocessedLabels[getLabelInputs()[i]] = r;
      }
    });
    // merge the notes we just read into the existing unprocessedNotes, removing duplicates
    const combinedNotes = [...unprocessedNotes, ...notesResults];
    unprocessedNotes = combinedNotes.filter((note, i, self) =>
      self.findIndex(n => n.metadata.write_ts == note.metadata.write_ts) == i
    );
  });
}

/**
 * @description Gets unprocessed inputs (labels or Enketo responses) that were recorded after the given
 * pipeline range and have not yet been pushed to the server.
 * @param pipelineRange an object with start_ts and end_ts representing the range of time
 *     for which travel data has been processed through the pipeline on the server
*  @param appConfig the app configuration
 * @returns Promise an array with 1) results for labels and 2) results for notes
 */
export async function updateLocalUnprocessedInputs(pipelineRange, appConfig) {
  const BEMUserCache = window['cordova'].plugins.BEMUserCache;
  const tq = getUnprocessedInputQuery(pipelineRange);
  const labelsPromises = keysForLabelInputs(appConfig).map((key) =>
    BEMUserCache.getMessagesForInterval(key, tq, true)
  );
  const notesPromises = keysForNotesInputs(appConfig).map((key) =>
    BEMUserCache.getMessagesForInterval(key, tq, true)
  );
  await updateUnprocessedInputs(labelsPromises, notesPromises, appConfig);
}

/**
 * @description Gets all unprocessed inputs (labels or Enketo responses) that were recorded after the given
 * pipeline range, including those on the phone and that and have been pushed to the server but not yet processed.
 * @param pipelineRange an object with start_ts and end_ts representing the range of time
 *     for which travel data has been processed through the pipeline on the server
 * @param appConfig the app configuration
 * @returns Promise an array with 1) results for labels and 2) results for notes
 */
export async function updateAllUnprocessedInputs(pipelineRange, appConfig) {
  const UnifiedDataLoader = getAngularService('UnifiedDataLoader');
  const tq = getUnprocessedInputQuery(pipelineRange);
  const labelsPromises = keysForLabelInputs(appConfig).map((key) =>
    UnifiedDataLoader.getUnifiedMessagesForInterval(key, tq, true)
  );
  const notesPromises = keysForNotesInputs(appConfig).map((key) =>
    UnifiedDataLoader.getUnifiedMessagesForInterval(key, tq, true)
  );
  await updateUnprocessedInputs(labelsPromises, notesPromises, appConfig);
}

export function keysForLabelInputs(appConfig) {
  if (appConfig.survey_info?.['trip-labels'] == 'ENKETO') {
    return ['manual/trip_user_input'];
  } else {
    return Object.values(getLabelInputDetails(appConfig)).map((inp) => inp.key);
  }
}

function keysForNotesInputs(appConfig) {
  const notesKeys = [];
  if (appConfig.survey_info?.buttons?.['trip-notes'])
    notesKeys.push('manual/trip_addition_input');
  if (appConfig.survey_info?.buttons?.['place-notes'])
    notesKeys.push('manual/place_addition_input');
  return notesKeys;
}

/**
 * @param locationPoint an object containing coordinates as array of [lat, lon]
 * @param featureType a string describing the feature, e.g. "start_place"
 * @returns a GeoJSON feature with type "Point", the given location's coordinates and the given feature type
 */
const location2GeojsonPoint = (locationPoint: any, featureType: string) => ({
  type: 'Feature',
  geometry: {
    type: 'Point',
    coordinates: locationPoint.coordinates,
  },
  properties: {
    feature_type: featureType,
  },
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
      trip.locations.filter((l) => l.ts >= s.start_ts && l.ts <= s.end_ts),
    );
  }

  return sectionsPoints.map((sectionPoints, i) => {
    const section = trip.sections?.[i];
    return {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: sectionPoints.map((pt) => pt.loc.coordinates),
      },
      style: {
        /* If a color was passed as arg, use it for the whole trajectory. Otherwise, use the
          color for the sensed mode of this section, and fall back to dark grey */
        color: trajectoryColor || getBaseModeByKey(section?.sensed_mode_str)?.color || '#333',
      },
    };
  });
};
