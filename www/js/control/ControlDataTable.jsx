import React from "react";
import { DataTable } from 'react-native-paper';
import { angularize } from "../angular-react-helper";
import { array } from "prop-types";

// Note the camelCase to dash-case conventions when translating to .html files!
// val with explicit call toString() to resolve bool values not showing
const ControlDataTable = ({ controlData }) => {
  console.log("Printing data trying to tabulate", controlData);
  return (
    <DataTable>
      {controlData.map((e) =>
        <DataTable.Row>
          <DataTable.Cell>{e.key}</DataTable.Cell>
          <DataTable.Cell>{e.val.toString()}</DataTable.Cell>
        </DataTable.Row>
      )}
    </DataTable>
    );
  };
ControlDataTable.propTypes = {
    controlData: array
  }
 
// need call to angularize to let the React and Angular co-mingle
  //second argument is "module path" - unsure of exact usage, could require update later?
angularize(ControlDataTable, 'emission.main.control.dataTable'); 
export default ControlDataTable;