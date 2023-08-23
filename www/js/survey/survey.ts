type SurveyOption = { filter: string, service: string, elementTag: string }
export const SurveyOptions: {[key: string]: SurveyOption} = {
  MULTILABEL: {
    filter: "MultiLabelInfScrollFilters",
    service: "MultiLabelService",
    elementTag: "multilabel"
  },
  ENKETO: {
    filter: "EnketoTripInfScrollFilters",
    service: "EnketoTripButtonService",
    elementTag: "enketo-trip-button"
  }
}
