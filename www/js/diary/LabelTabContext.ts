import { createContext } from 'react';
import { TimelineEntry, TimestampRange, UserInputEntry } from '../types/diaryTypes';
import { LabelOption, LabelOptions, MultilabelKey } from '../types/labelTypes';
import { EnketoUserInputEntry } from '../survey/enketo/enketoHelper';
import { VehicleIdentity } from '../types/appConfigTypes';

export type UserInputMap = {
  /* if the key here is 'SURVEY', we are in the ENKETO configuration, meaning the user input
    value will have the raw 'xmlResponse' string */
  SURVEY?: EnketoUserInputEntry;
} & {
  /* all other keys, (e.g. 'MODE', 'PURPOSE') are from the MULTILABEL configuration
    and will have the 'label' string but no 'xmlResponse' string */
  [k in MultilabelKey]?: UserInputEntry;
};

export type TimelineMap = Map<string, TimelineEntry>; // Todo: update to reflect unpacked trips (origin_Key, etc)
export type TimelineLabelMap = {
  [k: string]: UserInputMap;
};
export type TimelineNotesMap = {
  [k: string]: UserInputEntry[];
};

export type LabelTabFilter = {
  key: string;
  text: string;
  filter: (trip: TimelineEntry, userInputForTrip: UserInputMap) => boolean;
  state?: boolean;
};

type ContextProps = {
  labelOptions: LabelOptions | null;
  timelineMap: TimelineMap | null;
  userInputFor: (tlEntry: TimelineEntry) => UserInputMap | undefined;
  notesFor: (tlEntry: TimelineEntry) => UserInputEntry[] | undefined;
  labelFor: (tlEntry: TimelineEntry, labelType: MultilabelKey) => LabelOption | undefined;
  confirmedModeFor: (tlEntry: TimelineEntry) => VehicleIdentity | LabelOption | undefined;
  addUserInputToEntry: (oid: string, userInput: any, inputType: 'label' | 'note') => void;
  displayedEntries: TimelineEntry[] | null;
  filterInputs: LabelTabFilter[];
  setFilterInputs: (filters: LabelTabFilter[]) => void;
  queriedRange: TimestampRange | null;
  pipelineRange: TimestampRange | null;
  isLoading: string | false;
  loadAnotherWeek: (when: 'past' | 'future') => void;
  loadSpecificWeek: (d: Date) => void;
  refresh: () => void;
};

export default createContext<ContextProps>({} as ContextProps);
