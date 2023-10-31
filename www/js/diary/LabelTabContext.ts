import { createContext } from 'react';
import { TimelineEntry, UnprocessedUserInput } from '../types/diaryTypes';
import { LabelOption } from '../survey/multilabel/confirmHelper';

export type TimelineMap = Map<string, TimelineEntry>;
export type TimelineLabelMap = {
  [k: string]: {
    /* if the key here is 'SURVEY', we are in the ENKETO configuration, meaning the user input
      value is a raw survey response */
    SURVEY?: UnprocessedUserInput;
  } & {
    /* all other keys, (e.g. 'MODE', 'PURPOSE') are from the MULTILABEL configuration
      and use a LabelOption for the user input value */
    [k: string]: LabelOption;
  };
};
export type TimelineNotesMap = {
  [k: string]: UnprocessedUserInput[];
};

type ContextProps = {
  labelOptions: any,
  timelineMap: TimelineMap,
  timelineLabelMap: TimelineLabelMap,
  timelineNotesMap: TimelineNotesMap,
  displayedEntries: TimelineEntry[],
  filterInputs: any, // TODO
  setFilterInputs: any, // TODO
  queriedRange: any, // TODO
  pipelineRange: any, // TODO
  isLoading: string|false,
  loadAnotherWeek: any, // TODO
  loadSpecificWeek: any, // TODO
  refresh: any, // TODO
  repopulateTimelineEntry: any, // TODO
};

export default createContext<ContextProps>(null);
