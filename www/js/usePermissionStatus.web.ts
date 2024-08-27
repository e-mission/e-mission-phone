// on Web there are no permissions needed - return obj with overallStatus true and rest blank/ empty

const usePermissionStatus = () => {
  return {
    checkList: [],
    overallStatus: true,
    error: '',
    errorVis: false,
    setErrorVis: () => {},
    explanationList: [],
  };
};

export default usePermissionStatus;
