/* A list of notes, sorted by time, that have been added to this timeline entry.
  Notes are added from the AddNoteButton and are derived from survey responses.
*/

import React, { useContext, useState } from 'react';
import { DateTime } from 'luxon';
import { Modal } from 'react-native';
import { Text, Button, DataTable, Dialog, Icon } from 'react-native-paper';
import TimelineContext from '../../TimelineContext';
import EnketoModal from './EnketoModal';
import { useTranslation } from 'react-i18next';
import { EnketoUserInputEntry } from './enketoHelper';
import { displayErrorMsg, logDebug } from '../../plugin/logger';
import { formatIsoNoYear, isoDatesDifference } from '../../datetimeUtil';

type Props = {
  timelineEntry: any;
  additionEntries: EnketoUserInputEntry[];
};
const AddedNotesList = ({ timelineEntry, additionEntries }: Props) => {
  const { t } = useTranslation();
  const { addUserInputToEntry } = useContext(TimelineContext);
  const [confirmDeleteModalVisible, setConfirmDeleteModalVisible] = useState(false);
  const [surveyModalVisible, setSurveyModalVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<EnketoUserInputEntry | undefined>(undefined);

  const _cachedDts = {};
  function getDisplayDt(entry?: EnketoUserInputEntry) {
    if (!entry) return '';

    // memoization: if we've already calculated the displayDt for this entry, return it from cache
    const cachedDt = _cachedDts[entry.metadata.write_ts]; // write_ts used as key since it's unique
    if (cachedDt) return cachedDt;

    // otherwise, calculate it and cache it before returning it
    const timezone =
      timelineEntry.start_local_dt?.timezone ||
      timelineEntry.enter_local_dt?.timezone ||
      timelineEntry.end_local_dt?.timezone ||
      timelineEntry.exit_local_dt?.timezone;
    const beginTs = entry.data.start_ts;
    const stopTs = entry.data.end_ts;
    const beginIso = DateTime.fromSeconds(beginTs).setZone(timezone).toISO() || undefined;
    const stopIso = DateTime.fromSeconds(stopTs).setZone(timezone).toISO() || undefined;
    let d;
    if (beginIso && stopIso && isoDatesDifference(beginIso, stopIso)) {
      d = formatIsoNoYear(beginIso, stopIso);
    }
    const begin = DateTime.fromSeconds(beginTs)
      .setZone(timezone)
      .toLocaleString(DateTime.TIME_SIMPLE);
    const stop = DateTime.fromSeconds(stopTs)
      .setZone(timezone)
      .toLocaleString(DateTime.TIME_SIMPLE);

    const dt = { date: d, time: begin + ' - ' + stop };
    _cachedDts[entry.metadata.write_ts] = dt;
    return dt;
  }

  function deleteEntry(entry?: EnketoUserInputEntry) {
    const dataKey = entry?.data?.key || entry?.metadata?.key;
    const data = entry?.data;

    if (!dataKey || !data) {
      return displayErrorMsg(`Error in deleteEntry, entry was: ${JSON.stringify(entry)}`);
    }

    const index = additionEntries.indexOf(entry);
    data.status = 'DELETED';

    logDebug(`Deleting entry ${JSON.stringify(entry)} 
      with dataKey ${dataKey}; 
      index = ${index}`);

    return window['cordova'].plugins.BEMUserCache.putMessage(dataKey, data).then(() => {
      // if entry was found in additionEntries, remove it
      if (index > -1) {
        additionEntries.splice(index, 1);
      }
      setConfirmDeleteModalVisible(false);
      setEditingEntry(undefined);
    });
  }

  function confirmDeleteEntry(entry: EnketoUserInputEntry) {
    setEditingEntry(entry);
    setConfirmDeleteModalVisible(true);
  }

  function dismissConfirmDelete() {
    setEditingEntry(undefined);
    setConfirmDeleteModalVisible(false);
  }

  function editEntry(entry) {
    setEditingEntry(entry);
    logDebug('editingEntry = ' + JSON.stringify(entry));
    setSurveyModalVisible(true);
  }

  async function onEditedResponse(response: EnketoUserInputEntry) {
    if (!response) return;
    await deleteEntry(editingEntry);
    setEditingEntry(undefined);
    addUserInputToEntry(timelineEntry._id.$oid, response, 'note');
  }

  function onModalDismiss() {
    setEditingEntry(undefined);
    setSurveyModalVisible(false);
  }

  const sortedEntries = additionEntries?.sort((a, b) => a.data.start_ts - b.data.start_ts);
  return (
    <>
      <DataTable>
        {sortedEntries?.map((entry, index) => {
          const isLastRow = index == additionEntries.length - 1;
          return (
            <DataTable.Row key={index} style={styles.row(isLastRow)}>
              <DataTable.Cell
                onPress={() => editEntry(entry)}
                style={[styles.cell, { flex: 5, pointerEvents: 'auto' }]}>
                <Text numberOfLines={2} style={{ fontSize: 12, fontWeight: 'bold' }}>
                  {entry.data.label}
                </Text>
              </DataTable.Cell>
              <DataTable.Cell
                onPress={() => editEntry(entry)}
                style={[styles.cell, { flex: 4 }]}
                textStyle={{ fontSize: 12, lineHeight: 12 }}>
                <Text style={{ display: 'flex' }}>{getDisplayDt(entry)?.date}</Text>
                <Text style={{ display: 'flex' }}>{getDisplayDt(entry)?.time}</Text>
              </DataTable.Cell>
              <DataTable.Cell
                onPress={() => confirmDeleteEntry(entry)}
                style={[styles.cell, { flex: 1, justifyContent: 'center' }]}>
                <Icon source="delete" size={18} />
              </DataTable.Cell>
            </DataTable.Row>
          );
        })}
      </DataTable>
      {editingEntry && (
        <EnketoModal
          visible={surveyModalVisible}
          onDismiss={onModalDismiss}
          onResponseSaved={onEditedResponse}
          surveyName={editingEntry.data.name}
          opts={{
            timelineEntry,
            prefilledSurveyResponse: editingEntry?.data.xmlResponse,
            dataKey: editingEntry?.data?.key || editingEntry?.metadata?.key,
          }}
        />
      )}
      <Modal
        visible={confirmDeleteModalVisible}
        transparent={true}
        onDismiss={dismissConfirmDelete}>
        <Dialog visible={confirmDeleteModalVisible} onDismiss={dismissConfirmDelete}>
          <Dialog.Title>{t('diary.delete-entry-confirm')}</Dialog.Title>
          <Dialog.Content>
            <Text style={{ fontWeight: 'bold' }}>{editingEntry?.data?.label}</Text>
            <Text>{getDisplayDt(editingEntry)?.date}</Text>
            <Text>{getDisplayDt(editingEntry)?.time}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => deleteEntry(editingEntry)}>Delete</Button>
            <Button onPress={() => dismissConfirmDelete()}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>
      </Modal>
    </>
  );
};

const styles: any = {
  row: (isLastRow) => ({
    minHeight: 36,
    height: 36,
    borderBottomWidth: isLastRow ? 0 : 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    pointerEvents: 'all',
  }),
  cell: {
    pointerEvents: 'auto',
  },
};

export default AddedNotesList;
