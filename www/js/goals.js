'use strict';

angular.module('emission.main.goals',['emission.services', 'ngSanitize', 'ngAnimate', 'angularLocalStorage'])

.controller('GoalsCtrl', function(CommHelper, $state, $ionicLoading, $scope, $rootScope, $ionicModal, 
								$window, $http, $ionicGesture, $ionicPopup, $timeout, storage){
	$scope.goals = [];
	$scope.goal = {};
	$scope.challenges=[];
	var partyId;
	$scope.joinedChallenges = [];
	$scope.plusInProcess = {};
	$scope.minusInProcess = {};
	var floatHp;
	var floatGold;

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
				//	$scope.gainedHp = (response.data.hp - floatHp).toFixed(2);
				//	console.log($scope.gainedHp);
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
		getUserInfo();
		getUserTask();
		if($scope.inQuest){
			questContent();
		}
	};

	getChallenges();
	refreshInfo();

	$scope.refreshPage = function() {
		console.log("Refreshing page");
		refreshInfo();
    };
   	
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
	//	return string[0].toUpperCase() + string.slice(1);
	//}*/
});


