"use strict";

angular
  .module("emission.main.time-use.list", ["ui-leaflet",
    "emission.enketo-survey.answer",
    "emission.enketo-survey.launch",
    "emission.enketo-survey.service",
    "emission.services",
    "ionic-datepicker",
  ])
  .controller(
    "TimeUseListCtrl",
    function (
      $state,
      $ionicActionSheet,
      $ionicLoading,
      $ionicPlatform,
      $ionicScrollDelegate,
      $rootScope,
      $scope,
      $translate,
      $window,
      EnketoSurveyAnswer, // emission.enketo-survey.answer
      EnketoSurveyLaunch, // emission.enketo-survey.launch
      ionicDatePicker, // ionic-datepicker
      UnifiedDataLoader, // emission.services
      Timeline,
      DiaryHelper,
      Config
    ) {
      /**
       * Constants
       */
      const DATA_KEY = "manual/survey_response";
      const MARKER_KEY = "manual/survey_response_marker";
      const SURVEY_KEY = "TimeUseSurvey";
      const TRIPCONFIRM_SURVEY_KEY = "TripConfirmSurvey";

      /**
       * @typedef TimeUse
       * @type {object}
       * @property {object} start - start date time (moment object)
       * @property {object} end - end date time (moment object)
       * @property {string} main_label - main label
       * @property {string[]} main_labels - main labels
       * @property {string} sub_label - sub label
       * @property {string} instanceStr - xml instance string
       * @deprecated @property {string} startLabel - start date time label
       * @deprecated @property {string} endLabel - end date time label
       * @deprecated @property {string} activityLabel - activity label
       */

      /**
       * Public methods (accessible from the template)
       */
      $scope.getFormattedDistance = DiaryHelper.getFormattedDistance;

      $scope.pickDay = () => ionicDatePicker.openDatePicker($scope.dpOpts);
      $scope.prevDay = () =>
        $scope.refresh(moment($scope.currDay).tz(getTz()).subtract(1, "days"));
      $scope.nextDay = () =>
        $scope.refresh(moment($scope.currDay).tz(getTz()).add(1, "days"));
      $scope.$on(Timeline.UPDATE_DONE, function (event, args) {
        console.log("Got timeline update done event with args " + JSON.stringify(args));
        console.log("*****************");
        console.log(Timeline.data);


        // NOTE: We have to get all time-use data and filter them by date on the client side 😭
        const tz = getTz();
        const startTs =
          moment($scope.currDay).tz(tz).startOf("d").valueOf() / 1000;
        const endTs = moment($scope.currDay).tz(tz).endOf("d").valueOf() / 1000;
        const dataTq = { key: "data.start_ts", startTs, endTs };
        console.log("time-use -> refresh -> dataTq", dataTq);
        const markerTq = $window.cordova.plugins.BEMUserCache.getAllTimeQuery();
        const promises = [
          UnifiedDataLoader.getUnifiedMessagesForInterval(DATA_KEY, dataTq),
          UnifiedDataLoader.getUnifiedMessagesForInterval(MARKER_KEY, markerTq),
        ];
        return (
          Promise.all(promises)
            .then(([answers, markers]) => {
              const removeIds = markers
                .filter((marker) => marker.data.as === "remove")
                .map((marker) => marker.data.for);
              console.log("time-use -> refresh -> removeIds", removeIds);
              return answers.filter(
                (answer) =>
                  answer.data.id && !removeIds.includes(answer.data.id)
              );
            })
            .then((answers) =>
              Promise.all([
                EnketoSurveyAnswer.filterByNameAndVersion(
                  SURVEY_KEY,
                  answers
                ).then(answersToTimeUseArray),
                EnketoSurveyAnswer.filterByNameAndVersion(
                  TRIPCONFIRM_SURVEY_KEY,
                  answers
                )
                  .then(dedupTripConfirmAnswers)
                  .then(tripConfirmAnswersToTimeUseArray),
              ]).then(([a1, a2]) => [...a1, ...a2]))
            .then(fillLines)
            // .then(Timeline.updateForDay(day))
            .then(addAllTrips)
            // .then(answersToTimeUseArray)
            // .then(filterByCurrDay)
            .then((timeLineArray) =>
              timeLineArray.sort((a, b) => new moment(a.start) > new moment(b.start))
            ).then(addTimeuseList)
            .then((timeLineArray) =>
              $scope.$apply(() => setTimeLineArray(timeLineArray))
            )
            .finally(() => $scope.$apply(() => setLoading(false)))
        );
      })

      $scope.refresh = (day = $scope.currDay, dpSync = false) => {
        console.log("++++++++++++++++++++++++++++++++++++++++++++++++");
        Timeline.updateForDay(day)
        setCurrDay(day);
        setLoading(true);
        if (!dpSync) {
          $rootScope.dpSyncCurrDay = day;
          $rootScope.dpSyncDiaryTab = true;
        }
      };

      function addAllTrips(timeUseArray) {
        let timeUseTimeLineArray = []
        let timeUseArrayDefaultLength = timeUseArray.length;
        if (timeUseArrayDefaultLength == 0) {
          Timeline.data.currDayTrips.forEach(function (item) {
            console.log(item)
            item.startTime = moment(item.start_place.properties.exit_fmt_time).format('hh:mm A')
            item.start = moment(item.start_place.properties.exit_fmt_time)
            item.endTime = moment(item.end_place.properties.enter_fmt_time).format('hh:mm A')
            item.end = moment(item.end_place.properties.enter_fmt_time)
            item.start_place.properties.display_name = "Start"
            item.end_place.properties.display_name = "End"
            item.tagClass = "time-use-tag-dryleaf"
            item.colorClass = "time-use-color-dryleaf"
            timeUseTimeLineArray.push(item)
          });
        }
        else {
          Timeline.data.currDayTrips.forEach(function (item) {
            console.log(item)
            item.startTime = moment(item.start_place.properties.exit_fmt_time).format('hh:mm A')
            item.start = moment(item.start_place.properties.exit_fmt_time)
            item.endTime = moment(item.end_place.properties.enter_fmt_time).format('hh:mm A')
            item.end = moment(item.end_place.properties.enter_fmt_time)
            item.start_place.properties.display_name = "Start"
            item.end_place.properties.display_name = "End"
            item.tagClass = "time-use-tag-dryleaf"
            item.colorClass = "time-use-color-dryleaf"
            timeUseArray.forEach(function (timeUseItem) {
              if (timeUseItem.trip)
                if (timeUseItem.trip.data.properties.start_ts == item.properties.start_ts && timeUseItem.trip.data.properties.end_ts == item.properties.end_ts) {
                  item.main_labels = timeUseItem.main_labels
                  let purpuses = timeUseItem.main_labels[0] ? timeUseItem.main_labels[0].split(':')[1].split(',') : null
                  if (purpuses) {
                    if (purpuses.length == 1)
                      item.purpuses = purpuses[0]
                    else
                      item.purpuses = `${purpuses[0]} +${purpuses.length - 1}  other activities`
                  }
                  item.transport = timeUseItem.main_labels[1] ? timeUseItem.main_labels[1].split(': ')[1].split(',')[0] : null
                  item.transportIcon = selectTransportsIcon(item.transport)
                  item.tagClass = "time-use-tag-red"
                  item.colorClass = "time-use-color-red"
                }
            });
            timeUseTimeLineArray.push(item)
          });

        }
        console.log("timeUseArray", timeUseArray)
        timeUseArray.sort((a, b) => new moment(a.start) > new moment(b.start))
        $scope.timeUseArray = timeUseArray.filter((item) => !item.trip).filter((item) => !item.survay);
        console.log('--------- Arrays:')
        console.log(timeUseArray)
        console.log(timeUseTimeLineArray.filter((item) => !item.trip))
        return timeUseTimeLineArray.filter((item) => !item.trip);
      }

      function selectTransportsIcon(transport) {
        if (transport) {
          // transport = 'Walk'
          // Driver,Passenger,Walk,Bus,Train,Ferry,Tram,Taxi,Bike,Motorbike,Other
          if (transport == 'Driver')
            return 'ion-android-car'
          else if (transport == 'Passenger')
            return 'icon ion-bag'
          else if (transport == 'Walk')
            return 'ion-android-walk'
          else if (transport == 'Bus')
            return 'ion-android-bus'
          else if (transport == 'Train')
            return 'ion-android-train'
          else if (transport == 'Ferry')
            return 'ion-android-boat'
          else if (transport == 'Tram')
            return 'ion-android-subway'
          else if (transport == 'Taxi')
            return 'fa fa-taxi'
          else if (transport == 'Bike')
            return 'ion-android-bicycle'
          else if (transport == 'Motorbike')
            return 'fa fa-motorcycle'
          else
            return null
        }

      }

      function addTimeuseList(timeLineArray) {
        timeLineArray.forEach(function (timeLine, index) {
          let timeUseList = []
          let timeUseListAfter = []
          let timeUseListBefore = []
          $scope.timeUseArray.forEach(function (timeUse) {
            if (timeUse.start > timeLine.start && timeUse.start < timeLine.end)
              timeUseList.push(timeUse)
            if (index != (timeLineArray.length - 1)) {
              if (timeUse.start > timeLine.end && timeUse.start < timeLineArray[index + 1].start)
                timeUseListAfter.push(timeUse)
            }
            if (timeUse.start > timeLine.end && index == (timeLineArray.length - 1))
              timeUseListAfter.push(timeUse)
            if (timeUse.start < timeLine.start && index == 0)
              timeUseListBefore.push(timeUse)
          })
          timeLine.timeUseList = timeUseList
          timeLine.timeUseListAfter = timeUseListAfter
          timeLine.timeUseListBefore = timeUseListBefore
        })

        return timeLineArray
      }
      angular.extend($scope, {
        defaults: {
          zoomControl: false,
          dragging: false,
          zoomAnimation: true,
          touchZoom: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          boxZoom: false,
        }
      });

      angular.extend($scope.defaults, Config.getMapTiles())

      $scope.toDetail = function (param) {
        console.log(param)
        $state.go('root.main.diary-detail', {
          tripId: param
        });
        $scope.tripgj = Timeline.getTripWrapper(param);
        console.log($scope.tripgj)

      };
      $scope.promptRemove = ($event, timeUse) => {
        $event.stopPropagation();
        $ionicActionSheet.show({
          titleText: `Remove ${timeUse.main_label} ${timeUse.sub_label}?`,
          cancelText: $translate.instant("main-heatmap.cancel"),
          destructiveText: "Remove",
          destructiveButtonClicked: () => {
            $scope.removeAndRefresh(timeUse);
            return true;
          },
        });
      };
      $scope.promptMenu = ($event, timeUse, status, removable) => {
        $event.stopPropagation();
        var button_array = [];
        if (removable) {
          button_array.push({ text: 'Delete', id: 1 });
          button_array.push({ text: 'Edit', id: 2 });
        }
        if (status)
          button_array.push({ text: 'Add After' });
        $ionicActionSheet.show({
          cancelText: $translate.instant("main-heatmap.cancel"),
          buttons: button_array,
          buttonClicked: function (index, button) {
            console.log(button.text);
            if (button.id == 1)
              $scope.removeAndRefresh(timeUse);
            else if (button.id == 2)
              $scope.launchSurvey(timeUse)
            else
              $scope.launchSurvey(null, timeUse)
            return true;
          }
        });

      };
      $scope.removeAndRefresh = (timeUse) =>
        EnketoSurveyLaunch.remove(timeUse.id).then(() => $scope.refresh());

      /**
       * launchSurvey launch Enketo Time-use Survey
       */
      $scope.launchSurvey = (timeUse = undefined, lastTimeUse = undefined) => {
        const restoreAnswer = timeUse
          ? timeUse.instanceStr
          : getPrefillInstanceStr($scope.currDay, lastTimeUse);
        const survey = timeUse ? timeUse.survey : SURVEY_KEY;
        const forceHideNext =
          timeUse && timeUse.survey === TRIPCONFIRM_SURVEY_KEY ? false : true;
        const trip =
          timeUse && timeUse.survey === TRIPCONFIRM_SURVEY_KEY
            ? timeUse.trip
            : undefined;
        return EnketoSurveyLaunch.launch($scope, survey, {
          restoreAnswer,
          forceHideNext,
          trip,
        }).then((result) => {
          if (!result) {
            return;
          }
          if (timeUse) {
            EnketoSurveyLaunch.remove(timeUse.id).then(() => {
              if (($scope.currDay.isSame(moment()), "day")) {
                $scope.refresh();
              }
            });
            return;
          }
          if (($scope.currDay.isSame(moment()), "day")) {
            $scope.refresh();
          }
        });
      };

      /**
       * Private methods
       */

      /**
       * init initialize the controller
       */
      function init() {
        console.log("controller TimeUseListCtrl called");
        reset();
        onEnter(); // NOTE: Make sure dpOpts is initialized atleast once
        $scope.refresh(moment());
      }

      /**
       * reset the state inside $scope object
       */
      function reset() {
        $scope.currDay = undefined;
        $scope.currDayLabel = "";
        $scope.loading = false;
        $scope.timeUseArray = [];
        $scope.dpOpts = undefined;
      }

      /**
       * setCurrDay set currDay and currDayLabel
       * @param {object} day Moment object
       */
      function setCurrDay(day) {
        $scope.currDay = day;
        $scope.currDayLabel = $scope.currDay.format("LL");
      }

      /**
       * setLoading set loading
       * @param {boolean} loading loading state
       */
      function setLoading(loading) {
        $scope.loading = loading;
        if (loading) {
          $ionicLoading.show({ template: $translate.instant("loading") });
        } else {
          $ionicLoading.hide();
        }
      }

      /**
       * timeUseArray set $scope.timeUseArray
       * @param {TimeUse[]} timeUseArray Time-use array
       */
      function setUseArray(timeUseArray) {
        // let timeUseArrayWithGap = addGapTime(timeUseArray);
        // $scope.timeUseArray = timeUseArrayWithGap;
        $scope.timeUseArray = timeUseArray;
      }


      function setTimeLineArray(timeLineArray) {
        // let timeUseArrayWithGap = addGapTime(timeUseArray);
        // $scope.timeUseArray = timeUseArrayWithGap;
        $scope.timeLineArray = timeLineArray;
      }


      /**
       * addGapTime adds Gap time to the timeUseArray
       * @param {TimeUse[]} timeUseArray Time-use array
       */
      function addGapTime(timeUseArray) {
        let timeUseArrayWithGap;
        if (timeUseArray.length > 0)
          for (var x = 0; x < timeUseArray.length; x++) {
            if (x + 1 != timeUseArray.length) {
              if (
                moment(timeUseArray[x].end).format("hh:mm") !=
                moment(timeUseArray[x + 1].start).format("hh:mm")
              ) {
                timeUseArray[x].add_icon_status = true;
                timeUseArray[x].nextTimeUseStart = timeUseArray[x + 1].start;
              }
            } else {
              timeUseArray[x].add_icon_status = true;
              timeUseArray[x].nextTimeUseStart = null;
            }
          }
        timeUseArrayWithGap = timeUseArray;
        return timeUseArrayWithGap;
      }

      /**
       * getDatePickerOptions return date picker options for the current date
       * @returns {object} DatePicker options
       */
      function getDatePickerOptions() {
        return {
          todayLabel: $translate.instant("list-datepicker-today"), //Optional
          closeLabel: $translate.instant("list-datepicker-close"), //Optional
          setLabel: $translate.instant("list-datepicker-set"), //Optional
          monthsList: moment.monthsShort(),
          weeksList: moment.weekdaysMin(),
          titleLabel: $translate.instant("diary.list-pick-a-date"),
          setButtonType: "button-positive", //Optional
          todayButtonType: "button-stable", //Optional
          closeButtonType: "button-stable", //Optional
          inputDate: new Date(), //Optional
          from: new Date(2015, 1, 1),
          to: new Date(),
          mondayFirst: true, //Optional
          templateType: "popup", //Optional
          showTodayButton: "true", //Optional
          modalHeaderColor: "bar-positive", //Optional
          modalFooterColor: "bar-positive", //Optional
          callback: (day) => {
            $scope.refresh(moment(day));
            $scope.dpOpts.inputDate = $scope.currDay.toDate();
          }, //Mandatory
          dateFormat: "dd MMM yyyy", //Optional
          closeOnSelect: true, //Optional
        };
      }

      function getTz() {
        return moment.tz.guess();
      }

      /**
       * answersToTimeUseArray convert enketo answer array to time-use array
       * @param {object[]} answers enketo answer array
       * @returns {TimeUse[]} time-use array
       */
      function answersToTimeUseArray(answers) {
        return answers.map((answer) => {
          // console.log(answer);
          const response = answer.data.response;
          const dateStr = response.activity_startdate.split("T")[0];
          const start = moment(
            new Date(`${dateStr}T${response.activity_starttime}`)
          );
          const end = moment(
            new Date(`${dateStr}T${response.activity_endtime}`)
          );
          // const tz = moment.tz.guess();
          // let endLabelSuffix = '';
          // if (moment(start).tz(tz).startOf('minute').isAfter(moment(end).tz(tz).startOf('minute'))) {
          //   endLabelSuffix = ' (+1 day)';
          // }
          return {
            id: answer.data.id,
            start,
            end,
            main_label: response.main_label,
            main_labels: response.main_label.split("\\n"),
            sub_label: response.sub_label.split(' (')[0].replace(/\s/g, ''),
            instanceStr: answer.data.xmlResponse,
            survey: SURVEY_KEY,
            tagClass: "time-use-tag-primary",
            colorClass: "time-use-color-primary",
            removable: true,
            trip: undefined,
            // label: answer.data.label,
            // startLabel: moment(start).format('LT'),
            // endLabel: `${moment(end).format('LT')}${endLabelSuffix}`,
            // activityLabel: response.main_activity,
          };
        });
      }

      function tripConfirmAnswersToTimeUseArray(answers) {
        return answers.map((answer) => {
          const tz = getTz();
          const start = moment(answer.data.start_ts * 1000).tz(tz);
          const end = moment(answer.data.end_ts * 1000).tz(tz);
          const startLabel = start.format("LT");
          const endLabel = end.format("LT");
          let endLabelSuffix = "";
          if (
            moment(start)
              .tz(tz)
              .startOf("minute")
              .isAfter(moment(end).tz(tz).startOf("minute"))
          ) {
            endLabelSuffix = " (+1 day)";
          }
          const sub_label = `${startLabel} - ${endLabel}${endLabelSuffix}`;
          return {
            id: answer.data.id,
            start,
            end,
            main_label: answer.data.response.main_label,
            main_labels: answer.data.response.main_label.split("\\n"),
            sub_label,
            instanceStr: answer.data.xmlResponse,
            survey: TRIPCONFIRM_SURVEY_KEY,
            tagClass: "time-use-tag-red",
            removable: false,
            trip: createFakeTripForTripConfirmAnswer(answer),
          };
        });
      }

      function dedupTripConfirmAnswers(answers) {
        return answers.filter((answerA, i, array) => {
          const firstIndex = array.findIndex((answerB) => {
            return (
              answerA.data.start_ts === answerB.data.start_ts &&
              answerA.data.end_ts === answerB.data.end_ts
            );
          });
          return firstIndex === i;
        });
      }

      function createFakeTripForTripConfirmAnswer(answer) {
        return {
          data: {
            properties: {
              start_ts: answer.data.start_ts,
              end_ts: answer.data.end_ts,
            },
          },
        };
      }

      /**
       * filterByCurrDay filter time-use array by $scope.currDay
       * @param {TimeUse[]} timeUseArray Time-use object array
       * @returns {TimeUse[]} filtered Time-use object array
       */
      function filterByCurrDay(timeUseArray) {
        const tz = moment.tz.guess();
        const startOfDay = moment($scope.currDay).tz(tz).startOf("d");
        const endOfDay = moment($scope.currDay).tz(tz).endOf("d");
        return timeUseArray.filter(
          (result) =>
            result.start.isSameOrAfter(startOfDay) &&
            result.start.isSameOrBefore(endOfDay)
        );
      }

      function getPrefillInstanceStr(date = moment(), lastTimeUse = undefined) {
        return `
    <data xmlns:jr="http://openrosa.org/javarosa"
     xmlns:odk="http://www.opendatakit.org/xforms"
     xmlns:orx="http://openrosa.org/xforms"
     id="snapshot_xml">
      <activity_startdate>${date.format("YYYY-MM-DD")}</activity_startdate>
      ${lastTimeUse
            ? `<activity_starttime>${moment(lastTimeUse.end).format(
              "HH:mm:ss.000+10:00"
            )}</activity_starttime>
      <activity_endtime>${moment(lastTimeUse.nextTimeUseStart).format(
              "HH:mm:ss.000+10:00"
            )}</activity_endtime>`
            : null
          } 
    </data>
    `;
      }

      function fillLines(timeUseArray) {
        let maxLine = 1;
        for (let i = 0; i < timeUseArray.length; i++) {
          const timeUse = timeUseArray[i];
          const lines = timeUse.main_labels.length;
          if (lines > maxLine) {
            maxLine = lines;
          }
        }
        for (let i = 0; i < timeUseArray.length; i++) {
          const timeUse = timeUseArray[i];
          const lines = timeUse.main_labels.length;
          const diff = maxLine - lines;
          if (diff) {
            timeUseArray[i].main_labels.push("&nbsp;");
          }
        }
        return timeUseArray;
      }

      /**
       * Event listeners
       */
      function onEnter() {
        // refresh date picker options (in case the day has changed)
        $scope.dpOpts = getDatePickerOptions();
        if ($rootScope.dpSyncTimeUseTab) {
          $rootScope.dpSyncTimeUseTab = false;
          $scope.refresh($rootScope.dpSyncCurrDay, true);
        }
      }

      /**
       * Explicit constructor
       * init will get called when the tab is displayed for the first time only.
       */
      $scope.$on("$ionicView.afterEnter", onEnter);
      // NOTE: We need to call init after ionic platform is ready.
      // Otherwise, $window object will be undefined.
      $ionicPlatform.ready().then(init);
    }
  )
  .filter("unsafe", function ($sce) {
    return $sce.trustAsHtml;
  });
