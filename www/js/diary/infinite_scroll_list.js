'use strict';

/*
 * The general structure of this code is that all the timeline information for
 * a particular day is retrieved from the Timeline factory and put into the scope.
 * For best performance, all data should be loaded into the in-memory timeline,
 * and in addition to writing to storage, the data should be written to memory.
 * All UI elements should only use $scope variables.
 */

import angular from 'angular';
import TimelineScrollList from './list/LabelTab';

angular.module('emission.main.diary.infscrolllist',[
                                      'emission.plugin.logger',
                                      'emission.survey',
                                      'emission.main.diary.services',
                                      TimelineScrollList.module,
                                    ])

// controller not needed; all logic has been replaced by TimelineScrollList
.controller("InfiniteDiaryListCtrl", function() {});
