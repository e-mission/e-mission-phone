import { displayError, displayErrorMsg, logDebug } from '../plugin/logger';
import { getBaseModeByKey, getBaseModeByValue } from './diaryHelper';
import { getUnifiedDataForInterval } from '../services/unifiedDataLoader';
import { getRawEntries } from '../services/commHelper';
import { ServerResponse, BEMData } from '../types/serverData';
import L, { LatLng } from 'leaflet';
import { DateTime } from 'luxon';
import {
  UserInputEntry,
  TripTransition,
  TimelineEntry,
  GeoJSONData,
  FilteredLocation,
  TimestampRange,
  CompositeTrip,
  UnprocessedTrip,
} from '../types/diaryTypes';
import { getLabelInputDetails, getLabelInputs } from '../survey/multilabel/confirmHelper';
import { LabelOptions } from '../types/labelTypes';
import { EnketoUserInputEntry, filterByNameAndVersion } from '../survey/enketo/enketoHelper';
import { AppConfig } from '../types/appConfigTypes';
import { Point, Feature } from 'geojson';

const cachedGeojsons: Map<string, GeoJSONData> = new Map();

/**
 * @description Gets a formatted GeoJSON object for a trip, including the start and end places and the trajectory.
 */
export function useGeojsonForTrip(
  trip: CompositeTrip,
  labelOptions: LabelOptions,
  labeledMode?: string,
) {
  if (!trip?._id?.$oid) return;
  const gjKey = `trip-${trip._id.$oid}-${labeledMode || 'detected'}`;
  if (cachedGeojsons.has(gjKey)) {
    return cachedGeojsons.get(gjKey);
  }

  const trajectoryColor =
    (labeledMode && getBaseModeByValue(labeledMode, labelOptions)?.color) || undefined;

  logDebug("Reading trip's " + trip.locations.length + ' location points at ' + new Date());
  var features = [
    location2GeojsonPoint(trip.start_loc, 'start_place'),
    location2GeojsonPoint(trip.end_loc, 'end_place'),
    ...locations2GeojsonTrajectory(trip, trip.locations, trajectoryColor),
  ];

  const gj: GeoJSONData = {
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
export function compositeTrips2TimelineMap(ctList: Array<any>, unpackPlaces?: boolean) {
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
export let unprocessedNotes: EnketoUserInputEntry[] = [];

const getUnprocessedInputQuery = (pipelineRange: TimestampRange) => ({
  key: 'write_ts',
  startTs: pipelineRange.end_ts - 10,
  endTs: DateTime.now().toUnixInteger() + 10,
});

/**
 * updateUnprocessedInputs is a helper function for updateLocalUnprocessedInputs
 * and updateAllUnprocessedInputs
 */
function updateUnprocessedInputs(
  labelsPromises: Array<Promise<any>>,
  notesPromises: Array<Promise<any>>,
  appConfig: AppConfig,
) {
  return Promise.all([...labelsPromises, ...notesPromises]).then((comboResults) => {
    const labelResults = comboResults.slice(0, labelsPromises.length);
    const notesResults = comboResults.slice(labelsPromises.length).flat(2);
    // fill in the unprocessedLabels object with the labels we just read
    labelResults.forEach((r, i) => {
      if (appConfig.survey_info?.['trip-labels'] == 'ENKETO') {
        const filtered = filterByNameAndVersion('TripConfirmSurvey', r, appConfig);
        unprocessedLabels['SURVEY'] = filtered as UserInputEntry[];
      } else {
        unprocessedLabels[getLabelInputs()[i]] = r;
      }
    });
    // merge the notes we just read into the existing unprocessedNotes, removing duplicates
    const combinedNotes = [...unprocessedNotes, ...notesResults];
    unprocessedNotes = combinedNotes.filter(
      (note, i, self) => self.findIndex((n) => n.metadata.write_ts == note.metadata.write_ts) == i,
    );
  });
}

/**
 * @description Gets unprocessed inputs (labels or Enketo responses) that were recorded after the given
 * pipeline range and have not yet been pushed to the server.
 * @param pipelineRange an object with start_ts and end_ts representing the range of time
 *     for which travel data has been processed through the pipeline on the server
 *  @param appConfig the app configuration
 */
export async function updateLocalUnprocessedInputs(
  pipelineRange: TimestampRange,
  appConfig: AppConfig,
) {
  const BEMUserCache = window['cordova'].plugins.BEMUserCache;
  const tq = getUnprocessedInputQuery(pipelineRange);
  const labelsPromises = keysForLabelInputs(appConfig).map((key) =>
    BEMUserCache.getMessagesForInterval(key, tq, true),
  );
  const notesPromises = keysForNotesInputs(appConfig).map((key) =>
    BEMUserCache.getMessagesForInterval(key, tq, true),
  );
  await updateUnprocessedInputs(labelsPromises, notesPromises, appConfig);
}

/**
 * @description Gets all unprocessed inputs (labels or Enketo responses) that were recorded after the given
 * pipeline range, including those on the phone and that and have been pushed to the server but not yet processed.
 * @param pipelineRange an object with start_ts and end_ts representing the range of time
 *     for which travel data has been processed through the pipeline on the server
 * @param appConfig the app configuration
 */
export async function updateAllUnprocessedInputs(
  pipelineRange: TimestampRange,
  appConfig: AppConfig,
) {
  const tq = getUnprocessedInputQuery(pipelineRange);
  const getMethod = window['cordova'].plugins.BEMUserCache.getMessagesForInterval;
  const labelsPromises = keysForLabelInputs(appConfig).map((key) =>
    getUnifiedDataForInterval(key, tq, getMethod),
  );
  const notesPromises = keysForNotesInputs(appConfig).map((key) =>
    getUnifiedDataForInterval(key, tq, getMethod),
  );
  await updateUnprocessedInputs(labelsPromises, notesPromises, appConfig);
}

export function keysForLabelInputs(appConfig: AppConfig) {
  if (appConfig.survey_info?.['trip-labels'] == 'ENKETO') {
    return ['manual/trip_user_input'];
  } else {
    return Object.values(getLabelInputDetails(appConfig)).map((inp) => inp.key);
  }
}

function keysForNotesInputs(appConfig: AppConfig) {
  const notesKeys: string[] = [];
  if (appConfig.survey_info?.buttons?.['trip-notes']) notesKeys.push('manual/trip_addition_input');
  if (appConfig.survey_info?.buttons?.['place-notes'])
    notesKeys.push('manual/place_addition_input');
  return notesKeys;
}

/**
 * @param locationPoint an object containing coordinates as array of [lat, lon]
 * @param featureType a string describing the feature, e.g. "start_place"
 * @returns a GeoJSON feature with type "Point", the given location's coordinates and the given feature type
 */
const location2GeojsonPoint = (locationPoint: Point, featureType: string): Feature => ({
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
const locations2GeojsonTrajectory = (
  trip: CompositeTrip,
  locationList: Array<Point>,
  trajectoryColor?: string,
) => {
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

// DB entries retrieved from the server have '_id', 'metadata', and 'data' fields.
// This function returns a shallow copy of the obj, which flattens the
// 'data' field into the top level, while also including '_id' and 'metadata.key'
const unpackServerData = (obj: BEMData<any>) => ({
  ...obj.data,
  _id: obj._id,
  key: obj.metadata.key,
  origin_key: obj.metadata.origin_key || obj.metadata.key,
});

export function readAllCompositeTrips(startTs: number, endTs: number) {
  const readPromises = [getRawEntries(['analysis/composite_trip'], startTs, endTs, 'data.end_ts')];
  return Promise.all(readPromises)
    .then(([ctList]: [ServerResponse<TimelineEntry>]) => {
      return ctList.phone_data.map((ct) => {
        const unpackedCt = unpackServerData(ct);
        return {
          ...unpackedCt,
          start_confirmed_place: unpackServerData(unpackedCt.start_confirmed_place),
          end_confirmed_place: unpackServerData(unpackedCt.end_confirmed_place),
          locations: unpackedCt.locations?.map(unpackServerData),
          sections: unpackedCt.sections?.map(unpackServerData),
        };
      });
    })
    .catch((err) => {
      displayError(err, 'while reading confirmed trips');
      return [];
    });
}
const dateTime2localdate = function (currtime: DateTime, tz: string) {
  return {
    timezone: tz,
    year: currtime.year,
    month: currtime.month,
    day: currtime.day,
    weekday: currtime.weekday,
    hour: currtime.hour,
    minute: currtime.minute,
    second: currtime.second,
  };
};

const points2TripProps = function (locationPoints: Array<BEMData<FilteredLocation>>) {
  const startPoint = locationPoints[0];
  const endPoint = locationPoints[locationPoints.length - 1];
  const tripAndSectionId = `unprocessed_${startPoint.data.ts}_${endPoint.data.ts}`;
  const startTime = DateTime.fromSeconds(startPoint.data.ts).setZone(startPoint.metadata.time_zone);
  const endTime = DateTime.fromSeconds(endPoint.data.ts).setZone(endPoint.metadata.time_zone);

  const speeds: number[] = [];
  const dists: number[] = [];
  let loc, locLatLng: LatLng;
  locationPoints.forEach((pt) => {
    const ptLatLng = L.latLng([pt.data.latitude, pt.data.longitude]);
    if (loc) {
      const dist = locLatLng.distanceTo(ptLatLng);
      const timeDelta = pt.data.ts - loc.data.ts;
      dists.push(dist);
      speeds.push(dist / timeDelta);
    }
    loc = pt;
    locLatLng = ptLatLng;
  });

  const locations = locationPoints.map((point, i) => ({
    loc: {
      coordinates: [point.data.longitude, point.data.latitude],
    },
    ts: point.data.ts,
    speed: speeds[i],
  }));

  return {
    _id: { $oid: tripAndSectionId },
    key: 'UNPROCESSED_trip',
    origin_key: 'UNPROCESSED_trip',
    additions: [],
    confidence_threshold: 0,
    distance: dists.reduce((a, b) => a + b, 0),
    duration: endPoint.data.ts - startPoint.data.ts,
    end_fmt_time: endTime.toISO() || displayErrorMsg('end_fmt_time: invalid DateTime') || '',
    end_local_dt: dateTime2localdate(endTime, endPoint.metadata.time_zone),
    end_ts: endPoint.data.ts,
    expectation: { to_label: true },
    inferred_labels: [],
    locations: locations,
    source: 'unprocessed',
    start_fmt_time: startTime.toISO() || displayErrorMsg('start_fmt_time: invalid DateTime') || '',
    start_local_dt: dateTime2localdate(startTime, startPoint.metadata.time_zone),
    start_ts: startPoint.data.ts,
    user_input: {},
  };
};

const tsEntrySort = function (e1: BEMData<FilteredLocation>, e2: BEMData<FilteredLocation>) {
  // compare timestamps
  return e1.data.ts - e2.data.ts;
};

function transitionTrip2TripObj(trip: Array<any>): Promise<UnprocessedTrip | undefined> {
  const tripStartTransition = trip[0];
  const tripEndTransition = trip[1];
  const tq = {
    key: 'write_ts',
    startTs: tripStartTransition.data.ts,
    endTs: tripEndTransition.data.ts,
  };
  logDebug(
    'About to pull location data for range ' +
      DateTime.fromSeconds(tripStartTransition.data.ts).toLocaleString(DateTime.DATETIME_MED) +
      ' to ' +
      DateTime.fromSeconds(tripEndTransition.data.ts).toLocaleString(DateTime.DATETIME_MED),
  );
  const getSensorData = window['cordova'].plugins.BEMUserCache.getSensorDataForInterval;
  return getUnifiedDataForInterval('background/filtered_location', tq, getSensorData).then(
    function (locationList: Array<BEMData<FilteredLocation>>) {
      if (locationList.length == 0) {
        return undefined;
      }
      const sortedLocationList = locationList.sort(tsEntrySort);
      const retainInRange = function (loc) {
        return (
          tripStartTransition.data.ts <= loc.data.ts && loc.data.ts <= tripEndTransition.data.ts
        );
      };

      const filteredLocationList = sortedLocationList.filter(retainInRange);

      // Fix for https://github.com/e-mission/e-mission-docs/issues/417
      if (filteredLocationList.length == 0) {
        return undefined;
      }

      const tripStartPoint = filteredLocationList[0];
      const tripEndPoint = filteredLocationList[filteredLocationList.length - 1];
      logDebug(
        'tripStartPoint = ' +
          JSON.stringify(tripStartPoint) +
          'tripEndPoint = ' +
          JSON.stringify(tripEndPoint),
      );
      // if we get a list but our start and end are undefined
      // let's print out the complete original list to get a clue
      // this should help with debugging
      // https://github.com/e-mission/e-mission-docs/issues/417
      // if it ever occurs again
      if (tripStartPoint === undefined || tripEndPoint === undefined) {
        logDebug('BUG 417 check: locationList = ' + JSON.stringify(locationList));
        logDebug(
          'transitions: start = ' +
            JSON.stringify(tripStartTransition.data) +
            ' end = ' +
            JSON.stringify(tripEndTransition.data.ts),
        );
      }

      const tripProps = points2TripProps(filteredLocationList);

      return {
        ...tripProps,
        start_loc: {
          type: 'Point',
          coordinates: [tripStartPoint.data.longitude, tripStartPoint.data.latitude],
        },
        end_loc: {
          type: 'Point',
          coordinates: [tripEndPoint.data.longitude, tripEndPoint.data.latitude],
        },
      };
    },
  );
}
const isStartingTransition = function (transWrapper: BEMData<TripTransition>) {
  if (
    transWrapper.data.transition == 'local.transition.exited_geofence' ||
    transWrapper.data.transition == 'T_EXITED_GEOFENCE' ||
    transWrapper.data.transition == 1
  ) {
    return true;
  }
  return false;
};

const isEndingTransition = function (transWrapper: BEMData<TripTransition>) {
  // Logger.log("isEndingTransition: transWrapper.data.transition = "+transWrapper.data.transition);
  if (
    transWrapper.data.transition == 'T_TRIP_ENDED' ||
    transWrapper.data.transition == 'local.transition.stopped_moving' ||
    transWrapper.data.transition == 2
  ) {
    // Logger.log("Returning true");
    return true;
  }
  // Logger.log("Returning false");
  return false;
};
/*
 * This is going to be a bit tricky. As we can see from
 * https://github.com/e-mission/e-mission-phone/issues/214#issuecomment-286279163,
 * when we read local transitions, they have a string for the transition
 * (e.g. `T_DATA_PUSHED`), while the remote transitions have an integer
 * (e.g. `2`).
 * See https://github.com/e-mission/e-mission-phone/issues/214#issuecomment-286338606
 *
 * Also, at least on iOS, it is possible for trip end to be detected way
 * after the end of the trip, so the trip end transition of a processed
 * trip may actually show up as an unprocessed transition.
 * See https://github.com/e-mission/e-mission-phone/issues/214#issuecomment-286279163
 *
 * Let's abstract this out into our own minor state machine.
 */
const transitions2Trips = function (transitionList: Array<BEMData<TripTransition>>) {
  let inTrip = false;
  const tripList: [BEMData<TripTransition>, BEMData<TripTransition>][] = [];
  let currStartTransitionIndex = -1;
  let currEndTransitionIndex = -1;
  let processedUntil = 0;

  while (processedUntil < transitionList.length) {
    // Logger.log("searching within list = "+JSON.stringify(transitionList.slice(processedUntil)));
    if (inTrip == false) {
      const foundStartTransitionIndex = transitionList
        .slice(processedUntil)
        .findIndex(isStartingTransition);
      if (foundStartTransitionIndex == -1) {
        logDebug('No further unprocessed trips started, exiting loop');
        processedUntil = transitionList.length;
      } else {
        currStartTransitionIndex = processedUntil + foundStartTransitionIndex;
        processedUntil = currStartTransitionIndex;
        logDebug(
          'Unprocessed trip started at ' + JSON.stringify(transitionList[currStartTransitionIndex]),
        );
        inTrip = true;
      }
    } else {
      const foundEndTransitionIndex = transitionList
        .slice(processedUntil)
        .findIndex(isEndingTransition);
      if (foundEndTransitionIndex == -1) {
        logDebug(
          "Can't find end for trip starting at " +
            JSON.stringify(transitionList[currStartTransitionIndex]) +
            ' dropping it',
        );
        processedUntil = transitionList.length;
      } else {
        currEndTransitionIndex = processedUntil + foundEndTransitionIndex;
        processedUntil = currEndTransitionIndex;
        logDebug(`currEndTransitionIndex ${currEndTransitionIndex}`);
        logDebug(
          'Unprocessed trip starting at ' +
            JSON.stringify(transitionList[currStartTransitionIndex]) +
            ' ends at ' +
            JSON.stringify(transitionList[currEndTransitionIndex]),
        );
        tripList.push([
          transitionList[currStartTransitionIndex],
          transitionList[currEndTransitionIndex],
        ]);
        inTrip = false;
      }
    }
  }
  return tripList;
};

const linkTrips = function (trip1, trip2) {
  // complete trip1
  trip1.starting_trip = { $oid: trip2.id };
  trip1.exit_fmt_time = trip2.enter_fmt_time;
  trip1.exit_local_dt = trip2.enter_local_dt;
  trip1.exit_ts = trip2.enter_ts;

  // start trip2
  trip2.ending_trip = { $oid: trip1.id };
  trip2.enter_fmt_time = trip1.exit_fmt_time;
  trip2.enter_local_dt = trip1.exit_local_dt;
  trip2.enter_ts = trip1.exit_ts;
};

export function readUnprocessedTrips(
  startTs: number,
  endTs: number,
  lastProcessedTrip?: CompositeTrip,
) {
  const tq = { key: 'write_ts', startTs, endTs };
  logDebug(
    'about to query for unprocessed trips from ' +
      DateTime.fromSeconds(tq.startTs).toLocaleString(DateTime.DATETIME_MED) +
      DateTime.fromSeconds(tq.endTs).toLocaleString(DateTime.DATETIME_MED),
  );
  const getMessageMethod = window['cordova'].plugins.BEMUserCache.getMessagesForInterval;
  return getUnifiedDataForInterval('statemachine/transition', tq, getMessageMethod).then(function (
    transitionList: Array<BEMData<TripTransition>>,
  ) {
    if (transitionList.length == 0) {
      logDebug('No unprocessed trips. yay!');
      return [];
    } else {
      logDebug(`Found ${transitionList.length} transitions. yay!`);
      const tripsList = transitions2Trips(transitionList);
      logDebug(`Mapped into ${tripsList.length} trips. yay!`);
      tripsList.forEach(function (trip) {
        logDebug(JSON.stringify(trip, null, 2));
      });
      const tripFillPromises = tripsList.map(transitionTrip2TripObj);
      return Promise.all(tripFillPromises).then((rawTripObjs: (UnprocessedTrip | undefined)[]) => {
        // Now we need to link up the trips. linking unprocessed trips
        // to one another is fairly simple, but we need to link the
        // first unprocessed trip to the last processed trip.
        // This might be challenging if we don't have any processed
        // trips for the day. I don't want to go back forever until
        // I find a trip. So if this is the first trip, we will start a
        // new chain for now, since this is with unprocessed data
        // anyway.

        logDebug(`mapping trips to tripObjs of size ${rawTripObjs.length}`);
        /* Filtering: we will keep trips that are 1) defined and 2) have a distance >= 100m,
          or duration >= 5 minutes
          https://github.com/e-mission/e-mission-docs/issues/966#issuecomment-1709112578 */
        const tripObjs = rawTripObjs.filter(
          (trip) => trip && (trip.distance >= 100 || trip.duration >= 300),
        );
        logDebug(`after filtering undefined and distance < 100m, 
          tripObjs size = ${tripObjs.length}`);
        // Link 0th trip to first, first to second, ...
        for (let i = 0; i < tripObjs.length - 1; i++) {
          linkTrips(tripObjs[i], tripObjs[i + 1]);
        }
        logDebug(`finished linking trips for list of size ${tripObjs.length}`);
        if (lastProcessedTrip && tripObjs.length != 0) {
          // Need to link the entire chain above to the processed data
          logDebug('linking unprocessed and processed trip chains');
          linkTrips(lastProcessedTrip, tripObjs[0]);
        }
        logDebug(`Returning final list of size ${tripObjs.length}`);
        return tripObjs;
      });
    }
  });
}
