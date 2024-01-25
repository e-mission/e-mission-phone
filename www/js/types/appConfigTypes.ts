// WIP: type definitions for the 'dynamic config' spec
// examples of configs: https://github.com/e-mission/nrel-openpath-deploy-configs/tree/main/configs

export type AppConfig = {
  server: ServerConnConfig;
  intro: IntroConfig;
  survey_info: {
    'trip-labels': 'MULTILABEL' | 'ENKETO';
    surveys: EnketoSurveyConfig;
    buttons?: any;
  };
  reminderSchemes?: ReminderSchemeConfig;
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

export type ReminderSchemeConfig = {
  [schemeName: string]: {
    title: { [lang: string]: string };
    message: { [lang: string]: string };
    schedule: {
      start: number;
      end?: number;
      intervalInDays: number;
    }[];
    defaultTime?: string; // format is HH:MM in 24 hour time
  };
};
