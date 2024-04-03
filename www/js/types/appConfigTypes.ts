// WIP: type definitions for the 'dynamic config' spec
// examples of configs: https://github.com/e-mission/nrel-openpath-deploy-configs/tree/main/configs

export type AppConfig = {
  server: ServerConnConfig;
  intro: IntroConfig;
  survey_info: {
    'trip-labels': 'MULTILABEL' | 'ENKETO';
    surveys: EnketoSurveyConfig;
    buttons?: SurveyButtonsConfig;
  };
  metrics: {
    include_test_users: boolean;
    phone_dashboard_ui?: {
      sections: ('footprint' | 'active_travel' | 'summary' | 'engagement' | 'surveys')[];
      footprint_options?: {
        unlabeled_uncertainty: boolean;
      };
      summary_options?: {
        metrics_list: ('distance' | 'count' | 'duration')[];
      };
      engagement_options?: {
        leaderboard_metric: [string, string];
      };
    };
  };
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
  showsIf: string; // a JS expression that evaluates to a boolean
};
export type SurveyButtonsConfig = {
  [k in 'trip-label' | 'trip-notes' | 'place-label' | 'place-notes']:
    | SurveyButtonConfig
    | SurveyButtonConfig[];
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
