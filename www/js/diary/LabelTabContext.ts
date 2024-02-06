import { Dispatch, SetStateAction, createContext } from 'react';
import { TimelineEntry, UserInputEntry } from '../types/diaryTypes';
import { LabelOption, LabelOptions, MultilabelKey } from '../types/labelTypes';
import { EnketoUserInputEntry } from '../survey/enketo/enketoHelper';

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
export type CustomLabelMap = {
  [k: string]: string[];
};

type ContextProps = {
  labelOptions: LabelOptions | null;
  timelineMap: TimelineMap | null;
  userInputFor: (tlEntry: TimelineEntry) => UserInputMap | undefined;
  notesFor: (tlEntry: TimelineEntry) => UserInputEntry[] | undefined;
  labelFor: (tlEntry: TimelineEntry, labelType: MultilabelKey) => LabelOption | undefined;
  addUserInputToEntry: (oid: string, userInput: any, inputType: 'label' | 'note') => void;
  displayedEntries: TimelineEntry[] | null;
  filterInputs: any; // TODO
  setFilterInputs: any; // TODO
  queriedRange: any; // TODO
  pipelineRange: any; // TODO
  isLoading: string | false;
  loadAnotherWeek: any; // TODO
  loadSpecificWeek: any; // TODO
  refresh: any; // TODO
  customLabelMap: CustomLabelMap;
  setCustomLabelMap: Dispatch<SetStateAction<CustomLabelMap>>;
};

export default createContext<ContextProps>({} as ContextProps);
