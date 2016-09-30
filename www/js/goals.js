'use strict';

angular.module('emission.main.goals',['emission.services', 'ngSanitize', 'ngAnimate', 'angularLocalStorage'])

.controller('GoalsCtrl', function(CommHelper, $state, $ionicLoading, $scope, $rootScope, $ionicModal, 
								$window, $http, $ionicGesture, $ionicPopup, $timeout, storage, ReferHelper, $cordovaInAppBrowser){
	$scope.goals = [];
	$scope.goal = {};
	$scope.challenges=[];
	//$scope.showB2Crsvp = true;
	var partyId;
	var userId;
	$scope.joinedChallenges = [];
	$scope.plusInProcess = {};
	$scope.minusInProcess = {};
	var prepopulateMessage = {};
	var floatHp;
	var floatGold;
	// THIS BLOCK FOR inAppBrowser
  	var options = {
      location: 'yes',
      clearcache: 'yes',
      toolbar: 'no'
    };

/*
    var displaySurvey = function () {
    	// THIS LINE FOR inAppBrowser
	    $cordovaInAppBrowser.open('https://berkeley.qualtrics.com/jfe/form/SV_0DO2F56h8oMGEYt', '_blank', options)
		.then(function(event) {
			console.log("successfully opened page with result "+JSON.stringify(event));
			// success
		})
		.catch(function(event) {
			// error
		});
		$rootScope.$on('$cordovaInAppBrowser:loadstart', function(e, event) {
			console.log("started loading, event = "+JSON.stringify(event));
			if (event.url == 'https://bic2cal.eecs.berkeley.edu/') {
		    	$cordovaInAppBrowser.close();      
			}
		});
		$rootScope.$on('$cordovaInAppBrowser:loadstop', function(e, event) {
			console.log("stopped loading, event = "+JSON.stringify(event));
		});
		$rootScope.$on('$cordovaInAppBrowser:exit', function(e, event) {
			console.log("exiting, event = "+JSON.stringify(event));
		});
    };

    var checkSurveyDone = function () {
		var SURVEY_DONE_KEY = 'survey_done';
		var surveyDone = storage.get(SURVEY_DONE_KEY);
		if (!surveyDone) {
			displaySurvey();
			storage.set(SURVEY_DONE_KEY, true);
		}
    };

  	$scope.b2cYes = function() {
  		$scope.showB2Crsvp = false;
  		var B2C_PARTICIPANT_KEY = 'b2c_participant';
  		storage.set(B2C_PARTICIPANT_KEY, true);
  		checkSurveyDone();
  	};

  	$scope.b2cNo = function() {
  		$scope.showB2Crsvp = false;
  		var B2C_PARTICIPANT_KEY = 'b2c_participant';
  		storage.set(B2C_PARTICIPANT_KEY, false);
  		checkSurveyDone();
  	};

    $scope.displaySurvey = function () {
      displaySurvey();
    };

	$scope.gameOff = function() {
  		//at some point this should disable the game tab, 
  		//and then the user would have to reactivate the game by going to settings
  		$scope.gameActive = false;
  		return 'root.main.metrics';
  	};
*/
	
	var refreshInfo = function(){
		console.log("Refreshing information");
		console.log("Party ID = " + storage.get('party_id'));
		if (storage.get('habitica_onboard') == true) {
	        if (storage.get('habitica_registered') == true) {
	            getUserInfo();
	            getUserTask();
	            // inQuest needs to be after getUserInfo()
	            if($scope.inQuest){
	                questContent();
	            }
	        } else {
				$ionicLoading.hide();
	        }
			handlePendingRefer();
		} else {
			$ionicLoading.hide();
			// Assign local vairable for ng-if trick
			// Step 1: See if user went through game onboarding
			//$scope.habiticaOnboard = storage.get('habitica_onboard');
			// Step 2: See if user joined B2C
			//$scope.b2cOnboard = storage.get('b2c_onboard');
		}
	};

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
       var alertPopup = $ionicPopup.alert({
         title: 'Err!',
         template: 'Service is not available.' + JSON.stringify(error)
       });

       alertPopup.then(function(res) {
       });
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
             storage.remove(REFERRED_KEY);
             storage.remove(REFERRED_GROUP_ID);
             storage.remove(REFERRED_USER_ID);
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

        var REFERRED_KEY = 'referred';
        var REFERRED_GROUP_ID = 'referred_group_id';
        var REFERRED_USER_ID = 'referred_user_id';
        if (storage.get('habitica_registered') == true) {
            if (storage.get(REFERRED_KEY) == true) {
                var groupid = storage.get(REFERRED_GROUP_ID);
                var userid = storage.get(REFERRED_USER_ID);
                ReferHelper.joinGroup(groupid, userid).then(
                    joinGroupSuccess, joinGroupFail
                )
                storage.remove(REFERRED_KEY);
                storage.remove(REFERRED_GROUP_ID);
                storage.remove(REFERRED_USER_ID);
            }
        } else {
            if (storage.get(REFERRED_KEY) == true) {
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
            storage.set('habitica_registered', true);
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
            userId = $scope.profile._id
            $scope.exp = $scope.profile.stats.exp
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
            $scope.joinedChallenges = $scope.profile.challenges;
            getParty();
            getMembers();
            console.log($scope.profile);
            prepopulateMessage = {
                message: 'Fight the global warming monster with me (link joins group, reshare responsibly)',
                subject: 'Help Berkeley become more bikeable and walkable',
                url: 'https://e-mission.eecs.berkeley.edu/redirect/join?groupid=' + partyId + '&userid=' + userId
            };
            $ionicLoading.hide();
            }, function(error){
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

    $scope.party = {}
		$scope.createParty = function() {
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
	}


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

    var bikeChallenge = function() {
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
    };

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
        if (storage.get('habitica_registered') == true) {
            getUserInfo();
            getUserTask();
            // inQuest needs to be after getUserInfo()
            if($scope.inQuest){
                questContent();
            }
        } else {
            $ionicLoading.hide();
        }
        handlePendingRefer();
    };

    if (storage.get('habitica_registered') == true) {
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
    
    /*var UUID= '4f369eef-aed4-4408-bcbf-b34896daf7e3';

    $http.get('https://habitica.com/api/v3/members/'+ UUID)
    .then(function(response){
        $scope.user = response.data;
        //console.log(response.data);
    },function(err){
        $scope.error = err.data;
        console.log($scope.error);
    });
    //function firstUpperCase(string) {
    //  return string[0].toUpperCase() + string.slice(1);
    //}*/
});

