// return getGradient(barChartRef.current, meter, barCtx, chartDatasets[i]);
// return getGradient(barChartRef.current, meter, barCtx, chartDatasets[i], 1, .25);

import color from 'color';
import { getBaseModeByKey } from '../diary/diaryHelper';

export const defaultPalette = [
  '#c95465', // red oklch(60% 0.15 14)
  '#4a71b1', // blue oklch(55% 0.11 260)
  '#d2824e', // orange oklch(68% 0.12 52)
  '#856b5d', // brown oklch(55% 0.04 50)
  '#59894f', // green oklch(58% 0.1 140)
  '#e0cc55', // yellow oklch(84% 0.14 100)
  '#b273ac', // purple oklch(64% 0.11 330)
  '#f09da6', // pink oklch(78% 0.1 12)
  '#b3aca8', // grey oklch(75% 0.01 55)
  '#80afad', // teal oklch(72% 0.05 192)
];

export function getChartHeight(chartDatasets, numVisibleDatasets, indexAxis, isHorizontal, stacked) {
  /* when horizontal charts have more data, they should get taller
    so they don't look squished */
  if (isHorizontal) {
    // 'ideal' chart height is based on the number of datasets and number of unique index values
    const uniqueIndexVals = [];
    chartDatasets.forEach(e => e.data.forEach(r => {
      if (!uniqueIndexVals.includes(r[indexAxis])) uniqueIndexVals.push(r[indexAxis]);
    }));
    const numIndexVals = uniqueIndexVals.length;
    const heightPerIndexVal = stacked ? 36 : numVisibleDatasets * 8;
    const idealChartHeight = heightPerIndexVal * numIndexVals;

    /* each index val should be at least 20px tall for visibility,
      and the graph itself should be at least 250px tall */
    const minChartHeight = Math.max(numIndexVals * 20, 250);

    // return whichever is greater
    return { height: Math.max(idealChartHeight, minChartHeight) };
  }
  // vertical charts should just fill the available space in the parent container
  return { flex: 1 };
}

function getBarHeight(stacks) {
  let totalHeight = 0;
  console.log("ctx stacks", stacks.x);
  for(let val in stacks.x) {
    if(!val.startsWith('_')){
      totalHeight += stacks.x[val];
      console.log("ctx added ", val );
    }
  }
  return totalHeight;
}

//fill pattern creation
//https://stackoverflow.com/questions/28569667/fill-chart-js-bar-chart-with-diagonal-stripes-or-other-patterns
function createDiagonalPattern(color = 'black') {
  let shape = document.createElement('canvas')
  shape.width = 10
  shape.height = 10
  let c = shape.getContext('2d')
  c.strokeStyle = color
  c.lineWidth = 2
  c.beginPath()
  c.moveTo(2, 0)
  c.lineTo(10, 8)
  c.stroke()
  c.beginPath()
  c.moveTo(0, 8)
  c.lineTo(2, 10)
  c.stroke()
  return c.createPattern(shape, 'repeat')
}

export function getMeteredBackgroundColor(meter, barCtx, currDataset, colors, darken=0) {
  let bar_height = getBarHeight(barCtx.parsed._stacks);
  console.debug("bar height for", barCtx.raw.y, " is ", bar_height, "which in chart is", currDataset);
  let meteredColor;
  if (bar_height > meter.high) meteredColor = colors.danger;
  else if (bar_height > meter.middle) meteredColor = colors.warn;
  else meteredColor = colors.success;
  if (darken) {
    return color(meteredColor).darken(darken).hex();
  }
  //if "unlabeled", etc -> stripes
  if (currDataset.label == meter.dash_key) {
    return createDiagonalPattern(meteredColor);
  }
  //if :labeled", etc -> solid
  return meteredColor;
}

function darkenOrLighten(baseColor, change) {
  let colorObj = color(baseColor);
  if(change > 0) {
    return colorObj.darken(Math.abs(change)).hex();
  } else {
    return colorObj.lighten(Math.abs(change)).hex();
  }
}

export function deduplicateColor(modeColor, colorList) {
  const options = [ -0.3, 0.3, -0.6, 0.6];
  let newColor = modeColor;
  let i = 0;

  if(Object.values(colorList).includes(modeColor)){
    for (let i=0; i< options.length; i++){
      if(i >= options.length - 1){
        newColor = modeColor; //just in case, if out of options, use original color
      } else {
        newColor = darkenOrLighten(modeColor, options[i]);
        if(!(Object.values(colorList).includes(newColor))) {break;}
      }
    }
  }
  return newColor;
}

export function formatLabelForSearch(label) {
  let formatted = "";
  let splitLabel = label.split(" ");
  for (let i = 0; i < splitLabel.length; i++){
    formatted += splitLabel[i];
    if(i < splitLabel.length -1){ 
      formatted += "_"; //no '_' on the end!
    }
  }
  return formatted;
}

export function makeColorMap(chartDatasets, labelOptions) {
  let tempColorMap = {};
  for(let i = 0; i < chartDatasets.length; i++) {
    let modeColor = tempColorMap[chartDatasets[i]["label"]];
    if(!modeColor){
      const searchFormat = formatLabelForSearch(chartDatasets[i]["label"].toLowerCase());
      const modeOption = labelOptions?.MODE?.find(opt => opt.value == searchFormat);
      modeColor = getBaseModeByKey(modeOption?.baseMode || "OTHER").color;
      modeColor = deduplicateColor(modeColor, tempColorMap);

      tempColorMap[chartDatasets[i]["label"]] = modeColor;
    }
  }
  return tempColorMap;
}