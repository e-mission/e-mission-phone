export type InputDetails<T extends string> = {
  [k in T]?: {
    name: string;
    labeltext: string;
    choosetext: string;
    key: string;
  };
};
export type LabelOption = {
  value: string;
  baseMode: string;
  met?: { range: any[]; mets: number };
  met_equivalent?: string;
  kgCo2PerKm: number;
  text?: string;
};
export type MultilabelKey = 'MODE' | 'PURPOSE' | 'REPLACED_MODE';
export type LabelOptions<T extends string = MultilabelKey> = {
  [k in T]: LabelOption[];
} & {
  translations: {
    [lang: string]: { [translationKey: string]: string };
  };
};
