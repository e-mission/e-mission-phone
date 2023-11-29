/* A list of notes, sorted by time, that have been added to this timeline entry.
  Notes are added from the AddNoteButton and are derived from survey responses.
*/

import React, { useContext, useState } from 'react';
import moment from 'moment';
import { Modal } from 'react-native';
import { Text, Button, DataTable, Dialog } from 'react-native-paper';
import LabelTabContext, { EnketoUserInputEntry } from '../../diary/LabelTabContext';
import { getFormattedDateAbbr, isMultiDay } from '../../diary/diaryHelper';
import { Icon } from '../../components/Icon';
import EnketoModal from './EnketoModal';
import { useTranslation } from 'react-i18next';

type EntryWithDisplayDt = EnketoUserInputEntry & { displayDt?: { date: string; time: string } };
type Props = {
  timelineEntry: any;
  additionEntries: EntryWithDisplayDt[];
};
const AddedNotesList = ({ timelineEntry, additionEntries }: Props) => {
  const { t } = useTranslation();
  const { addUserInputToEntry } = useContext(LabelTabContext);
  const [confirmDeleteModalVisible, setConfirmDeleteModalVisible] = useState(false);
  const [surveyModalVisible, setSurveyModalVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<EntryWithDisplayDt | null>(null);

  function setDisplayDt(entry) {
    const timezone =
      timelineEntry.start_local_dt?.timezone ||
      timelineEntry.enter_local_dt?.timezone ||
      timelineEntry.end_local_dt?.timezone ||
      timelineEntry.exit_local_dt?.timezone;
    const beginTs = entry.data.start_ts || entry.data.enter_ts;
    const stopTs = entry.data.end_ts || entry.data.exit_ts;
    let d;
    if (isMultiDay(beginTs, stopTs)) {
      const beginTsZoned = moment.parseZone(beginTs * 1000).tz(timezone);
      const stopTsZoned = moment.parseZone(stopTs * 1000).tz(timezone);
      d = getFormattedDateAbbr(beginTsZoned.toISOString(), stopTsZoned.toISOString());
    }
    const begin = moment
      .parseZone(beginTs * 1000)
      .tz(timezone)
      .format('LT');
    const stop = moment
      .parseZone(stopTs * 1000)
      .tz(timezone)
      .format('LT');
    return (entry.displayDt = {
      date: d,
      time: begin + ' - ' + stop,
    });
  }

  function deleteEntry(entry) {
    console.log('Deleting entry', entry);

    const dataKey = entry.key || entry.metadata.key;
    const data = entry.data;
    const index = additionEntries.indexOf(entry);
    data.status = 'DELETED';

    return window['cordova'].plugins.BEMUserCache.putMessage(dataKey, data).then(() => {
      additionEntries.splice(index, 1);
      setConfirmDeleteModalVisible(false);
      setEditingEntry(null);
    });
  }

  function confirmDeleteEntry(entry) {
    setEditingEntry(entry);
    setConfirmDeleteModalVisible(true);
  }

  function dismissConfirmDelete() {
    setEditingEntry(null);
    setConfirmDeleteModalVisible(false);
  }

  function editEntry(entry) {
    setEditingEntry(entry);
    setSurveyModalVisible(true);
  }

  async function onEditedResponse(response) {
    if (!response) return;
    await deleteEntry(editingEntry);
    setEditingEntry(null);
    addUserInputToEntry(timelineEntry._id.$oid, response, 'note');
  }

  function onModalDismiss() {
    setEditingEntry(null);
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
                style={[styles.cell, { flex: 5, pointerEvents: 'auto' }]}
                textStyle={{ fontSize: 12, fontWeight: 'bold' }}>
                <Text numberOfLines={2}>{entry.data.label}</Text>
              </DataTable.Cell>
              <DataTable.Cell
                onPress={() => editEntry(entry)}
                style={[styles.cell, { flex: 4 }]}
                textStyle={{ fontSize: 12, lineHeight: 12 }}>
                <Text style={{ display: 'flex' }}>{entry.displayDt?.date}</Text>
                <Text style={{ display: 'flex' }}>
                  {entry.displayDt?.time || (setDisplayDt(entry) && '')}
                </Text>
              </DataTable.Cell>
              <DataTable.Cell
                onPress={() => confirmDeleteEntry(entry)}
                style={[styles.cell, { flex: 1 }]}>
                <Icon icon="delete" size={18} />
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
            dataKey: editingEntry?.key || editingEntry?.metadata?.key,
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
            <Text>{editingEntry?.displayDt?.date}</Text>
            <Text>{editingEntry?.displayDt?.time}</Text>
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
