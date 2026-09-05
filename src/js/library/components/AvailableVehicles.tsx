import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Modal, Pressable } from 'react-native';
import { ActivityIndicator, Button, Card, Icon, IconButton } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import i18next from 'i18next';
import { GeoJSONData } from '../../types/diaryTypes';
import LeafletView from '../../components/LeafletView';
import { LibraryStation } from '../serverComm';

interface AvailableVehiclesProps {
  stations: LibraryStation[] | null;
  stationsLoading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onScanQrButton: () => void;
  includeTestLocations?: boolean;
}

// A Bikeep "location" as returned by the /library/stations endpoint. Docks and
// lockers at the same physical place are separate locations sharing a `label`
// (unlike `name`, which embeds a unique per-location code).
type BikeepLocation = {
  id?: string;
  type?: string;
  label?: string;
  name?: string;
  address?: string;
  status?: string;
  connection?: string;
  latitude?: number;
  longitude?: number;
  // `devices.available` is Bikeep's own "empty slot" count, which doesn't
  // distinguish our fleet from the public's personal bikes/lockers. Use
  // `devices.rentable_vehicles` (computed server-side) for what to show users.
  devices?: { total?: number; available?: number; online?: number; rentable_vehicles?: number };
};

type Place = { label: string; address?: string; locations: BikeepLocation[] };

function locationTypeLabel(type: string | undefined): string {
  switch (type) {
    case 'BIKE_DOCKS':
      return i18next.t('library.available-vehicles.type-docks');
    case 'BIKE_LOCKERS':
      return i18next.t('library.available-vehicles.type-lockers');
    case 'BIKE_HOUSE':
    case 'BIKE_HOUSE_DOCKLESS':
    case 'BIKE_HANGAR':
      return i18next.t('library.available-vehicles.type-bike-house');
    default:
      return type
        ? type.replaceAll('_', ' ').toLowerCase()
        : i18next.t('library.available-vehicles.type-vehicles');
  }
}

function isOffline(l: BikeepLocation): boolean {
  return l.connection === 'offline';
}

// An offline location can't reliably report device state, so never trust its
// rentable_vehicles count even if the server sent a stale non-zero value.
function rentableVehicles(l: BikeepLocation): number {
  return isOffline(l) ? 0 : (l.devices?.rentable_vehicles ?? 0);
}

function connectionSummary(locations: BikeepLocation[]): {
  label: string;
  color: string;
  icon: string;
} {
  const offlineCount = locations.filter(isOffline).length;
  if (offlineCount === 0)
    return {
      label: i18next.t('library.available-vehicles.connection-online'),
      color: '#4CAF50',
      icon: 'wifi',
    };
  if (offlineCount === locations.length)
    return {
      label: i18next.t('library.available-vehicles.connection-offline'),
      color: '#B00020',
      icon: 'wifi-off',
    };
  return {
    label: i18next.t('library.available-vehicles.connection-partially-offline'),
    color: '#F57C00',
    icon: 'wifi-alert',
  };
}

// Groups locations by shared place label since a place with both docks and lockers
// shows up as multiple locations in the data
function groupByPlace(stations: LibraryStation[], includeTestLocations: boolean): Place[] {
  const order: string[] = [];
  const byLabel = new Map<string, BikeepLocation[]>();
  stations
    .filter((s) => includeTestLocations || s['status'] === 'LAUNCHED')
    .forEach((s, i) => {
      const label =
        s['label'] ??
        s['name'] ??
        i18next.t('library.available-vehicles.location-fallback-name', { n: i + 1 });
      if (!byLabel.has(label)) {
        order.push(label);
        byLabel.set(label, []);
      }
      byLabel.get(label)!.push(s as BikeepLocation);
    });
  return order.map((label) => {
    const locations = byLabel.get(label)!;
    return { label, address: locations[0]?.address, locations };
  });
}

function placeGeojson(place: Place): GeoJSONData | null {
  const withCoords = place.locations.find((l) => l.latitude != null && l.longitude != null);
  if (!withCoords) return null;
  return {
    data: {
      type: 'FeatureCollection',
      id: `library-place-${place.label}`,
      properties: { start_ts: 0, end_ts: 0 },
      features: [
        {
          type: 'Feature',
          properties: { feature_type: 'start_place' },
          geometry: { type: 'Point', coordinates: [withCoords.longitude!, withCoords.latitude!] },
        },
      ],
    },
  };
}

// opens the place's address/coordinates in the device's navigation app
function openInNavigationApp(place: Place) {
  const withCoords = place.locations.find((l) => l.latitude != null && l.longitude != null);
  const query = withCoords
    ? `${withCoords.latitude},${withCoords.longitude}`
    : (place.address ?? place.label);
  const url =
    window['cordova'].platformId == 'web'
      ? `https://www.google.com/maps/search/?api=1&query=${query}`
      : `geo:${query}`;
  (window as any).cordova.InAppBrowser.open(url, '_system');
}

// wide enough to show the surrounding neighborhood
const NEIGHBORHOOD_ZOOM = 15;

