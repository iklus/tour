/* manager AFRAME Component */

/**
 * This component sets up an event listener for every sphere that manages
 * hiding the spheres and repositioning them.  Currently it has a lot of hard
 * coded information in it like the position coordinates that I plan on moving
 * to a json file.
 */



AFRAME.registerComponent('manager', {
  schema: {
    on: {type: 'string', default: 'click'},
    current: {type: 'string', default: 'outside_mainEntrance'},
    sky: {type: 'selector'},
    dur: {type: 'number', default: 1000},
    locations: {type: 'array'},
    spheres: {type: 'array'},
    maps: {type: 'map'},
    activeMap: {type: 'string', default: 'none'},
    scriptVisible: {type: 'bool', default: true},
    json: {type: 'map'},
    tour: {type: 'array'},
    tourKeys: {type: 'map', default: {'id': "scene"}},
    hide: {type: 'map', default: {'x': 0, 'y': -200, 'z': 0}},
    mute: {type: 'bool', default: false},
    audio: {},
  },

  init: function() {
    var data = this.data;
    var el = this.el;
    data.sky = document.querySelector('a-sky');
    data.json = getData();
    data.tour = getTour();
    this.setupFadeAnim();
    // Finds all of the spheres and assigns an event that calls switchBySphere with a unique number based of its id.
    data.spheres = el.sceneEl.querySelectorAll('.sphere');
    for (var i = 0; i < data.spheres.length; i++) {
      data.spheres[i].addEventListener(data.on, function() {
        document.querySelector('a-scene').components.manager.switchBySphere(this.id);
      });
      data.spheres[i].addEventListener("mouseenter", function() {
        var num = this.id.replace( /^\D+/g, '');
        document.getElementById('t'+num).setAttribute('visible', true);
      });
      data.spheres[i].addEventListener("mouseleave", function() {
        var num = this.id.replace( /^\D+/g, '');
        document.getElementById('t'+num).setAttribute('visible', false);
      });
    }

    // This is the starting scene
    var startParam = getAllUrlParams().start;
    if (startParam != null){
      for (var key in data.json) {
        if(data.json[key]["id"] == startParam) {
          startParam = key;
          break;
        }
      }
      data.current = startParam;
    }



    // This hides all map buttons not in the tour if there is one
    if(data.tour != null) {
      for(var key in data.json) {
          if(data.tour.includes(data.json[key]["id"])) {
            console.log(data.json[key]["id"]);
            data.tourKeys[data.json[key]["id"]] = key;
        } else {
          var mapButtons = document.getElementsByClassName(key);
          for (var i=0; i < mapButtons.length; i++) {
            mapButtons[i].setAttribute('visible', false);
          }
        }
      }
    }

    this.switchById(data.current);
  },

  // Finds Id in spheres array and calls switchById on it.
  switchBySphere: function(sphereId) {
    var data = this.data;
    // Replaces all non-digits in the id with nothing to extract the number
    var num = sphereId.replace( /^\D+/g, '');
    // Sends scene Id to switchById to finish switch
    this.switchById(data.locations[num]);
  },

  // Manages switching between scenes and changing the assets
  switchById: function(key) {
    var data = this.data;
    var el = this.el;
    // Get scene data from JSON
    data.current = key;
    var locationData = data.json[key];
    var connections = locationData['connections'];
    // Hide all spheres and the active map
    this.hideAll();
    this.hideMap();
    // Change the background
    this.changeImage(key);
    // Reveal new spheres
    var i = 0;
    for (var connect in connections) {
      if(data.tour == null || data.tour.includes(data.json[connect]["id"])) {
        data.locations[i] = connect;
        data.spheres[i].setAttribute('position', connections[connect]);
        // Changes text above sphere
        document.getElementById('t'+i).setAttribute('text', 'value', data.json[connect]["name"]);
      }
      i++;
      // Switches Script
      //el.sceneEl.querySelector("#scriptBubble").setAttribute('position', { "x": 5, "y": 4.5, "z": 8});
      if(data.json[data.current]['script'] != "") {
        this.pauseSound();
      }
      this.changeScript();
    }

    // Send location to Google Analytics using gtag.js and global gtag function
    gtag('event', 'location_change', {
      'send_to': ['UA-108453755-2'],
      'location_key': key,
      'location_name': locationData['name'],
      'event_label': locationData['name'],
      'event_callback': function() {
        console.log('gtag worked!  Key: ' + key + ' Name: ' + locationData['name']);
      }
    });
  },

  tourStep: function(direction) {
    var data = this.data;
    var el = this.el;

    var currentID = data.json[data.current]["id"];
    var index = data.tour.indexOf(currentID);
    if (index === -1) {index = 0;}
    if (direction === 'previous') {
      index-=1;
      if (index < 0) {index = 0;}
      this.switchById(data.tourKeys[data.tour[index]]);
    } else if (direction === 'next') {
      index+=1;
      if (index >= data.tour.length) {index = data.tour.length-1;}
      this.switchById(data.tourKeys[data.tour[index]]);
    }
  },

  changeMap: function(mapArea) {
    var data = this.data;
    var el = this.el;
    // If the function doesn't have a input it toggles the map for the current location
    if (mapArea == null) {
      if (data.activeMap != 'none') {
        this.hideMap();
        return;
      } else {
        mapArea = data.json[data.current]['area'];
        var mapID = "#" + mapArea + "MapCollection";
      }
    } else {
      // Switch to map given in input
      this.hideMap();
      var mapID = "#" + mapArea + "MapCollection";
    }
    el.sceneEl.querySelector(mapID).setAttribute('position', { "x": 0, "y": 0, "z": -5});
    document.getElementById('mapTitle').setAttribute('position', { "x": 0, "y": 3.6, "z": -5})
    document.getElementById('mapTitle').setAttribute('text', 'value', mapArea);
    data.activeMap = mapArea;
  },

  hideMap: function() {
    var data = this.data;
    var el = this.el;
    var tempMap = "";
    // REPLACE: generate map list from json.
    var mapList = ["outside", "main1F", "main4F", "cbdi2F", "childrens", "uc", "cyclotron"];    
    for (var i = 0; i < mapList.length; i++) {
      el.sceneEl.querySelector("#" + mapList[i] + "MapCollection").setAttribute('position', { "x": 0, "y": 0, "z": 5});
    }
    document.getElementById('mapTitle').setAttribute('position', { "x": 0, "y": 3.6, "z": 5});
    //var activeMap = "#" + data.json[data.current]['area'] + "MapCollection";
    //el.sceneEl.querySelector(activeMap).setAttribute('position', { "x": 0, "y": 0, "z": 5});
    data.activeMap = 'none';
  },

  // Changes the sky image
  changeImage: function(key) {
    var data = this.data;
    // Fade out the sky image
    data.sky.emit('set-image-fade');
      // Wait for fade to complete
      setTimeout(function () {
        // Change the sky image
        //console.log('images/360/'+key+'.jpg')
        data.sky.setAttribute('material', 'src', 'images/360/'+key+'.jpg');
      }, data.dur);
  },

  // Moves all of the spheres to the hide vector
  hideAll: function() {
    var data = this.data;
    // Moves all spheres to hide vector
    for (var i = 0; i < data.spheres.length; i++) {
      data.spheres[i].setAttribute('position', data.hide);
    }
  },

  // Changes Script visibility
  toggleScript: function() {
    var data = this.data;
    var el = this.el;
    if(data.scriptVisible){
      document.getElementById("robbieText").style.display = "none";
      if(data.json[data.current]['script'] != "" && data.audio) {
        this.pauseSound();
      }
      data.scriptVisible = false;
    } else {
      this.changeScript();
      document.getElementById("robbieText").style.display = "block";
      data.scriptVisible = true;
    }
  },

  // Changes Script and plays voice over audio
  changeScript: function() {
    var data = this.data;
    var el = this.el;
    // Pause Audio if there is any
    this.pauseSound();
    if (data.scriptVisible) {
      var script = data.json[data.current]['script'];
      if(script == "") {
        script = "You are at " + data.json[data.current]['name'];
      } else {
        data.audio = new Audio('audio/' + data.current + '.mp3');
        this.playSound();
      }
      document.getElementById("robbieText").innerHTML = script;
      document.getElementById("locationText").innerHTML = data.json[data.current]['name'];
      // For Debug --- document.getElementById("locationText").innerHTML = 'Id: ' + data.json[data.current]['id'];
    }
  },

  playSound: function() {
    var data = this.data;
    var el = this.el;
    if (data.audio && !data.mute) {
      data.audio.play();
    }
  },

  pauseSound: function() {
    var data = this.data;
    var el = this.el;
    if(data.audio && !data.audio.paused) {
      data.audio.pause();
    }
  },

  // Sets up the fade animation for a-sky once
  setupFadeAnim: function() {
    var data = this.data;
    // Only set up anim once
    if (data.sky.dataset.setImageFadeSetup) { return; }
    data.sky.dataset.setImageFadeSetup = true;
    // Create animation
    data.sky.setAttribute('animation__fade', {
      property: 'material.color',
      startEvents: 'set-image-fade',
      dir: 'alternate',
      dur: data.dur,
      from: '#FFF',
      to: '#000'
    });
  },

});