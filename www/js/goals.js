'use strict';

angular.module('emission.main.goals',['emission.services', 'emission.plugin.logger',
                'emission.survey.launch',
                'ngSanitize', 'ngAnimate',
                'emission.splash.referral', 'angularLocalStorage',
                'ng-walkthrough', 'nzTour'])

.controller('GoalsCtrl', function(CommHelper, $state, $ionicLoading, $scope, $rootScope, $ionicModal, nzTour,
                                $window, $http, $ionicPopup, $timeout, storage, ReferralHandler, ReferHelper, Logger, $cordovaInAppBrowser, SurveyLaunch) {
    $scope.goals = [];
    $scope.goal = {};
    $scope.challenges=[];
    $scope.challengeInfoArray = [];
    $scope.challengeToView = {};
    var partyId;
    var userId;
    $scope.joinedChallenges = [];
    $scope.plusInProcess = {};
    $scope.minusInProcess = {};
    var prepopulateMessage = {};
    var floatHp;
    var floatGold;
    var refresh;
    var HABITICA_REGISTERED_KEY = 'habitica_registered';
    //var challengeMembersId = [];
    
    // THIS BLOCK FOR inAppBrowser
    $rootScope.$on("RELOAD_GOAL_PAGE_FOR_REFERRAL", function(event) {
      Logger.log("Received referral event, current state is "+$state.$current.name);
      if ($state.$current.name == 'root.main.goals') {
        refreshInfo();
      }
    });

    $ionicModal.fromTemplateUrl('templates/goals/goal-modal.html', {
        scope: $scope,
        animation: 'slide-in-up'
    }).then(function(modal) {
        $scope.modal = modal;
    });

    $ionicModal.fromTemplateUrl('templates/goals/party-members.html', {
        scope: $scope,
        animation: 'slide-in-up'
    }).then(function(modal) {
        $scope.partyModal = modal;
    });

    $ionicModal.fromTemplateUrl('templates/goals/leaderboard-modal.html', {
        scope: $scope,
        animation: 'slide-in-up'
    }).then(function(modal) {
        $scope.leaderboardModal = modal;
    });

    $ionicModal.fromTemplateUrl('templates/goals/challenge-modal.html', {
        scope: $scope,
        animation: 'slide-in-up'
    }).then(function(modal) {
        $scope.challengeModal = modal;
    });

    $ionicModal.fromTemplateUrl('templates/goals/challenge-detail.html', {
        scope: $scope,
        animation: 'slide-in-left'
    }).then(function(modal) {
        $scope.challengeDetailModal = modal;
    });

    var joinGroupSuccess = function() {
       refreshInfo();
       var alertPopup = $ionicPopup.alert({
         title: 'Cool!',
         template: 'You have successfully joined the group!'
       });

       alertPopup.then(function(res) {
       });
    };

    var joinGroupFail = function(error) {
       var displayMsg = error;
       if ((error.indexOf("error 400") != -1) || (error.indexOf("400 Bad Request"))) {
          displayMsg = "You are already part of a group! If you want to accept "+
           "this invite, please leave your current group using the Advanced tab "+
            "and then click on this link again to join"
       }

       var alertPopup = $ionicPopup.alert({
         title: 'Error while joining group!',
         template: displayMsg
       });

       alertPopup.then(function(res) {
       });
       $ionicLoading.hide();
    };

    var showNeedRegister = function() {
     var confirmPopup = $ionicPopup.confirm({
       title: 'Join Group',
       template: 'A friend invited you to join a group, but you need to sign up first. (Pressing "Cancel" will reject the invite)'
     });

        confirmPopup.then(function(res) {
           if(res) { // to game page
             console.log('User should register');
           } else { // do nothing
             console.log('User decides not to register or join group');
             ReferralHandler.clearGroupReferral();
           }
        })
    };

    /*
     * Truth table:
     * registered & referred => join group
     * registered & not referred => do nothing
     * not registered & referred => suggest registration
     * not registered & not referred => do nothing
     */
    var handlePendingRefer = function() {
        Logger.log("About to handle pending referral");
        if (storage.get(HABITICA_REGISTERED_KEY) == true) {
            Logger.log("Registered with habitica - checking pending registration");
            if (ReferralHandler.hasPendingRegistration() == true) {
                Logger.log("Registration is pending, calling joinGroup");
                var params = ReferralHandler.getReferralParams()
                var groupid = params[0];
                var userid = params[1];
                ReferHelper.joinGroup(groupid, userid).then(
                    joinGroupSuccess, joinGroupFail
                )
                ReferralHandler.clearGroupReferral();
            }
        } else {
            Logger.log("Not yet registered with habitica, showing registration dialog");
            if (ReferralHandler.hasPendingRegistration() == true) {
                showNeedRegister();
            }
        }
    }

    //var element = angular.element(document.querySelector('#todo'));

    /*$scope.data = {
        showDelete: false
    };*/
    $scope.toBrowser = function() {     
            var options = {       
              location: 'no',     
              clearcache: 'no',       
              toolbar: 'yes'      
            };        
      
            var settings = localStorage.getItem("habit-mobile-settings");     
      
          $rootScope.$on('$cordovaInAppBrowser:loadstop', function(e, event){     
            // insert Javascript via code / file      
            if (event.url == 'https://em-game.eecs.berkeley.edu/static/front' ||      
                event.url == 'https://em-game.eecs.berkeley.edu/static/front#/tasks') {       
                $cordovaInAppBrowser.executeScript({      
                  code: "localStorage.setItem('habit-mobile-settings', '" + settings + "');"      
                  + "window.location.href = 'https://em-game.eecs.berkeley.edu/#/tasks';"     
                });       
            } else {      
                Logger.log("checking for game loadstop, finished loading url "+event.url+" ignoring...");     
            }     
          });     
        $cordovaInAppBrowser.open('https://em-game.eecs.berkeley.edu/#/tasks', '_blank', options)     
          .then(function(event) {     
            // success        
          })      
          .catch(function(event) {        
            // error      
          });
       
    };

    $scope.openLeaderboard = function() {
        $scope.leaderboardModal.show();
        allUsersForLeaderBoard();
    };
    $scope.closeLeaderboard = function() {
        $scope.leaderboardModal.hide();
    };
    $scope.openChallenge = function() {
        $scope.challengeModal.show();
    };
    $scope.closeChallenge = function() {
        $scope.challengeModal.hide();
    };
    var openChallengeDetail = function() {
        $scope.challengeDetailModal.show();
    };
    $scope.closeChallengeDetail = function() {
        $scope.challengeDetailModal.hide();
    };
    $scope.openPartyModal = function() {
        $scope.partyModal.show();
    };
    $scope.closePartyModal = function() {
        $scope.partyModal.hide();
    };

    $scope.openModal = function() {
        $scope.modal.show();
    };
    $scope.closeModal = function() {
        $scope.goal = {};
        $scope.modal.hide();
    };
    $scope.createGoal = function () {
        $scope.goals.push($scope.goal);
        $scope.goal = {};
        $scope.modal.hide();
    };

    $scope.removeGoal = function(goal) {
        $scope.goals.splice($scope.goals.indexOf(goal), 1);
    };

    $scope.viewChallenge = function(challenge) {
        $scope.challengeToView = challenge;
        $scope.challengeInfoArray = [];
        if($scope.profile.challenges.indexOf(challenge.id) > -1)
            challengeLeaderboard(challenge.id);
        openChallengeDetail();
    }

    $scope.theUser = {};
    $scope.signup = function(){
        console.log($scope.theUser.username);
        var regConfig = {'username': $scope.theUser.username};
        console.log(regConfig);
        $ionicLoading.show({
            template: '<ion-spinner icon="bubbles"></ion-spinner>'
        });
        CommHelper.habiticaRegister(regConfig).then(function(response) {
            console.log("Success!");
            console.log(response);
            storage.set('party_id',response.habitica_group_id);
            storage.set(HABITICA_REGISTERED_KEY, true);
            refreshInfo();
        }, function(error) {
            $ionicLoading.hide();
            $ionicPopup.alert({title: "<h4 class='center-align'>Username is Required</h4>",
                                okText: "Try Again",
                                okType: "button-assertive"});
            console.log("Not signed up");
        });
    };


    $ionicLoading.show({
            template: '<ion-spinner icon="bubbles"></ion-spinner>'
    });

    var getUserInfo = function(){
        var callOpts = {'method': 'GET', 'method_url': "/api/v3/user",
                        'method_args': null};

        CommHelper.habiticaProxy(callOpts).then(function(response){
            localStorage.setItem("habit-mobile-settings", JSON.stringify({'auth': response.auth}));
            $scope.screen = response.success;
            $scope.$apply(function() {
                $scope.profile = response.data;
            });
            console.log("Proxy Sucess");
            userId = $scope.profile._id;
            $scope.exp = $scope.profile.stats.exp;
            $scope.gold = Math.round($scope.profile.stats.gp);
            floatGold = $scope.profile.stats.gp;
            $scope.hp = Math.round($scope.profile.stats.hp);
            floatHp = $scope.profile.stats.hp;
            $scope.gem = Math.round($scope.profile.balance);
            $scope.silver = Math.round(($scope.profile.stats.gp -
                Math.floor($scope.profile.stats.gp))*100);
            if(!('_id' in $scope.profile.party)){
                $scope.hasParty = false;
                partyId = storage.get('party_id');
            } else{
                $scope.hasParty = true;
                partyId = $scope.profile.party._id;
            }
            if($scope.profile.party.quest.RSVPNeeded==true){
                $scope.hasQuestRequest = true;
            } else{
                $scope.hasQuestRequest = false;
            }
            if('key' in $scope.profile.party.quest){
                if($scope.profile.party.quest.key == null){
                    $scope.inQuest = false;
                }else{
                    $scope.$apply(function(){
                        $scope.monster = $scope.profile.party.quest.key;
                    });
                    $scope.inQuest = true;
                }
            }
            if($scope.inQuest && refresh){
                questContent();
                refresh = false;
            }
            $scope.joinedChallenges = $scope.profile.challenges;
            getParty();
            getChallenges();
            console.log($scope.profile);
            prepopulateMessage = {
                message: 'Fight the global warming monster with me (link joins group, reshare responsibly)',
                subject: 'Help Berkeley become more bikeable and walkable',
                url: 'https://e-mission.eecs.berkeley.edu/redirect/join?groupid=' + partyId + '&userid=' + userId
            };
            $ionicLoading.hide();
            }, function(error){
                $scope.screen = false;
                $ionicLoading.hide();
                console.log("User profile error");
            });
    };

    var getUserTask = function(){
        var callOpts = {'method': 'GET', 'method_url': "/api/v3/tasks/user",
                    'method_args': null};
        var tasks;
        CommHelper.habiticaProxy(callOpts).then(function(response){
            $scope.$apply(function() {
                tasks = response.data;
            });
            $scope.goals = [];
            console.log(tasks);
                for(var habit in tasks){
                    if(tasks[habit].type == "habit"){
                        $scope.goal.name = tasks[habit].text;
                        $scope.goal.note = tasks[habit].notes;
                        $scope.goal._id = tasks[habit]._id;
                        $scope.goal.down = tasks[habit].down;
                        $scope.goal.up = tasks[habit].up;
                        var value = tasks[habit].value;
                        if(value<=-20)
                            $scope.goal.value = "negative_big";
                        if(value>-20&&value<=-10)
                            $scope.goal.value = "negative";
                        if(value>-10&&value<=10)
                            $scope.goal.value = "normal";
                        if(value>10&&value<=20)
                            $scope.goal.value = "positive";
                        if(value>20)
                            $scope.goal.value = "positive_big";
                        $scope.createGoal();
                    }
                }
            }, function(error){
                console.log("User task error");
        });
    };

    $scope.createGoalPhone = function() {
        var up;
        var down;
        if($scope.goal.up==true && $scope.goal.down==null){
            up = true;
            down = false;
        } else if($scope.goal.up==null && $scope.goal.down==true){
            down = true;
            up = false;
        }
        var callOpts = {'method': 'POST', 'method_url': "/api/v3/tasks/user",
                        'method_args': {'type': "habit", 'text': $scope.goal.name, 'notes': $scope.goal.note,
                                            'up': up , 'down': down}};

        CommHelper.habiticaProxy(callOpts).then(function(response){
                $scope.goal._id = response.data._id;
                $scope.goal.up = response.data.up;
                $scope.goal.down = response.data.down;
                $scope.goal.value = "normal";
                console.log(response.data);
                $scope.createGoal();
                console.log("Sucessfully added the habit");
                $scope.goal = {};
                $scope.modal.hide();
            }, function(error){
                console.log(JSON.stringify(error));
                console.log("error");
            });
    };


    $scope.deleteGoal = function(taskId,  goal) {
        $scope.removeGoal(goal);
        var callOpts = {'method': 'DELETE', 'method_url': "/api/v3/tasks/"+taskId,
                        'method_args': null};

        CommHelper.habiticaProxy(callOpts).then(function(response){
                console.log("Sucessfully deleted the habit");
            }, function(error){
                console.log(JSON.stringify(error));
                console.log("error");
            });
    };

    $scope.scoreUp = function(taskId) {
        var callOpts = {'method': 'POST', 'method_url': "/api/v3/tasks/"+taskId+"/score/up",
                        'method_args': null};
        $scope.plusInProcess[taskId] = true;
        CommHelper.habiticaProxy(callOpts).then(function(response){
                console.log("Score up");
                console.log(response);
                if($scope.exp > response.data.exp){
                    $scope.gainedExp = ($scope.toNextLevel - $scope.exp) + response.data.exp;
                } else{
                    $scope.gainedExp = response.data.exp - $scope.exp;
                }
                $scope.gainedGold = (response.data.gp - floatGold).toFixed(2);
                //if(response.data.hp > floatHp){
                //  $scope.gainedHp = (response.data.hp - floatHp).toFixed(2);
                //  console.log($scope.gainedHp);
                //}
                console.log($scope.gainedGold);
                console.log($scope.gainedExp);
                getUserInfo();
                getUserTask();
                $scope.reward = true;
                $timeout(function() {
                    $scope.reward = false;
                    $scope.plusInProcess[taskId] = false;
                }, 2000);
            }, function(error){
                console.log(JSON.stringify(error));
                console.log("error");
            });
    };

    $scope.scoreDown = function(taskId) {
        var callOpts = {'method': 'POST', 'method_url': "/api/v3/tasks/"+taskId+"/score/down",
                        'method_args': null};
        $scope.minusInProcess[taskId] = true;
        CommHelper.habiticaProxy(callOpts).then(function(response){
                console.log("Score down");
                console.log(response);
                $scope.lossHp = (floatHp - response.data.hp).toFixed(2);
                console.log($scope.lossHp);
                getUserInfo();
                getUserTask();
                $scope.loss = true;
                $timeout(function() {
                    $scope.loss = false;
                    $scope.minusInProcess[taskId] = false;
                }, 2000);
            }, function(error){
                console.log(JSON.stringify(error));
                console.log("error");
            });
    };

    $scope.joinParty = function() {
        var callOpts = {'method': 'POST', 'method_url': "/api/v3/groups/"+partyId+"/join",
                        'method_args': null};

        CommHelper.habiticaProxy(callOpts).then(function(response){
                console.log("Sucessfully joing the party");
                $scope.$apply(function(){
                    $scope.hasParty = true;
                });
                getMembers();
                console.log(response);
            }, function(error){
                console.log("Error when joining the party");
                console.log(error);
            });
    };

    $scope.joinQuest = function() {
        var callOpts = {'method': 'POST', 'method_url': "/api/v3/groups/"+partyId+"/quests/accept",
                        'method_args': null};

        CommHelper.habiticaProxy(callOpts).then(function(response){
                console.log("Sucessfully joing the quest");
                $scope.$apply(function(){
                    $scope.hasQuestRequest = false;
                });
                console.log(response);
            }, function(error){
                console.log("Error when joining the quest");
            });
    };

    $scope.rejectQuest = function() {
        var callOpts = {'method': 'POST', 'method_url': "/api/v3/groups/"+partyId+"/quests/reject",
                        'method_args': null};

        CommHelper.habiticaProxy(callOpts).then(function(response){
                console.log("Sucessfully rejected the quest");
                $scope.$apply(function(){
                    $scope.hasQuestRequest = false;
                    $scope.inQuest = false;
                });
                console.log(response);
            }, function(error){
                console.log("Error when rejecting the quest");
            });
    };

    var getParty = function() {
        var callOpts = {'method': 'GET', 'method_url': "/api/v3/groups/party",
                    'method_args': null};
        CommHelper.habiticaProxy(callOpts).then(function(response){
            console.log("Sucessfully got the party");
            var partyObj = response.data;
            $scope.questActive = partyObj.quest.active;
            if($scope.questActive){
                $scope.bossHp = Math.round(partyObj.quest.progress.hp);
            }
            $scope.partyName = partyObj.name;
            console.log("In quest: " + $scope.inQuest);
            console.log("Quest is active: " + $scope.questActive);
            console.log(response);
        }, function(error){
            console.log("Error when getting the party");
        });
    };

    $scope.party = {};
        $scope.createParty = function() {
        if (!angular.isUndefined($scope.party.name)) {
            var callOpts = {'method': 'POST', 'method_url': "/api/v3/groups",
                            'method_args': {'type': 'party', 'privacy': 'private', 'name': $scope.party.name}}
            CommHelper.habiticaProxy(callOpts).then(function(response) {
                console.log("created party");
                $scope.$apply(function(){
                    $scope.hasParty = true;
                });
                refreshInfo();
                console.log(response);
            }, function(error) {
                console.log("Error createing party");
            })
        } else {
            $ionicPopup.alert({"template": "Please specify a name"});
        }
    };

    var questContent = function(){
        var callOpts = {'method': 'GET', 'method_url': "/api/v3/content",
                    'method_args': null};
        CommHelper.habiticaProxy(callOpts).then(function(response){
            console.log("Sucessfully got the content");
                var content = response.data;
                console.log(content);
            if($scope.inQuest){
                console.log("Current monster: " + $scope.monster);
                $scope.bossMaxHealth = content.quests[$scope.monster].boss.hp;
                $scope.bossName = content.quests[$scope.monster].boss.name;
                $scope.questNote = content.quests[$scope.monster].notes;
            }
        }, function(error){
            console.log("Error when getting the content");
        });
    };

    var users = [];
    var partyList = [];
    $scope.userParty = [];
    var allUsersForLeaderBoard = function(){
        var callOpts = {'method': 'GET', 'method_url': "/api/v3/members/all",
                    'method_args': null};
        $ionicLoading.show({
            template: '<ion-spinner icon="bubbles"></ion-spinner>'
        });
        CommHelper.habiticaProxy(callOpts).then(function(response){
            console.log("Sucessfully got all the users");
            var allUsers = response.data;
            var ignoreList = ['Superb Girl','Test-em-mri','Test_em-mr','Test_berkeley',
                        'Abcdef','admin','Ucb.sdb.android.3','Ucb.sdb.android.1','Test', 'Test100',
                        "Em Jr. #4", "Em jr#3", "Em_MR_2", 'MpoOR', 'QH9Ht', 'ZLsYA', 'Fe5Be', "UHJR8"];
            users = allUsers.filter(function(obj) {
                return ignoreList.indexOf(obj.profile.name) === -1;
            });
            users = users.filter(function(obj){
                return obj.profile.name.slice(0,14).toLowerCase() !== 'e-mission-test';
            });
            users = roundExp(users);
            sortForLeaderboard(users);
            users = addRank(users);
            console.log("Sucessfully sorted all the users");
            var threeUsers = users.slice(0,3);
            $scope.topThreeUsers = [];
            $scope.topThreeUsers.push(threeUsers[1]);
            $scope.topThreeUsers.push(threeUsers[0]);
            $scope.topThreeUsers.push(threeUsers[2]);
            $scope.usersUnderTopThree = users.slice(3);
            getPartyForAllUsers(users);
            setRank(partyList);
            $ionicLoading.hide();
        }, function(error){
            console.log("Error getting all the users");
            console.log(error);
        });
    };

    var getPartyForAllUsers = function(users) {
        partyList = [];
        for (var i = 0; i < users.length; i++) {
            var partyInList = false;
            if('_id' in users[i].party){
                if(partyList.length === 0){
                    var party = {'_id' : users[i].party._id, 'members': [users[i]], 'partyObj': {}, 'stats':{}};
                    getPartyById(users[i].party._id, 0);
                    partyList.push(party);
                } else {
                    for (var j = 0; j < partyList.length; j++) {
                        if(partyList[j]._id === users[i].party._id){
                            partyList[j].members.push(users[i]);
                            partyInList = true;
                        }
                    }
                    if(!partyInList) {
                        party = {'_id' : users[i].party._id, 'members': [users[i]], 'partyObj': {}, 'stats':{}};
                        getPartyById(users[i].party._id, j);
                        partyList.push(party);
                    }
                }
            }
        }
    };

    var getPartyById = function(id, j) {
        var callOpts = {'method': 'GET', 'method_url': "/api/v3/groups/"+id,
                    'method_args': null};
        CommHelper.habiticaProxy(callOpts).then(function(response){
            console.log("Sucessfully got a user's party");
            partyList[j].partyObj = response.data;
        }, function(error){
            console.log("Error when getting a user's party");
        });
    };

    var setRank = function(partyList) {
        partyList.forEach(function(party){
            var totalLvl = 0;
            var totalExp = 0;
            var memberCount = 0; //Can't use member count of the partyObj, when a member is deleted from DB there is an invisible member count
            party.members.forEach(function(member) {
                totalLvl += member.stats.lvl;
                totalExp += member.stats.exp;
                memberCount++;
            });
            party.stats.lvl = totalLvl;
            party.stats.exp = totalExp;
            party.memberCount = memberCount;
            if(party._id === $scope.profile.party._id){
                var dupMember = angular.copy(party.members);
                $scope.userParty = addRank(dupMember);
            }
        });
        partyList = partyList.filter(function(obj){
            return obj.memberCount > 1;
        });
        sortForLeaderboard(partyList);
        partyList = addRank(partyList);
        $scope.partys = partyList;
    };

    var getChallenges = function() {
        var callOpts = {'method': 'GET', 'method_url': '/api/v3/challenges/user', 
                    'method_args': null};
        CommHelper.habiticaProxy(callOpts).then(function(response){
            console.log("Got challenges");
            $scope.challenges = response.data;
            console.log(response.data);
        }, function(error){
            console.log("Error getting challenges");
            console.log(error);
        });
    };

    var roundExp = function(list){
        for (var i = 0; i < list.length; i++) {
           list[i].stats.exp = Math.round(list[i].stats.exp);
        }
        return list;
    };

    var sortForLeaderboard = function(list){
        list.sort(function(a, b){
            var c = b.stats.lvl - a.stats.lvl;
            if (c !== 0)
                return c;
            return b.stats.exp - a.stats.exp;
        });
    };

    var sortForChallenge = function(list) {
        list.sort(function(a,b) {
            return b[2] - a[2];
        })
    }

    function toObject(array) {
        var obj = {
            'id':array[0],
            'username':array[1],
            'value':isNaN(array[2])?0:array[2],
            'rank':array[3]
        };
        return obj;
    }

    var toObjectsForChallenge = function(list) {
        for (var i = 0; i < list.length; i++) {
           list[i][2] = Math.round(list[i][2]);
           list[i][3] = i+1;
           list[i] = toObject(list[i])
        }
        return list;
    }

    var addRank = function(list){
        for (var i = 0; i < list.length; i++) {
           list[i].rank = i+1;
        }
        return list;
    };

    $scope.uictrl = {
      showIndividual: true,
      showGroup: false,
      showVis: true,
    };
    //Using metrics.js chart and summary button switch for individual and group
    $scope.groupButtonClass = function() {
      return $scope.uictrl.showGroup? "metric-chart-button-active hvcenter" : "metric-chart-button hvcenter";
    };
    $scope.individualButtonClass = function() {
      return $scope.uictrl.showIndividual? "metric-summary-button-active hvcenter" : "metric-summary-button hvcenter";
    };
    $scope.showGroup = function() {
      $scope.uictrl.showIndividual = false;
      $scope.uictrl.showGroup = true;
    };
    $scope.showIndividual = function() {
      $scope.uictrl.showIndividual = true;
      $scope.uictrl.showGroup = false;
    };

    $scope.joinChallenge = function(challengeId) {
        var callOpts = {'method': 'POST', 'method_url': "/api/v3/challenges/"+challengeId+"/join",
                            'method_args': null};

                CommHelper.habiticaProxy(callOpts).then(function(response){
                    console.log("Sucessfully joined the challenge");
                    getUserInfo();
                    getUserTask();
                    console.log(response);
                    $scope.challengeDetailModal.hide();
                }, function(error){
                    console.log("Error when joining the challenge");
                });
    };


    $scope.leaveChallenge = function(challengeId) {
        var callOpts = {'method': 'POST', 'method_url': "/api/v3/challenges/"+challengeId+"/leave",
                            'method_args': {'keep': 'remove-all'}};

                CommHelper.habiticaProxy(callOpts).then(function(response){
                    console.log("Sucessfully left the challenge");
                    getUserInfo();
                    getUserTask();
                    $scope.challengeDetailModal.hide();
                }, function(error){
                    console.log("Error when leaveing the challenge");
                });
    };

    var challengeLeaderboard = function(challengeId) {
        var callOpts = {'method': 'GET', 'method_url': "/api/v3/challenges/"+challengeId+"/leaderboard",
                            'method_args': null};
        $ionicLoading.show({
            template: '<ion-spinner icon="bubbles"></ion-spinner>'
        });
            CommHelper.habiticaProxy(callOpts).then(function(response) {
                console.log("Got challenge leaderboard")
                var res = response.data;
                sortForChallenge(res);
                $scope.challengeInfoArray = toObjectsForChallenge(res);
                console.log($scope.challengeInfoArray);
                $ionicLoading.hide();
            }, function(error) {
                $ionicLoading.hide();
                console.log("challenge leaderboard error")
                console.log(error);
            })
    }

    $scope.showChallenge = function(challenge) {
        $scope.challengeToView = challenge;
        console.log("Showing login challenge");
        $ionicPopup.show({
          title: 'Join Challenge',
          templateUrl: 'templates/goals/challenge-join-detail.html', 
          scope: $scope,
            buttons: [{
              text: 'Cancel',
              type: 'button-stable',
            }, {
              text: 'Join',
              type: 'button-positive',
              onTap: function(e) {
                $scope.joinChallenge(challenge.id)
              }
            }]
        });
    };


    //Tab switch
    $scope.isActive = false;
    var firstActive = true;
    $scope.activeButton = function() {
        if($scope.isActiveP == true){
            $scope.partyButton();
        }
        $scope.isActive = !$scope.isActive;
        //Scroll message
        if(firstActive){
            $timeout(function() {
                $scope.scrollMessage = true;
            }, 1000);
            $timeout(function() {
                $scope.scrollMessage = false;
            }, 4000);
            firstActive = false;
        }
    };

    $scope.isActiveP = false;
    $scope.partyButton = function() {
        if($scope.isActive == true){
            $scope.activeButton();
        }
        $scope.isActiveP = !$scope.isActiveP;
    };

    var refreshInfo = function(){
        console.log("Refreshing information");
        console.log("Party ID = " + storage.get('party_id'));
        refresh = true;
        if (storage.get(HABITICA_REGISTERED_KEY) == true) {
            getUserInfo();
            getUserTask();
        } else {
            $ionicLoading.hide();
        }
        handlePendingRefer();
    };

    //if (storage.get(HABITICA_REGISTERED_KEY) == true) {
       // getChallenges();
    //}
    refreshInfo();

    $scope.refreshPage = function() {
        console.log("Refreshing page");
        refreshInfo();
    };

    $scope.showCreds = function() {
        console.log("Showing login credentials");
        var email = $scope.profile.auth.local.email;
        $scope.profile.auth.local.password = email.substring(0, email.lastIndexOf("@"));
        $ionicPopup.show({
          title: 'Username and password', // String. The title of the popup.
          templateUrl: 'templates/goals/creds-modal.html', // String (optional). The html template to place in the popup body.
          scope: $scope,
            buttons: [{
              text: 'OK',
              type: 'button-positive',
            }]
        });
    };

    $scope.inviteToParty = function() {
        window.plugins.socialsharing.shareWithOptions(prepopulateMessage, function(result) {
            console.log("Shared?" + result.completed);
            console.log("Shared to app: " + result.app);
        }, function(err) {
            console.log("Failed to share the message: " + err);
        });
    }

    $scope.startSurvey = function () {
      // (URL, elementID)
      SurveyLaunch.startSurvey('https://berkeley.qualtrics.com/SE/?SID=SV_5pzFk7JnMkfWBw1', 'QR~QID2');
      // startSurvey();
    }

    // Tour steps
    var tour = {
      config: {

      },
      steps: [{
        target: '.retrieve-pw',
        content: 'Click here to retrieve your password and key for the game. To access the game on a web browser, go to https://em-game.eecs.berkeley.edu/'
      },
      {
        target: '.party',
        content: 'Click here to create a group for your team.'
      },
      {
        target: '.invite-friends',
        content: 'Grow your party by inviting friends to join you!'
      },
      {
        target: '.habit-list',
        content: 'Once you join a challenge, your goals will appear here.'
      }]
    };

    var startWalkthrough = function () {
      nzTour.start(tour);
    };

    $scope.startWalkthrough = function () {
      startWalkthrough();
    }

    /*
    * Checks if it is the first time the user has loaded the goals tab. If it is then
    * show a walkthrough and store the info that the user has seen the tutorial.
    */
    /*var checkGoalsTutorialDone = function () {
      var GOALS_DONE_KEY = 'goals_tutorial_done';
      var goalsTutorialDone = storage.get(GOALS_DONE_KEY);
      if (!goalsTutorialDone) {
        startWalkthrough();
        storage.set(GOALS_DONE_KEY, true);
      }
    };*/

    /*
     * Just to clean everything up.
     * TODO: Remove after a few releases.
     */
    var SURVEY_DONE_KEY = 'survey_done';
    storage.remove(SURVEY_DONE_KEY);
});
