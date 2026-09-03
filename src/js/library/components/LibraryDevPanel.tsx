import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Checkbox, IconButton, SegmentedButtons, Text } from 'react-native-paper';

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
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.devBanner}>
      <View style={styles.devBannerHeaderRow} onTouchStart={() => setExpanded((prev) => !prev)}>
        <Text style={styles.devBannerText}>DEV MODE: Using Stripe Sandbox</Text>
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
            <Text style={styles.devBannerToggleLabel}>Show test locations</Text>
            <Checkbox
              status={showTestLocations ? 'checked' : 'unchecked'}
              onPress={onToggleTestLocations}
            />
          </View>
          <View style={styles.devBannerToggle}>
            <Text style={styles.devBannerToggleLabel}>Simulate checkout duration</Text>
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
            <View style={styles.devBannerToggle}>
              <Text style={styles.devBannerToggleLabel}>Simulate subgroup</Text>
              <SegmentedButtons
                value={simulatedSubgroup ?? ''}
                density="high"
                onValueChange={onChangeSimulatedSubgroup}
                buttons={subgroups.map((subgroup) => ({
                  value: subgroup,
                  label: subgroup,
                  labelStyle: { fontSize: 10, padding: 0 },
                }))}
              />
            </View>
          )}
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
  simulationButton: {},
});
