import React from "react";
import { DataTable } from 'react-native-paper';

// val with explicit call toString() to resolve bool values not showing
const ControlDataTable = ({ controlData }) => {
  console.log("Printing data trying to tabulate", controlData);
  return (
    //rows require unique keys!
    <DataTable style={styles.table}>
      {controlData?.map((e) =>
        <DataTable.Row key={e.key}> 
          <DataTable.Cell>{e.key}</DataTable.Cell>
          <DataTable.Cell>{e.val.toString()}</DataTable.Cell>
        </DataTable.Row>
      )}
    </DataTable>
  );
};
const styles = {
  table: {
    marginLeft: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.25)',
    borderLeftWidth: 15,
    borderLeftColor: 'rgba(0,0,0,0.25)',
  }
}

export default ControlDataTable;
