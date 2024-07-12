import { displayError } from '../../plugin/logger';
import { SurveyButtonConfig } from '../../types/appConfigTypes';
import { DerivedProperties, TimelineEntry } from '../../types/diaryTypes';
import { Position } from 'geojson';

const conditionalSurveyFunctions = {
  /**
  @description Returns true if the given point is within the given bounds.
    Coordinates are in [longitude, latitude] order, since that is the GeoJSON spec.
  @param pt point to check as [lon, lat]
  @param bounds NW and SE corners as [[lon, lat], [lon, lat]] 
  @returns true if pt is within bounds
  */
  pointIsWithinBounds: (pt: Position, bounds: Position[]) => {
    // pt's lon must be east of, or greater than, NW's lon; and west of, or less than, SE's lon
    const lonInRange = pt[0] > bounds[0][0] && pt[0] < bounds[1][0];
    // pt's lat must be south of, or less than, NW's lat; and north of, or greater than, SE's lat
    const latInRange = pt[1] < bounds[0][1] && pt[1] > bounds[1][1];
    return latInRange && lonInRange;
  },
};

/**
 * @description Executes a JS expression `script` in a restricted `scope`
 * @example scopedEval('console.log(foo)', { foo: 'bar' })
 */
const scopedEval = (script: string, scope: { [k: string]: any }) =>
  Function(...Object.keys(scope), `return ${script}`)(...Object.values(scope));

// the first survey in the list that passes its condition will be returned
export function getSurveyForTimelineEntry(
  possibleSurveys: SurveyButtonConfig[],
  tlEntry: TimelineEntry,
  derivedProperties: DerivedProperties,
) {
  for (let survey of possibleSurveys) {
    if (!survey.showsIf) return survey; // survey shows unconditionally
    const scope = {
      ...tlEntry,
      ...derivedProperties,
      ...conditionalSurveyFunctions,
    };
    try {
      const evalResult = scopedEval(survey.showsIf, scope);
      if (evalResult) return survey;
    } catch (e) {
      displayError(e, `Error evaluating survey condition "${survey.showsIf}"`);
    }
  }
  // TODO if none of the surveys passed conditions?? should we return null, throw error, or return a default?
  return null;
}
