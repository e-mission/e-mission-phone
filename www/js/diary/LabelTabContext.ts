import { createContext } from 'react';
import { CompositeTrip, TimelineEntry, TimestampRange, UserInputEntry } from '../types/diaryTypes';
import { LabelOption, LabelOptions, MultilabelKey } from '../types/labelTypes';
import { EnketoUserInputEntry } from '../survey/enketo/enketoHelper';
import { VehicleIdentity } from '../types/appConfigTypes';

export type UserInputMap = {
  /* If keys are 'MODE', 'PURPOSE', 'REPLACED_MODE', this is the MULTILABEL configuration.
    Values are entries that have a 'label' value in their 'data' */
  [k in MultilabelKey]?: UserInputEntry;
} & {
  /* Otherwise we are in the ENKETO configuration, and keys are names of surveys.
    Values are entries that have an 'xmlResponse' value in their 'data' */
  [k: string]: EnketoUserInputEntry | undefined;
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
  confirmedModeFor: (tlEntry: CompositeTrip) => VehicleIdentity | LabelOption | undefined;
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
