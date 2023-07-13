
import React, { useState } from 'react';
import { array, } from 'prop-types';
import { angularize } from '../angular-react-helper';
import { Card, IconButton, Surface} from 'react-native-paper';
import BarChart from './BarChart';
import MetricsDetails from './MetricDetails';
import { StyleSheet } from 'react-native';


const MetricsCard = ({chartData, axisTitle}) => {
  
  const [state, setState] = useState({detailsView : false})
  return (
    <Card style={{width:"90%", alignSelf:"center", height:"280px" }}>
      <Surface style={{backgroundColor: 'rgba(0, 136, 206, 1)', height: "60px"}}>
        <Card.Title 
          titleStyle={{textAlign:"center", color:"white", fontSize:"20px"}}
          title="My Distance"
          right={state.detailsView ?
            (()=><IconButton icon="chart-bar" mode="contained" onPress={()=> setState({detailsView : false})}/>
            ):
            (
             ()=> <IconButton icon="abacus" mode="contained" onPress={()=> setState({detailsView : true})}/>
            )}
        />
        </Surface>
      
      {state.detailsView ? (
        <>
          <Card.Content>
            <MetricsDetails chartData={chartData}/>
          </Card.Content>
       </>

      ) : (
        <>
          <Card.Content>
            <BarChart chartData={chartData} axisTitle={axisTitle} isHorizontal={true}/>
          </Card.Content>
        </>
      )
      }
      
      
    </Card>
  )
}

MetricsCard.propTypes = {
  chartData: array,
};

angularize(MetricsCard, 'MetricsCard', 'emission.main.metricscard');
export default MetricsCard;
