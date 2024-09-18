// WIP: type definitions for the 'dynamic config' spec
// examples of configs: https://github.com/e-mission/nrel-openpath-deploy-configs/tree/main/configs

export type AppConfig = {
  version: number;
  server: ServerConnConfig;
  intro: IntroConfig;
  survey_info: {
    'trip-labels': 'MULTILABEL' | 'ENKETO';
    surveys: EnketoSurveyConfig;
    buttons?: SurveyButtonsConfig;
  };
  vehicle_identities?: VehicleIdentity[];
  tracking?: {
    bluetooth_only: boolean;
  };
  metrics: MetricsConfig;
  reminderSchemes?: ReminderSchemesConfig;
  [k: string]: any; // TODO fill in all the other fields
};

export type ServerConnConfig = {
  connectUrl: `https://${string}`;
  aggregate_call_auth: 'no_auth' | 'user_only' | 'never';
};

export type IntroConfig = {
  program_or_study: 'program' | 'study';
  app_required: boolean;
  start_month: number;
  start_year: number;
  mode_studied?: string;
  program_admin_contact: string;
  deployment_partner_name: string;
  translated_text: {
    [lang: string]: {
      [key: string]: string;
    };
  };
};

export type EnketoSurveyConfig = {
  [surveyName: string]: {
    formPath: string;
    labelTemplate: { [lang: string]: string };
    labelVars?: { [activity: string]: { [key: string]: string; type: string } };
    version: number;
    compatibleWith: number;
    dataKey?: string;
  };
};

export type SurveyButtonConfig = {
  surveyName: string;
  'not-filled-in-label': {
    [lang: string]: string;
  };
  showsIf?: string; // a JS expression that evaluates to a boolean
};
export type SurveyButtonsConfig = {
  [k in 'trip-label' | 'trip-notes' | 'place-label' | 'place-notes']:
    | SurveyButtonConfig
    | SurveyButtonConfig[];
};

export type VehicleIdentity = {
  value: string;
  bluetooth_major_minor: string[]; // e.g. ['aaaa:bbbb', 'cccc:dddd']
  text: string;
  baseMode: string;
  met_equivalent: string;
  kgCo2PerKm: number;
  vehicle_info: {
    type: string;
    license: string;
    make: string;
    model: string;
    year: number;
    color: string;
    engine: 'ICE' | 'HEV' | 'PHEV' | 'BEV' | 'HYDROGENV' | 'BIOV';
  };
};

export type ReminderSchemesConfig = {
  [schemeKey: string]: {
    title: { [lang: string]: string };
    text: { [lang: string]: string };
    schedule: {
      start: number;
      end?: number;
      intervalInDays: number;
    }[];
    defaultTime?: string; // format is HH:MM in 24 hour time
  };
};

// the available metrics that can be displayed in the phone dashboard
export type MetricName = 'distance' | 'count' | 'duration' | 'response_count' | 'footprint';
// the available trip / userinput properties that can be used to group the metrics
export const groupingFields = [
  'mode_confirm',
  'purpose_confirm',
  'replaced_mode_confirm',
  'primary_ble_sensed_mode',
  'survey',
] as const;
export type GroupingField = (typeof groupingFields)[number];
export type MetricList = { [k in MetricName]?: GroupingField[] };
export type MetricsUiSection = 'footprint' | 'movement' | 'surveys' | 'travel';
export type FootprintGoal = {
  label: { [lang: string]: string };
  value: number;
  color?: string;
};
export type FootprintGoals = {
  carbon: FootprintGoal[];
  energy: FootprintGoal[];
  goals_footnote?: { [lang: string]: string };
};
export type MetricsConfig = {
  include_test_users: boolean;
  phone_dashboard_ui?: {
    sections: MetricsUiSection[];
    metric_list: MetricList;
    footprint_options?: {
      unlabeled_uncertainty: boolean;
      goals?: FootprintGoals;
    };
    movement_options?: {};
    surveys_options?: {};
    travel_options?: {};
  };
};

export default AppConfig;
