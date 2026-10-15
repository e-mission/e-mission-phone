import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Checkbox, IconButton, RadioButton, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import {
  getServerErrorMessage,
  ServerCommError,
  testCheckoutNonexistentVehicle,
} from '../serverComm';

const SIMULATION_DURATION_OFFSETS_HOURS = [1, 24, -1, -24];

interface LibraryDevPanelProps {
  hasActiveRental: boolean;
  showTestLocations: boolean;
  onToggleTestLocations: () => void;
  subgroups?: string[];
  simulatedSubgroup?: string;
  onChangeSimulatedSubgroup: (subgroup: string) => void;
  onSimulateDurationOffset: (hours: number) => void;
}

export default function LibraryDevPanel({
  hasActiveRental,
  showTestLocations,
  onToggleTestLocations,
  subgroups,
  simulatedSubgroup,
  onChangeSimulatedSubgroup,
  onSimulateDurationOffset,
}: LibraryDevPanelProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [testErrorResult, setTestErrorResult] = useState<string | null>(null);

  function onTestError() {
    setTestErrorResult('pending...');
    testCheckoutNonexistentVehicle().then(
      (response) => setTestErrorResult(`resolved: ${JSON.stringify(response)}`),
      (error: ServerCommError) =>
        setTestErrorResult(
          `rejected: status=${error?.status}, message=${getServerErrorMessage(error)}`,
        ),
    );
  }

  return (
    <View style={styles.devBanner}>
      <View style={styles.devBannerHeaderRow} onTouchStart={() => setExpanded((prev) => !prev)}>
        <Text style={styles.devBannerText}>{t('library.dev-panel.title')}</Text>
        <IconButton
          icon={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          iconColor="#b00020"
          style={styles.devBannerExpandButton}
        />
      </View>
      {expanded && (
        <View style={styles.devBannerContent}>
          <View style={styles.devBannerToggle}>
            <Text style={styles.devBannerToggleLabel}>
              {t('library.dev-panel.show-test-locations')}
            </Text>
            <Checkbox
              status={showTestLocations ? 'checked' : 'unchecked'}
              onPress={onToggleTestLocations}
            />
          </View>
          <View style={styles.devBannerToggle}>
            <Text style={styles.devBannerToggleLabel}>
              {t('library.dev-panel.simulate-duration')}
            </Text>
            <View style={styles.simulationButtonsRow}>
              {SIMULATION_DURATION_OFFSETS_HOURS.map((hours) => {
                const label = hours > 0 ? `+${hours}h` : `${hours}h`;
                return (
                  <Button
                    key={hours}
                    disabled={!hasActiveRental}
                    mode="text"
                    compact
                    style={styles.simulationButton}
                    onPress={() => onSimulateDurationOffset(hours)}>
                    {label}
                  </Button>
                );
              })}
            </View>
          </View>
          {!!subgroups?.length && (
            <View style={[styles.devBannerToggle, styles.subgroupToggle]}>
              <Text style={styles.devBannerToggleLabel}>
                {t('library.dev-panel.simulate-subgroup')}
              </Text>
              <RadioButton.Group
                value={simulatedSubgroup ?? ''}
                onValueChange={onChangeSimulatedSubgroup}>
                <View style={styles.subgroupOptions}>
                  {subgroups.map((subgroup) => (
                    <RadioButton.Item
                      key={subgroup}
                      value={subgroup}
                      label={subgroup}
                      position="leading"
                      style={styles.subgroupOption}
                      labelStyle={styles.subgroupLabel}
                    />
                  ))}
                </View>
              </RadioButton.Group>
            </View>
          )}
          <View style={styles.devBannerToggle}>
            <Text style={styles.devBannerToggleLabel}>
              {t('library.dev-panel.test-checkout-nonexistent')}
            </Text>
            <Button mode="text" compact onPress={onTestError}>
              {t('library.dev-panel.run')}
            </Button>
          </View>
          {testErrorResult && <Text style={styles.devBannerToggleLabel}>{testErrorResult}</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  devBanner: {
    borderWidth: 1,
    borderColor: '#b00020',
    backgroundColor: '#ffe8ec',
  },
  devBannerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
  },
  devBannerExpandButton: {
    margin: 0,
    marginLeft: 'auto',
  },
  devBannerContent: {
    paddingHorizontal: 12,
  },
  devBannerText: {
    color: '#b00020',
    fontWeight: '700',
    fontSize: 12,
  },
  devBannerToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f0d0d0',
  },
  devBannerToggleLabel: {
    color: '#b00020',
    fontSize: 12,
    margin: 4,
  },
  simulationButtonsRow: {
    flexDirection: 'row',
  },
  subgroupToggle: {
    flexDirection: 'column',
    alignItems: 'stretch',
    paddingVertical: 4,
  },
  subgroupOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  subgroupOption: {
    width: '50%',
    minHeight: 44,
    paddingHorizontal: 0,
  },
  subgroupLabel: {
    fontSize: 12,
    textAlign: 'left',
  },
  simulationButton: {},
});
