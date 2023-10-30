import { configuredFilters as multilabelConfiguredFilters } from "./multilabel/infinite_scroll_filters";
import { configuredFilters as enketoConfiguredFilters } from "./enketo/infinite_scroll_filters";

type SurveyOption = { filter: Array<any>, service: string, elementTag: string }
export const SurveyOptions: {[key: string]: SurveyOption} = {
  MULTILABEL: {
    filter: multilabelConfiguredFilters,
    service: "MultiLabelService",
    elementTag: "multilabel"
  },
  ENKETO: {
    filter: enketoConfiguredFilters,
    service: "EnketoTripButtonService",
    elementTag: "enketo-trip-button"
  }
}
