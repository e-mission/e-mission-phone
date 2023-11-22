import { createContext } from 'react';
import { TimelineEntry, UserInputEntry } from '../types/diaryTypes';
import { LabelOption, LabelOptions } from '../types/labelTypes';

export type TimelineMap = Map<string, TimelineEntry>; // Todo: update to reflect unpacked trips (origin_Key, etc)
export type TimelineLabelMap = {
  [k: string]: {
    /* if the key here is 'SURVEY', we are in the ENKETO configuration, meaning the user input
      value is a raw survey response */
    SURVEY?: UserInputEntry;
    /* all other keys, (e.g. 'MODE', 'PURPOSE') are from the MULTILABEL configuration
      and use a LabelOption for the user input value */
    MODE?: LabelOption;
    PURPOSE?: LabelOption;
    REPLACED_MODE?: LabelOption;
  };
};
export type TimelineNotesMap = {
  [k: string]: UserInputEntry[];
};

type ContextProps = {
  labelOptions: LabelOptions | null;
  timelineMap: TimelineMap | null;
  timelineLabelMap: TimelineLabelMap | null;
  timelineNotesMap: TimelineNotesMap | null;
  displayedEntries: TimelineEntry[] | null;
  filterInputs: any; // TODO
  setFilterInputs: any; // TODO
  queriedRange: any; // TODO
  pipelineRange: any; // TODO
  isLoading: string | false;
  loadAnotherWeek: any; // TODO
  loadSpecificWeek: any; // TODO
  refresh: any; // TODO
  repopulateTimelineEntry: any; // TODO
};

export default createContext<ContextProps>({} as ContextProps);
