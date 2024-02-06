import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, Modal } from 'react-native';
import { useTheme, Appbar, IconButton, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { FlashList } from '@shopify/flash-list';
import { DateTime } from 'luxon';
import { sendEmail } from './emailService';

const SensedPage = ({ pageVis, setPageVis }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [entries, setEntries] = useState<any[]>([]);

  const emailCache = function () {
    sendEmail('userCacheDB');
  };

  async function updateEntries() {
    //hardcoded function and keys after eliminating bit-rotted options
    let userCacheFn = window['cordova'].plugins.BEMUserCache.getAllMessages;
    let userCacheKey = 'statemachine/transition';
    try {
      let entryList = await userCacheFn(userCacheKey, true);
      let tempEntries: any[] = [];
      entryList.forEach((entry) => {
        entry.metadata.write_fmt_time = DateTime.fromSeconds(entry.metadata.write_ts)
          .setZone(entry.metadata.time_zone)
          .toLocaleString(DateTime.DATETIME_MED);
        entry.data = JSON.stringify(entry.data, null, 2);
        tempEntries.push(entry);
      });
      setEntries(tempEntries);
    } catch (error) {
      window['Logger'].log(window['Logger'].LEVEL_ERROR, 'Error updating entries' + error);
    }
  }

  useEffect(() => {
    updateEntries();
  }, [pageVis]);

  const separator = () => <View style={{ height: 8 }} />;
  const cacheItem = ({ item: cacheItem }) => (
    <View style={styles.entry(colors.elevation.level1)}>
      <Text style={styles.date(colors.elevation.level4)} variant="labelLarge">
        {cacheItem.metadata.write_fmt_time}
      </Text>
      <Text style={styles.details} variant="bodyMedium">
        {cacheItem.data}
      </Text>
    </View>
  );

  return (
    <Modal visible={pageVis} onDismiss={() => setPageVis(false)}>
      <SafeAreaView style={{ flex: 1 }}>
        <Appbar.Header
          statusBarHeight={0}
          elevated={true}
          style={{ height: 46, backgroundColor: colors.surface }}>
          <Appbar.BackAction onPress={() => setPageVis(false)} />
          <Appbar.Content title={t('control.sensed-title')} />
        </Appbar.Header>

        <View
          style={{ paddingHorizontal: 15, flexDirection: 'row', justifyContent: 'space-between' }}>
          <IconButton icon="refresh" onPress={() => updateEntries()} />
          <IconButton icon="email" onPress={() => emailCache()} />
        </View>

        <FlashList
          data={entries}
          renderItem={cacheItem}
          estimatedItemSize={75}
          keyExtractor={(item) => item.metadata.write_ts}
          ItemSeparatorComponent={separator}
        />
      </SafeAreaView>
    </Modal>
  );
};
const styles = StyleSheet.create({
  date: (surfaceColor) => ({
    backgroundColor: surfaceColor,
  }),
  details: {
    fontFamily: 'monospace',
  },
  entry: (surfaceColor) => ({
    backgroundColor: surfaceColor,
    marginLeft: 5,
  }),
});

export default SensedPage;
