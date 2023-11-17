export const standardMETs = {
  WALKING: {
    VERY_SLOW: {
      range: [0, 2.0],
      mets: 2.0,
    },
    SLOW: {
      range: [2.0, 2.5],
      mets: 2.8,
    },
    MODERATE_0: {
      range: [2.5, 2.8],
      mets: 3.0,
    },
    MODERATE_1: {
      range: [2.8, 3.2],
      mets: 3.5,
    },
    FAST: {
      range: [3.2, 3.5],
      mets: 4.3,
    },
    VERY_FAST_0: {
      range: [3.5, 4.0],
      mets: 5.0,
    },
    'VERY_FAST_!': {
      range: [4.0, 4.5],
      mets: 6.0,
    },
    VERY_VERY_FAST: {
      range: [4.5, 5],
      mets: 7.0,
    },
    SUPER_FAST: {
      range: [5, 6],
      mets: 8.3,
    },
    RUNNING: {
      range: [6, Number.MAX_VALUE],
      mets: 9.8,
    },
  },
  BICYCLING: {
    VERY_VERY_SLOW: {
      range: [0, 5.5],
      mets: 3.5,
    },
    VERY_SLOW: {
      range: [5.5, 10],
      mets: 5.8,
    },
    SLOW: {
      range: [10, 12],
      mets: 6.8,
    },
    MODERATE: {
      range: [12, 14],
      mets: 8.0,
    },
    FAST: {
      range: [14, 16],
      mets: 10.0,
    },
    VERT_FAST: {
      range: [16, 19],
      mets: 12.0,
    },
    RACING: {
      range: [20, Number.MAX_VALUE],
      mets: 15.8,
    },
  },
  UNKNOWN: {
    ALL: {
      range: [0, Number.MAX_VALUE],
      mets: 0,
    },
  },
  IN_VEHICLE: {
    ALL: {
      range: [0, Number.MAX_VALUE],
      mets: 0,
    },
  },
  CAR: {
    ALL: {
      range: [0, Number.MAX_VALUE],
      mets: 0,
    },
  },
  BUS: {
    ALL: {
      range: [0, Number.MAX_VALUE],
      mets: 0,
    },
  },
  LIGHT_RAIL: {
    ALL: {
      range: [0, Number.MAX_VALUE],
      mets: 0,
    },
  },
  TRAIN: {
    ALL: {
      range: [0, Number.MAX_VALUE],
      mets: 0,
    },
  },
  TRAM: {
    ALL: {
      range: [0, Number.MAX_VALUE],
      mets: 0,
    },
  },
  SUBWAY: {
    ALL: {
      range: [0, Number.MAX_VALUE],
      mets: 0,
    },
  },
  AIR_OR_HSR: {
    ALL: {
      range: [0, Number.MAX_VALUE],
      mets: 0,
    },
  },
};
