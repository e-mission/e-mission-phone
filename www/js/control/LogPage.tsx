import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, Modal } from 'react-native';
import { useTheme, Text, Appbar, IconButton } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { FlashList } from '@shopify/flash-list';
import { DateTime } from 'luxon';
import { AlertManager } from '../components/AlertBar';
import { sendLocalDBFile } from '../services/shareLocalDBFile';
import { displayError, logDebug } from '../plugin/logger';
import NavBar from '../components/NavBar';

type LoadStats = { currentStart: number; gotMaxIndex: boolean; reachedEnd: boolean };

const LogPage = ({ pageVis, setPageVis }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [loadStats, setLoadStats] = useState<LoadStats>();
  const [entries, setEntries] = useState<any>([]);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  const RETRIEVE_COUNT = 100;

  //when opening the modal, load the entries
  useEffect(() => {
    refreshEntries();
  }, [pageVis]);

  async function refreshEntries() {
    try {
      let maxIndex = await window['Logger'].getMaxIndex();
      logDebug('Logger maxIndex = ' + maxIndex);
      let tempStats = {} as LoadStats;
      tempStats.currentStart = maxIndex;
      tempStats.gotMaxIndex = true;
      tempStats.reachedEnd = false;
      setLoadStats(tempStats);
      setEntries([]);
    } catch (error) {
      let errorString = t('errors.while-max-index') + JSON.stringify(error, null, 2);
      displayError(error, errorString);
      AlertManager.addMessage({ text: errorString });
    } finally {
      addEntries();
    }
  }

  const moreDataCanBeLoaded = useMemo(() => {
    return loadStats?.gotMaxIndex && !loadStats?.reachedEnd;
  }, [loadStats]);

  function clear() {
    window?.['Logger'].clearAll();
    window?.['Logger'].log(
      window['Logger'].LEVEL_INFO,
      'Finished clearing entries from unified log',
    );
    refreshEntries();
  }

  async function addEntries() {
    setIsFetching(true);
    let start = loadStats?.currentStart ? loadStats.currentStart : 0; //set a default start to prevent initial fetch error
    try {
      let entryList = await window['Logger'].getMessagesFromIndex(start, RETRIEVE_COUNT);
      processEntries(entryList);
      logDebug('addEntries: entry list size = ' + entries.length);
      setIsFetching(false);
    } catch (error) {
      let errStr = t('errors.while-log-messages') + JSON.stringify(error, null, 2);
      displayError(error, errStr);
      AlertManager.addMessage({ text: errStr });
      setIsFetching(false);
    }
  }

  function processEntries(entryList) {
    let tempEntries: any[] = [];
    let tempLoadStats: LoadStats = { ...loadStats } as LoadStats;
    entryList.forEach((e) => {
      e.fmt_time = DateTime.fromSeconds(e.ts).toLocaleString(DateTime.DATETIME_MED);
      tempEntries.push(e);
    });
    if (entryList.length == 0) {
      logDebug('LogPage reached the end of the scrolling');
      tempLoadStats.reachedEnd = true;
    } else {
      tempLoadStats.currentStart = entryList[entryList.length - 1].ID;
      logDebug('LogPage new start index = ' + loadStats?.currentStart);
    }
    setEntries([...entries].concat(tempEntries)); //push the new entries onto the list
    setLoadStats(tempLoadStats);
  }

  function emailLog() {
    sendLocalDBFile('loggerDB');
  }

  const separator = () => <View style={{ height: 8 }} />;
  const logItem = ({ item: logItem }) => (
    <View style={styles.entry(colors.elevation.level1)}>
      <Text style={styles.date(colors.elevation.level4)} variant="labelLarge">
        {logItem.fmt_time}
      </Text>
      <Text style={styles.details} variant="bodyMedium">
        {logItem.ID + '|' + logItem.level + '|' + logItem.message}
      </Text>
    </View>
  );

  return (
    <Modal visible={pageVis} onDismiss={() => setPageVis(false)}>
      <SafeAreaView style={{ flex: 1 }}>
        <NavBar>
          <Appbar.BackAction
            onPress={() => {
              setPageVis(false);
            }}
          />
          <Appbar.Content title={t('control.log-title')} />
        </NavBar>

        <View
          style={{ paddingHorizontal: 15, flexDirection: 'row', justifyContent: 'space-between' }}>
          <IconButton icon="refresh" onPress={() => refreshEntries()} />
          <IconButton icon="delete" onPress={() => clear()} />
          <IconButton icon="email" onPress={() => emailLog()} />
        </View>

        <FlashList
          data={entries}
          renderItem={logItem}
          estimatedItemSize={75}
          keyExtractor={(item) => item.ID}
          ItemSeparatorComponent={separator}
          onEndReachedThreshold={0.5}
          refreshing={isFetching}
          onRefresh={() => {
            if (moreDataCanBeLoaded) {
              addEntries();
            }
          }}
          onEndReached={() => {
            if (moreDataCanBeLoaded) {
              addEntries();
            }
          }}
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

export default LogPage;
