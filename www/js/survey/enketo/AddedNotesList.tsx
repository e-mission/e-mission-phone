/* A list of notes, sorted by time, that have been added to this timeline entry.
  Notes are added from the AddNoteButton and are derived from survey responses.
*/

import React, { useContext, useState } from "react";
import { angularize, createScopeWithVars, getAngularService } from "../../angular-react-helper";
import { array, object } from "prop-types";
import moment from "moment";
import { Text } from "react-native"
import { DataTable } from "react-native-paper";
import { LabelTabContext } from "../../diary/LabelTab";
import { getFormattedDateAbbr, isMultiDay } from "../../diary/diaryHelper";
import { Icon } from "../../components/Icon";
import EnketoModal from "./EnketoModal";

const AddedNotesList = ({ timelineEntry, additionEntries }) => {

  const { repopulateTimelineEntry } = useContext(LabelTabContext);
  const [rerender, setRerender] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  const $ionicPopup = getAngularService("$ionicPopup");

  function setDisplayDt(entry) {
    const timezone = timelineEntry.start_local_dt?.timezone
                    || timelineEntry.enter_local_dt?.timezone
                    || timelineEntry.end_local_dt?.timezone
                    || timelineEntry.exit_local_dt?.timezone;
    const beginTs = entry.data.start_ts || entry.data.enter_ts;
    const stopTs = entry.data.end_ts || entry.data.exit_ts;
    let d;
    if (isMultiDay(beginTs, stopTs)) {
      const beginTsZoned = moment.parseZone(beginTs*1000).tz(timezone);
      const stopTsZoned = moment.parseZone(stopTs*1000).tz(timezone);
      d = getFormattedDateAbbr(beginTsZoned.unix(), stopTsZoned.unix());
    }
    const begin = moment.parseZone(beginTs*1000).tz(timezone).format('LT');
    const stop = moment.parseZone(stopTs*1000).tz(timezone).format('LT');
    return entry.displayDt = {
      date: d,
      time: begin + " - " + stop
    }
  }

  function deleteEntry(entry) {
    console.log("Deleting entry", entry);

    const dataKey = entry.key || entry.metadata.key;
    const data = entry.data;
    const index = additionEntries.indexOf(entry);
    data.status = 'DELETED';

    return window['cordova'].plugins.BEMUserCache
      .putMessage(dataKey, data)
      .then(() => {
        additionEntries.splice(index, 1);
        setRerender(!rerender); // force rerender
      });
  }

  function confirmDeleteEntry(entry) {
    const currEntry = entry;
    const scope = createScopeWithVars({currEntry});
    $ionicPopup.show({
      title: 'Delete entry',
      templateUrl: `templates/survey/enketo/delete-entry.html`,
      scope,
      buttons: [{
        text: 'Delete', // TODO i18n
        type: 'button-cancel',
        onTap: () => deleteEntry(entry)
      }, {
        text: 'Cancel', // TODO i18n
        type: 'button-stable',
      }]
    });
  }

  function editEntry(entry) {
    setEditingEntry(entry);
    setModalVisible(true);
  }

  async function onEditedResponse(response) {
    if (!response) return;
    await deleteEntry(editingEntry);
    setEditingEntry(null);
    repopulateTimelineEntry(timelineEntry._id.$oid);
  }

  function onModalDismiss() {
    setEditingEntry(null);
    setModalVisible(false);
  }

  const sortedEntries = additionEntries?.sort((a, b) => a.data.start_ts - b.data.start_ts);
  return (<>
    <DataTable>
      {sortedEntries?.map((entry, index) => {
        const isLastRow = (index == additionEntries.length - 1);
        return (
          <DataTable.Row key={index} style={styles.row(isLastRow)}>
            <DataTable.Cell onPress={() => editEntry(entry)}
                            style={[styles.cell, {flex: 5, pointerEvents: 'auto'}]}
                            textStyle={{fontSize: 12, fontWeight: 'bold'}}>
              <Text numberOfLines={2}>{entry.data.label}</Text>
            </DataTable.Cell>
            <DataTable.Cell onPress={() => editEntry(entry)}
                            style={[styles.cell, {flex: 4}]}
                            textStyle={{fontSize: 12, lineHeight: 12}}>
              <Text style={{display: 'flex'}}>{entry.displayDt?.date}</Text>
              <Text style={{display: 'flex'}}>{entry.displayDt?.time || setDisplayDt(entry)}</Text>
            </DataTable.Cell>
            <DataTable.Cell onPress={() => confirmDeleteEntry(entry)}
                            style={[styles.cell, {flex: 1}]}>
              <Icon icon="delete" size={18} />
            </DataTable.Cell>
          </DataTable.Row>
        )
      })}
    </DataTable>
    <EnketoModal visible={modalVisible} onDismiss={onModalDismiss}
      onResponseSaved={onEditedResponse} surveyName={editingEntry?.data.name}
      opts={{
        timelineEntry,
        prefilledSurveyResponse: editingEntry?.data.xmlResponse,
        dataKey: editingEntry?.key || editingEntry?.metadata?.key,
      }} />
  </>);
};

const styles:any = {
  row: (isLastRow) => ({
    minHeight: 36,
    height: 36,
    borderBottomWidth: (isLastRow ? 0 : 1),
    borderBottomColor: 'rgba(0,0,0,0.1)',
    pointerEvents: 'all',
  }),
  cell: {
    pointerEvents: 'auto',
  },
}

AddedNotesList.propTypes = {
  timelineEntry: object,
  additionEntries: array,
};

export default AddedNotesList;
