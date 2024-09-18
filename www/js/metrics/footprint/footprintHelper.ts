import i18next from 'i18next';
import color from 'color';
import { colors } from '../../appTheme';
import AppConfig from '../../types/appConfigTypes';

const lang = i18next.resolvedLanguage || 'en';
const darkWarn = color(colors.warn).darken(0.65).saturate(0.5).rgb().toString();
const darkDanger = color(colors.danger).darken(0.65).saturate(0.5).rgb().toString();
const DEFAULT_FOOTPRINT_GOALS = {
  carbon: [
    {
      label: { [lang]: i18next.t('metrics.footprint.us-2050-goal') },
      value: 2,
      color: darkDanger,
    },
    {
      label: { [lang]: i18next.t('metrics.footprint.us-2030-goal') },
      value: 7.7,
      color: darkWarn,
    },
  ],
  energy: [
    {
      label: { [lang]: i18next.t('metrics.footprint.us-2050-goal') },
      value: 5.7,
      color: darkDanger,
    },
    {
      label: { [lang]: i18next.t('metrics.footprint.us-2030-goal') },
      value: 22,
      color: darkWarn,
    },
  ],
  goals_footnote: { [lang]: i18next.t('metrics.footprint.us-goals-footnote') },
};

export function getFootprintGoals(appConfig: AppConfig, addFootnote: (footnote: string) => any) {
  const goals = {
    ...(appConfig?.metrics?.phone_dashboard_ui?.footprint_options?.goals ??
      DEFAULT_FOOTPRINT_GOALS),
  };
  const footnoteNumber = goals.goals_footnote ? addFootnote(goals.goals_footnote[lang]) : '';
  for (const goalType of ['carbon', 'energy']) {
    for (const goal of goals[goalType] || []) {
      if (typeof goal.label == 'object') {
        goal.label = goal.label[lang] + footnoteNumber;
      }
    }
  }
  return goals;
}
