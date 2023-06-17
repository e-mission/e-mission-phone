/* A list of notes, sorted by time, that have been added to this timeline entry.
  Notes are added from the AddNoteButton and are derived from survey responses.
*/

import React, { useEffect, useState } from "react";
import { angularize, createScopeWithVars, getAngularService } from "../../angular-react-helper";
import { array, object } from "prop-types";
import moment from "moment";
import { Text } from "react-native"
import { DataTable, IconButton } from "react-native-paper";

const AddedNotesList = ({ timelineEntry, additionEntries, onDelete }) => {

  const [rerender, setRerender] = useState(false);

  const DiaryHelper = getAngularService("DiaryHelper");
  const EnketoSurveyLaunch = getAngularService("EnketoSurveyLaunch");
  const $rootScope = getAngularService("$rootScope");
  const $ionicPopup = getAngularService("$ionicPopup");

  useEffect(() => {
    // init
  }, []);

  function setDisplayDt(entry) {
    const timezone = timelineEntry.start_local_dt?.timezone
                    || timelineEntry.enter_local_dt?.timezone
                    || timelineEntry.end_local_dt?.timezone
                    || timelineEntry.exit_local_dt?.timezone;
    const beginTs = entry.data.start_ts || entry.data.enter_ts;
    const stopTs = entry.data.end_ts || entry.data.exit_ts;
    let d;
    if (DiaryHelper.isMultiDay(beginTs, stopTs)) {
      const beginTsZoned = moment.parseZone(beginTs*1000).tz(timezone);
      const stopTsZoned = moment.parseZone(stopTs*1000).tz(timezone);
      d = DiaryHelper.getFormattedDateAbbr(beginTsZoned, stopTsZoned);
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
        $rootScope.$broadcast('scrollResize');
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
    const prevResponse = entry.data.xmlResponse;
    const dataKey = entry.key || entry.metadata.key;
    const surveyName = entry.data.name;
    return EnketoSurveyLaunch
      .launch($rootScope, surveyName, { prefilledSurveyResponse: prevResponse, dataKey, timelineEntry })
      .then(result => {
        if (!result) {
          return;
        }
        const addition = {
          data: result,
          write_ts: Date.now(),
          key: dataKey
        };

        // adding the addition for display is handled in infinite_scroll_list.js
        $rootScope.$broadcast('enketo.noteAddition', addition);
        deleteEntry(entry);
      });
  }

  const sortedEntries = additionEntries?.sort((a, b) => a.data.start_ts - b.data.start_ts);
  return (
    <DataTable>
      {sortedEntries?.map((entry, index) => {
        const isLastRow = (index == additionEntries.length - 1);
        return (
          <DataTable.Row key={index} style={styles.row(isLastRow)}>
            <DataTable.Cell onPress={() => editEntry(entry)}
                            style={{flex: 5}}
                            textStyle={{fontSize: 12, fontWeight: 'bold'}}>
              <Text numberOfLines={2}>{entry.data.label}</Text>
            </DataTable.Cell>
            <DataTable.Cell onPress={() => editEntry(entry)}
                            style={{flex: 4}}
                            textStyle={{fontSize: 12, lineHeight: 12}}>
              <Text style={{display: 'flex'}}>{entry.displayDt?.date}</Text>
              <Text style={{display: 'flex'}}>{entry.displayDt?.time || setDisplayDt(entry)}</Text>
            </DataTable.Cell>
            <DataTable.Cell onPress={() => confirmDeleteEntry(entry)}
                            style={{flex: 1}}>
              <IconButton icon="delete" size={18} />
            </DataTable.Cell>
          </DataTable.Row>
        )
      })}
    </DataTable>
  );
};

const styles = {
  row: (isLastRow) => ({
    minHeight: 36,
    height: 36,
    borderBottomWidth: (isLastRow ? 0 : 1),
    borderBottomColor: 'rgba(0,0,0,0.1)',
    pointerEvents: 'auto',
  }),
  label: {
    flex: 5,
  },
  dateTime: {
    flex: 4,
  },
  delete: {
    flex: 1,
  },
}

AddedNotesList.propTypes = {
  timelineEntry: object,
  additionEntries: array,
};

angularize(AddedNotesList, 'emission.survey.addednoteslist');
export default AddedNotesList;
