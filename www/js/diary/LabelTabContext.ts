import { Dispatch, SetStateAction, createContext } from 'react';
import { TimelineEntry, UserInputEntry } from '../types/diaryTypes';
import { LabelOption } from '../survey/multilabel/confirmHelper';

export type TimelineMap = Map<string, TimelineEntry>;
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
export type CustomLabelKey = {
  [k: string]: string[];
};

type ContextProps = {
  labelOptions: any;
  timelineMap: TimelineMap;
  timelineLabelMap: TimelineLabelMap;
  timelineNotesMap: TimelineNotesMap;
  displayedEntries: TimelineEntry[];
  filterInputs: any; // TODO
  setFilterInputs: any; // TODO
  queriedRange: any; // TODO
  pipelineRange: any; // TODO
  isLoading: string | false;
  loadAnotherWeek: any; // TODO
  loadSpecificWeek: any; // TODO
  refresh: any; // TODO
  repopulateTimelineEntry: any; // TODO
  customLabel: CustomLabelKey;
  setCustomLabel: Dispatch<SetStateAction<CustomLabelKey>>;
};

export default createContext<ContextProps>(null);