export function AvailableVehicles({
  stations,
  stationsLoading,
  refreshing,
  onRefresh,
  onScanQrButton,
  includeTestLocations,
}: AvailableVehiclesProps) {
  const { t } = useTranslation();
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const selectedPlaceGeojson = selectedPlace ? placeGeojson(selectedPlace) : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{t('library.available-vehicles.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('library.available-vehicles.subtitle')}</Text>
        </View>
        <Button
          mode="contained"
          icon="qrcode-scan"
          onPress={onScanQrButton}
          buttonColor="rgba(238, 238, 238, 0.15)"
          textColor="#FFFFFF"
          style={{ borderColor: 'rgba(255, 255, 255, 0.5)', borderWidth: 1, paddingLeft: 4 }}>
          {t('library.available-vehicles.scan')}
        </Button>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {stationsLoading && stations === null ? (
          <ActivityIndicator size="large" style={styles.loadingIndicator} />
        ) : !stations || stations.length === 0 ? (
          <Text style={styles.noVehiclesText}>{t('library.available-vehicles.no-stations')}</Text>
        ) : (
          groupByPlace(stations, Boolean(includeTestLocations))
            .map((place) => ({
              place,
              totalAvailable: place.locations.reduce((sum, l) => sum + rentableVehicles(l), 0),
              connection: connectionSummary(place.locations),
            }))
            // places with no vehicles available sink to the bottom of the list
            .sort((a, b) => (a.totalAvailable === 0 ? 1 : 0) - (b.totalAvailable === 0 ? 1 : 0))
            .map(({ place, totalAvailable, connection }) => {
              const { label, address } = place;
              return (
                <Card
                  key={label}
                  style={[styles.stationCard, totalAvailable === 0 && styles.stationCardEmpty]}
                  onPress={() => setSelectedPlace(place)}>
                  <Card.Title
                    title={label}
                    subtitle={address}
                    left={() => (
                      <Icon
                        source="map-marker"
                        size={24}
                        color={totalAvailable === 0 ? '#9E9E9E' : '#2196F3'}
                      />
                    )}
                    right={() => (
                      <View style={styles.connectionBadge}>
                        <Icon source={connection.icon} size={16} color={connection.color} />
                        <Text style={[styles.connectionText, { color: connection.color }]}>
                          {connection.label}
                        </Text>
                      </View>
                    )}
                  />
                  <Card.Content>
                    <Text
                      style={[
                        styles.totalAvailableText,
                        totalAvailable === 0 && styles.totalAvailableTextEmpty,
                      ]}>
                      {totalAvailable === 1
                        ? t('library.available-vehicles.one-vehicle-available')
                        : t('library.available-vehicles.vehicles-available', { n: totalAvailable })}
                    </Text>
                  </Card.Content>
                </Card>
              );
            })
        )}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {selectedPlace && (
        <Modal
          visible
          animationType="slide"
          transparent
          onDismiss={() => setSelectedPlace(null)}
          onRequestClose={() => setSelectedPlace(null)}>
          <View style={styles.modalOverlay}>
            <Card style={styles.modalContent}>
              <Card.Title
                title={selectedPlace.label}
                subtitle={
                  selectedPlace.address ? (
                    <Pressable onPress={() => openInNavigationApp(selectedPlace)}>
                      <Text style={styles.addressLink}>{selectedPlace.address}</Text>
                    </Pressable>
                  ) : undefined
                }
                left={() => <Icon source="map-marker" size={24} color="#2196F3" />}
                right={() => <IconButton icon="close" onPress={() => setSelectedPlace(null)} />}
              />
              <Card.Content>
                {selectedPlaceGeojson && (
                  <LeafletView
                    geojson={selectedPlaceGeojson}
                    zoom={NEIGHBORHOOD_ZOOM}
                    style={styles.modalMap}
                  />
                )}
                {selectedPlace.locations.map((l, i) => (
                  <View key={l.id ?? i} style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>
                      {locationTypeLabel(l.type)}
                      {isOffline(l) ? t('library.available-vehicles.offline-suffix') : ''}
                    </Text>
                    <Text style={styles.breakdownValue}>
                      {t('library.available-vehicles.available-of-total', {
                        available: rentableVehicles(l),
                        total: l.devices?.total ?? 0,
                      })}
                    </Text>
                  </View>
                ))}
                <Button
                  mode="contained"
                  icon="qrcode-scan"
                  style={styles.modalScanButton}
                  onPress={() => {
                    setSelectedPlace(null);
                    onScanQrButton();
                  }}>
                  {t('library.available-vehicles.scan')}
                </Button>
              </Card.Content>
            </Card>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#2196F3',
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#E3F2FD',
  },
  addressLink: {
    color: '#2196F3',
    textDecorationLine: 'underline',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalAvailableText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
  },
  totalAvailableTextEmpty: {
    color: '#9E9E9E',
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 16,
  },
  connectionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#424242',
    textTransform: 'capitalize',
  },
  breakdownValue: {
    fontSize: 14,
    color: '#757575',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingIndicator: {
    marginTop: 64,
    marginBottom: 64,
  },
  stationCard: {
    marginBottom: 16,
  },
  stationCardEmpty: {
    opacity: 0.5,
  },
  noVehiclesText: {
    textAlign: 'center',
    color: '#757575',
    paddingVertical: 16,
  },
  bottomPadding: {
    height: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
  },
  modalMap: {
    width: '100%',
    height: 320,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  modalScanButton: {
    marginTop: 12,
  },
});

export default AvailableVehicles;
