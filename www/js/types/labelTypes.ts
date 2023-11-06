export type LabelOptions = {
  MODE: Array<ModeLabel>;
  PURPOSE: Array<PurposeReplaceLabel>;
  REPLACE_MODE: Array<PurposeReplaceLabel>;
};

export type ModeLabel = {
  value: string;
  baseMode: string;
  met_equivalent?: string;
  met?: {
    ALL: {
      range: Array<number>;
      mets: number;
    };
  };
  kgCo2PerKm: number;
  test: string;
};

export type PurposeReplaceLabel = {
  value: string;
  test: string;
};
