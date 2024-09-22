export type InputDetails<T extends string> = {
  [k in T]?: {
    name: string;
    labeltext: string;
    choosetext: string;
    key: string;
  };
};

type FootprintFuelType = 'gasoline' | 'diesel' | 'electric' | 'cng' | 'lpg' | 'hydrogen';

export type RichMode = {
  value: string;
  base_mode: string;
  icon: string;
  color: string;
  met?: { [k in string]?: { range: [number, number]; mets: number } };
  footprint?: {
    [f in FootprintFuelType]?: {
      wh_per_km?: number;
      wh_per_trip?: number;
    };
  };
};

export type LabelOption<T extends string = MultilabelKey> = T extends 'MODE'
  ? {
      value: string;
      base_mode: string;
    } & Partial<RichMode>
  : {
      value: string;
    };

export type MultilabelKey = 'MODE' | 'PURPOSE' | 'REPLACED_MODE';
export type LabelOptions = {
  MODE: LabelOption<'MODE'>[];
  PURPOSE: LabelOption<'PURPOSE'>[];
  REPLACED_MODE?: LabelOption<'REPLACED_MODE'>[];
} & {
  translations: {
    [lang: string]: { [translationKey: string]: string };
  };
};
