'use strict';

angular.module('emission.main.goals',['emission.services', 'emission.plugin.logger',
                'ngSanitize', 'ngAnimate',
                'emission.splash.referral', 'angularLocalStorage',
                'ng-walkthrough', 'nzTour'])

.controller('GoalsCtrl', function(CommHelper, $state, $ionicLoading, $scope, $rootScope, $ionicModal, nzTour,
                                $window, $http, $ionicGesture, $ionicPopup, $timeout, storage, ReferralHandler, ReferHelper, Logger, $cordovaInAppBrowser){
    $scope.goals = [];
    $scope.goal = {};
    $scope.challenges=[];
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

    $ionicModal.fromTemplateUrl('templates/goals/browser.html', {
        scope: $scope,
        animation: 'slide-in-up'
    }).then(function(modal) {
        $scope.browserModal = modal;
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
       if (error.indexOf("Code=400") != -1) {
          displayMsg = "You are already part of a group! If you want to accept "+
           "this invite, please leave this group using the website and then "+
           "click on this link again to join"
       }

       var alertPopup = $ionicPopup.alert({
         title: 'Err!',
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
        if (storage.get(HABITICA_REGISTERED_KEY) == true) {
            if (ReferralHandler.hasPendingRegistration() == true) {
                var params = ReferralHandler.getReferralParams()
                var groupid = params[0];
                var userid = params[1];
                ReferHelper.joinGroup(groupid, userid).then(
                    joinGroupSuccess, joinGroupFail
                )
                ReferralHandler.clearGroupReferral();
            }
        } else {
            if (ReferralHandler.hasPendingRegistration() == true) {
                showNeedRegister();
            }
        }
    }

    /*$scope.onGesture = function(gesture) {
        console.log(gesture);
    }*/

    //var element = angular.element(document.querySelector('#todo'));

    /*$scope.data = {
        showDelete: false
    };*/
    $scope.toBrowser = function() {
            var options = {
              location: 'yes',
              clearcache: 'yes',
              toolbar: 'yes'
            };

            var settings = localStorage.getItem("habit-mobile-settings")

          $rootScope.$on('$cordovaInAppBrowser:loadstop', function(e, event){
            // insert Javascript via code / file
            $cordovaInAppBrowser.executeScript({
              code: "localStorage.setItem('habit-mobile-settings', '" + settings + "');" 
              + "window.location.href = 'https://em-game.eecs.berkeley.edu/#/tasks';"
            });

          });
        $cordovaInAppBrowser.open('https://em-game.eecs.berkeley.edu/#/tasks', '_blank', options)
          .then(function(event) {
            // success
          })
          .catch(function(event) {
            // error
          });

    };
    $scope.closeBrowser = function() {
        $scope.browserModal.hide();
    };
    $scope.openLeaderboard = function() {
        $scope.leaderboardModal.show();
    };
    $scope.closeLeaderboard = function() {
        $scope.leaderboardModal.hide();
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

    $scope.theUser = {};
    $scope.signup = function(){
        console.log($scope.theUser.username);
        var regConfig = {'username': $scope.theUser.username};
        console.log(regConfig);
        $ionicLoading.show({
            template: '<ion-spinner icon="bubbles" class="costume"></ion-spinner>'
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
            template: '<ion-spinner icon="bubbles" class="costume"></ion-spinner>'
    });

    var getUserInfo = function(){
        var callOpts = {'method': 'GET', 'method_url': "/api/v3/user",
                        'method_args': null};

        CommHelper.habiticaProxy(callOpts).then(function(response){
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
            getMembers();
            allUsersForLeaderBoard();
            /*if($scope.joinedChallenges.length > 0){
                getUserChallenges();
                getUserChallengeMembers();
            }*/
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
    //var allPartyList = [];
    var allUsersForLeaderBoard = function(){
        var callOpts = {'method': 'GET', 'method_url': "/api/v3/members/all",
                    'method_args': null};
        CommHelper.habiticaProxy(callOpts).then(function(response){
            console.log("Sucessfully got all the users");
            var allUsers = response.data;
            var ignoreList = ['Superb Girl','Test-em-mri','Test_em-mr','Test_berkeley',
                        'Abcdef','admin','Ucb.sdb.android.3','Ucb.sdb.android.1',
                        'Test', "Em Jr.#4", "Em jr#3", "Em_MR_2", ];
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
            //allPartyList = getPatyForAllUsers(users);
            console.log($scope.topThreeUsers);
            //console.log(allPartyList);
        }, function(error){
            console.log("Error getting all the users");
            console.log(error);
        });
    };

    /*var getPatyForAllUsers = function(users) {
        var partys = [];
        for (var i = 0; i < users.length; i++) {
            if('_id' in users[i].party){
                userParty = getPartyById(users[i].party._id);
                partys.push(userParty);
            } else {
                var noPartyObj = {'name': 'Has not joined a Party'};
                partys.push(noPartyObj);
            }
        }
        return partys;
    };

    var getPartyById = function(id) {
        var callOpts = {'method': 'GET', 'method_url': "/api/v3/groups/" + id,
                    'method_args': null};
        CommHelper.habiticaProxy(callOpts).then(function(response){
            console.log("Sucessfully a user's party");
            var partyObj = response.data;
            return partyObj;
        }, function(error){
            console.log("Error when getting a user's party");
        });
    };*/

    var getChallenges = function() {
        var callOpts = {'method': 'GET', 'method_url': '/api/v3/challenges/user', 
                    'method_args': null};
        $scope.challenges=[];
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

    var addRank = function(list){
        for (var i = 0; i < list.length; i++) {
           list[i].rank = i+1;
        }
        return list;
    };

    /*var getUserChallenges = function(){
        for(var challenge in $scope.joinedChallenges){
            var callOpts = {'method': 'GET', 'method_url': '/api/v3/challenges/' + $scope.joinedChallenges[challenge], 
                        'method_args': null};
            CommHelper.habiticaProxy(callOpts).then(function(response){
                console.log("Got user's challenges");
                console.log(response.data);
            }, function(error){
                console.log("Error getting user's challenges");
                console.log(error);
            });
        }
    };

    var getUserChallengeMembers = function() {
        for(var challenge in $scope.joinedChallenges){
                var callOpts = {'method': 'GET', 'method_url': '/api/v3/challenges/' + $scope.joinedChallenges[challenge]+'/members?includeAllMembers=true',
                            'method_args': null};
                CommHelper.habiticaProxy(callOpts).then(function(response){
                console.log("Got joined challenges' members");
                var members = response.data;
                members.forEach(function(user){
                    challengeMembersId.push(user.id);
                });
                console.log(challengeMembersId);
                getchallengeMemberProfile();
            }, function(error){
                console.log("Error getting joined challenges' member");
                console.log(error);
            });
        }
    };

    var getchallengeMemberProfile = function() {
        for(var memberId in challengeMembersId){
            var callOpts = {'method': 'GET', 'method_url': '/api/v3/members/' + challengeMembersId[memberId],
                            'method_args': null};
                CommHelper.habiticaProxy(callOpts).then(function(response){
                console.log("Got challenge members' profile");
                console.log(response.data);
            }, function(error){
                console.log("Error getting challenge members' profile");
                console.log(error);
            });
        }
    };*/

    var getMembers = function() {
        var callOpts = {'method': 'GET', 'method_url': "/api/v3/groups/"+partyId+"/members?includeAllPublicFields=true",
                    'method_args': null};

        CommHelper.habiticaProxy(callOpts).then(function(response){
            $scope.membersName=[];
            console.log("Sucessfully got the members");
            var members = response.data;
            console.log(response.data);
            members.forEach(function(user){
                $scope.membersName.push(user.profile.name);
            });
        }, function(error){
            console.log("Error when fetching members");
            console.log(error);
        });
    };

    /*var bikeChallenge = function() {
        var callOpts = {'method': 'GET', 'method_url': "/api/v3/challenges/8a8134d6-066d-424d-8f3d-0b559c2c1e78",
                            'method_args': null};

                CommHelper.habiticaProxy(callOpts).then(function(response){
                    console.log("Sucessfully got bike challenge");
                    console.log(response);
                    $scope.challenges.push(response.data);
                }, function(error){
                    console.log("Error when getting bike challenge");
                });
    };

    var carpoolChallenge = function() {
        var callOpts = {'method': 'GET', 'method_url': "/api/v3/challenges/d3e0ee13-8922-47ef-86a0-2c2f662585e1",
                            'method_args': null};

                CommHelper.habiticaProxy(callOpts).then(function(response){
                    console.log("Sucessfully got carpool challenge");
                    console.log(response);
                    $scope.challenges.push(response.data);
                }, function(error){
                    console.log("Error when getting carpool challenge");
                });
    };

    var publicTransChallenge = function() {
        var callOpts = {'method': 'GET', 'method_url': "/api/v3/challenges/581aea56-8f1f-42fa-ae1c-c6608bc780d5",
                            'method_args': null};

                CommHelper.habiticaProxy(callOpts).then(function(response){
                    console.log("Sucessfully got public transport challenge");
                    console.log(response);
                    $scope.challenges.push(response.data);
                }, function(error){
                    console.log("Error when getting public transport challenge");
                });
    };

    var getChallenges = function(){
        $scope.challenges=[];
        bikeChallenge();
        carpoolChallenge();
        publicTransChallenge();
    };*/

    $scope.joinChallenge = function(challengeId) {
        var callOpts = {'method': 'POST', 'method_url': "/api/v3/challenges/"+challengeId+"/join",
                            'method_args': null};

                CommHelper.habiticaProxy(callOpts).then(function(response){
                    console.log("Sucessfully joined the challenge");
                    getUserInfo();
                    getUserTask();
                    console.log(response);
                }, function(error){
                    console.log("Error when joining the challenge");
                });
    };


    $scope.leaveChallenge = function(challengeId) {
        var callOpts = {'method': 'POST', 'method_url': "/api/v3/challenges/"+challengeId+"/leave",
                            'method_args': null};

                CommHelper.habiticaProxy(callOpts).then(function(response){
                    console.log("Sucessfully left the challenge");
                    getUserInfo();
                    getUserTask();
                }, function(error){
                    console.log("Error when leaveing the challenge");
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

    if (storage.get(HABITICA_REGISTERED_KEY) == true) {
        getChallenges();
    }
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
        content: 'Grow your party by invite friends to join you!'
      },
      {
        target: '.habit-list',
        content: 'Once you join a challenge, your goals will appear here.'
      }]
    };

    var startWalkthrough = function () {
      nzTour.start(tour);
    };

    /*
    * Checks if it is the first time the user has loaded the goals tab. If it is then
    * show a walkthrough and store the info that the user has seen the tutorial.
    */
    var checkGoalsTutorialDone = function () {
      var GOALS_DONE_KEY = 'goals_tutorial_done';
      var goalsTutorialDone = storage.get(GOALS_DONE_KEY);
      if (!goalsTutorialDone) {
        startWalkthrough();
        storage.set(GOALS_DONE_KEY, true);
      }
    };

    $scope.startWalkthrough = function () {
      startWalkthrough();
    }
});
