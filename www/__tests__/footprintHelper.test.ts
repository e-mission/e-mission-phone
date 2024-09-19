import i18next from 'i18next';
import { getFootprintGoals } from '../js/metrics/footprint/footprintHelper';
import AppConfig from '../js/types/appConfigTypes';

describe('footprintHelper', () => {
  const fakeAppConfig1 = {
    metrics: {
      phone_dashboard_ui: {
        footprint_options: {
          goals: {
            carbon: [
              {
                label: { en: 'Foo goal' },
                value: 1.1,
                color: 'rgb(255, 0, 0)',
              },
              {
                label: { en: 'Bar goal' },
                value: 5.5,
                color: 'rgb(0, 255, 0)',
              },
            ],
            energy: [
              {
                label: { en: 'Baz goal' },
                value: 4.4,
                color: 'rgb(0, 0, 255)',
              },
              {
                label: { en: 'Zab goal' },
                value: 9.9,
                color: 'rgb(255, 255, 0)',
              },
            ],
            goals_footnote: { en: 'Foobar footnote' },
          },
        },
      },
    },
  };

  const myFakeFootnotes: string[] = [];
  const addFakeFootnote = (footnote: string) => {
    myFakeFootnotes.push(footnote);
    return myFakeFootnotes.length.toString();
  };
  describe('getFootprintGoals', () => {
    it('should use default goals if appConfig is blank / does not have goals, extract the label, and add footnote', () => {
      myFakeFootnotes.length = 0;
      const goals = getFootprintGoals({} as any as AppConfig, addFakeFootnote);
      expect(goals.carbon[0].label).toEqual(i18next.t('metrics.footprint.us-2050-goal') + '1');
      expect(goals.carbon[1].label).toEqual(i18next.t('metrics.footprint.us-2030-goal') + '1');
      expect(goals.energy[0].label).toEqual(i18next.t('metrics.footprint.us-2050-goal') + '1');
      expect(goals.energy[1].label).toEqual(i18next.t('metrics.footprint.us-2030-goal') + '1');
    });

    it('should use goals from appConfig when provided, extract the label, and add footnote', () => {
      myFakeFootnotes.length = 0;
      const goals = getFootprintGoals(fakeAppConfig1 as any as AppConfig, addFakeFootnote);
      expect(goals.carbon[0].label).toEqual('Foo goal1');
      expect(goals.carbon[1].label).toEqual('Bar goal1');
      expect(goals.energy[0].label).toEqual('Baz goal1');
      expect(goals.energy[1].label).toEqual('Zab goal1');
    });
  });
});
