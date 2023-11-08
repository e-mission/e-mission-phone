// Values are in Kg/PKm (kilograms per passenger-kilometer)
// Sources for EU values:
//  - Tremod: 2017, CO2, CH4 and N2O in CO2-equivalent
//  - HBEFA: 2020, CO2 (per country)
// German data uses Tremod. Other EU countries (and Switzerland) use HBEFA for car and bus,
// and Tremod for train and air (because HBEFA doesn't provide these).
// EU data is an average of the Tremod/HBEFA data for the countries listed;
// for this average the HBEFA data was used also in the German set (for car and bus).
export const carbonDatasets = {
  US: {
    regionName: 'United States',
    footprintData: {
      WALKING: 0,
      BICYCLING: 0,
      CAR: 267 / 1609,
      BUS: 278 / 1609,
      LIGHT_RAIL: 120 / 1609,
      SUBWAY: 74 / 1609,
      TRAM: 90 / 1609,
      TRAIN: 92 / 1609,
      AIR_OR_HSR: 217 / 1609,
    },
  },
  EU: {
    // Plain average of values for the countries below (using HBEFA for car and bus, Tremod for others)
    regionName: 'European Union',
    footprintData: {
      WALKING: 0,
      BICYCLING: 0,
      CAR: 0.14515,
      BUS: 0.04751,
      LIGHT_RAIL: 0.064,
      SUBWAY: 0.064,
      TRAM: 0.064,
      TRAIN: 0.048,
      AIR_OR_HSR: 0.201,
    },
  },
  DE: {
    regionName: 'Germany',
    footprintData: {
      WALKING: 0,
      BICYCLING: 0,
      CAR: 0.139, // Tremod (passenger car)
      BUS: 0.0535, // Tremod (average city/coach)
      LIGHT_RAIL: 0.064, // Tremod (DE tram, urban rail and subway)
      SUBWAY: 0.064, // Tremod (DE tram, urban rail and subway)
      TRAM: 0.064, // Tremod (DE tram, urban rail and subway)
      TRAIN: 0.048, // Tremod (DE average short/long distance)
      AIR_OR_HSR: 0.201, // Tremod (DE airplane)
    },
  },
  FR: {
    regionName: 'France',
    footprintData: {
      WALKING: 0,
      BICYCLING: 0,
      CAR: 0.13125, // HBEFA (passenger car, considering 1 passenger)
      BUS: 0.04838, // HBEFA (average short/long distance, considering 16/25 passengers)
      LIGHT_RAIL: 0.064, // Tremod (DE tram, urban rail and subway)
      SUBWAY: 0.064, // Tremod (DE tram, urban rail and subway)
      TRAM: 0.064, // Tremod (DE tram, urban rail and subway)
      TRAIN: 0.048, // Tremod (DE average short/long distance)
      AIR_OR_HSR: 0.201, // Tremod (DE airplane)
    },
  },
  AT: {
    regionName: 'Austria',
    footprintData: {
      WALKING: 0,
      BICYCLING: 0,
      CAR: 0.14351, // HBEFA (passenger car, considering 1 passenger)
      BUS: 0.04625, // HBEFA (average short/long distance, considering 16/25 passengers)
      LIGHT_RAIL: 0.064, // Tremod (DE tram, urban rail and subway)
      SUBWAY: 0.064, // Tremod (DE tram, urban rail and subway)
      TRAM: 0.064, // Tremod (DE tram, urban rail and subway)
      TRAIN: 0.048, // Tremod (DE average short/long distance)
      AIR_OR_HSR: 0.201, // Tremod (DE airplane)
    },
  },
  SE: {
    regionName: 'Sweden',
    footprintData: {
      WALKING: 0,
      BICYCLING: 0,
      CAR: 0.13458, // HBEFA (passenger car, considering 1 passenger)
      BUS: 0.04557, // HBEFA (average short/long distance, considering 16/25 passengers)
      LIGHT_RAIL: 0.064, // Tremod (DE tram, urban rail and subway)
      SUBWAY: 0.064, // Tremod (DE tram, urban rail and subway)
      TRAM: 0.064, // Tremod (DE tram, urban rail and subway)
      TRAIN: 0.048, // Tremod (DE average short/long distance)
      AIR_OR_HSR: 0.201, // Tremod (DE airplane)
    },
  },
  NO: {
    regionName: 'Norway',
    footprintData: {
      WALKING: 0,
      BICYCLING: 0,
      CAR: 0.13265, // HBEFA (passenger car, considering 1 passenger)
      BUS: 0.04185, // HBEFA (average short/long distance, considering 16/25 passengers)
      LIGHT_RAIL: 0.064, // Tremod (DE tram, urban rail and subway)
      SUBWAY: 0.064, // Tremod (DE tram, urban rail and subway)
      TRAM: 0.064, // Tremod (DE tram, urban rail and subway)
      TRAIN: 0.048, // Tremod (DE average short/long distance)
      AIR_OR_HSR: 0.201, // Tremod (DE airplane)
    },
  },
  CH: {
    regionName: 'Switzerland',
    footprintData: {
      WALKING: 0,
      BICYCLING: 0,
      CAR: 0.17638, // HBEFA (passenger car, considering 1 passenger)
      BUS: 0.04866, // HBEFA (average short/long distance, considering 16/25 passengers)
      LIGHT_RAIL: 0.064, // Tremod (DE tram, urban rail and subway)
      SUBWAY: 0.064, // Tremod (DE tram, urban rail and subway)
      TRAM: 0.064, // Tremod (DE tram, urban rail and subway)
      TRAIN: 0.048, // Tremod (DE average short/long distance)
      AIR_OR_HSR: 0.201, // Tremod (DE airplane)
    },
  },
};
