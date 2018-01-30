

/* global L 
   global google 
   global turf
   global geojsonhint*/

/*var RateLimiter = require('request-rate-limiter');
var limiter = new RateLimiter({rate: 50, interval: 1})*/

//var timeIntervals = [600, 1200, 1800, 2400, 3000, 3600, 4200];
//var labels = ['<10 Minutes', '<20 Minutes', '<30 Minutes', '<40 Minutes', '<50 Minutes', '<60 Minutes', '<70 Minutes'];


//"radius" to draw around the input point (in decimal degrees)
var RADIUS = .15;
//" how frequently to draw points, in km
var DENSITY = 3.3;

var INTERPOLATION_SIZE = .4;

var $ = require('jquery');

//server stuff for (eventual) file saving
//var io = require('socket.io-client');
var RateLimiter = require('limiter').RateLimiter;
//console.log(require)

/*var socket = io.connect('https://localhost:3001');

socket.on('data', function (data) {
  // handle data from server
});

socket.on('connect', function () {
  console.log('connected')
});*/

var googleMapsClient = require('@google/maps').createClient({
  key: 'AIzaSyDzme8L5zUARdCqdW-y85mKz8p012GEiGE',
  rate : {
    limit: 50,
    period: 1000
  },
  Promise: Promise
});

var directionsService;
var startLatLon = [41.789258, -87.588976];

function initialize() {
  // Instantiate a directions service.
  directionsService = new google.maps.DirectionsService();
}
initialize();


//seting up the map
var mymap = L.map('mapid').setView(startLatLon, 13);

window.map = mymap;

// add basemaps
var streets = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox.streets',
    accessToken: 'pk.eyJ1IjoianJ5bWEiLCJhIjoiY2pjamV1bjNhMnhtNzMzdDVhbW1oN3JiMSJ9.LqiN5ZA7mSeFl0yCSMESEg'
}).addTo(mymap);

var grayscale = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox.light',
    accessToken: 'pk.eyJ1IjoianJ5bWEiLCJhIjoiY2pjamV1bjNhMnhtNzMzdDVhbW1oN3JiMSJ9.LqiN5ZA7mSeFl0yCSMESEg'
}).addTo(mymap);

var baseMaps = {"Grayscale": grayscale,
                "Streets": streets
               };

//make a legend
var legend = L.control({position: 'bottomright'});
legend.onAdd = function (map) {
  var div = L.DomUtil.create('div', 'info legend'),
      grades = ["0-10", "10-20", "20-30", "30-40", "40-50", "50-60", "60-70", "70-80", "80-90"],
      //labels = ["Travel Time (in minutes)"];
      labels = ['<10 Minutes', '<20 Minutes', '<30 Minutes', '<40 Minutes', '<50 Minutes', '<60 Minutes', '<70 Minutes', '70+ Minutes'];
  var htmlStr = '<h3>Travel Time</h3>';
  for (var i = 0; i < grades.length; i++) {
    htmlStr +=
      '<i style="background:' + getColor(grades[i]) + '"></i>' +
      grades[i] +" Minutes" + '<br>';
  }
  div.innerHTML = htmlStr
  return div;
};

legend.addTo(mymap);

//hover overlay
var info = L.control();
info.onAdd = function (map) {
  this._div = L.DomUtil.create('div', 'info');
  this.update();
  return this._div;
};

info.update = function (props) {
  this._div.innerHTML = '<h4>Public Transit Travel Time</h4>' + (props ?
    '<b>' + props.travelTime + ' minutes' 
    : 'Hover over map');
};

info.addTo(mymap);

//hover function 
function highlightFeature(e) {
  var layer = e.target;
  info.update(layer.feature.properties);
}

function resetHighlight(e) {
  info.update()
}

function onEachFeature(feature, layer) {
  layer.on({
    mouseover: highlightFeature,
    mouseout: resetHighlight
  });
}

var layerControl = L.control.layers(baseMaps).addTo(mymap);

var result = mymap.on('click', onMapClick);

// recursive fucntion that makes the request to the google api
// checks if all the api calls have returned, and if so, make 
// the isochrones and add to the map
function makeRequest(startPt, time, points, name, index, limiter, goodPoints, size) {
  var pt = points.features[index];
  var coords = pt.geometry.coordinates
  console.log("on point " + coords);
  var departDate = new Date();
  var endPt = new google.maps.LatLng(coords[1], coords[0])
  //build the request
  var request = {
    origin: startPt,
    destination: endPt,
    travelMode: 'TRANSIT',
    transitOptions: {departureTime: departDate}
  };
  var value;
  //limiter.removeTokens(1, function () {
    directionsService.route(request, function(response, status) {
      console.log('STATUS is ' + status);
        if (status == "OK") {
          // sum time and convert to minutes
          var legs = response.routes[0].legs;
          var time = 0
          for (var i=0; i<legs.length; i++) {
            time += legs[i].duration.value;
          }
          value = time/60;
        } else if (status == "ZERO_RESULTS"){
          console.log(status)
          // add to exposed variable
          window.noResults.push(request);
          //value = NaN;
          value = 110;
        } else if (status == "OVER_QUERY_LIMIT") {
          $("#apiProgress").hide()
          $("#warning").show()
          return
        } else {
          console.log(status);
          //value = NaN;
          value = 110;
        }
        pt.properties.travelTime = value
        if (!isNaN(value)) {
          // if the travel time actually exists, add this to the new feature list
          goodPoints.push(pt)
        } 
        index ++;
        updateBar(index,size);
        // check to see if all the requests have returned
        if (index == size) {
          console.log('removing NaNs');
          window.points = points;
          // only interpolate from points with valid travel times
          var center = turf.point([startPt.lat(), startPt.lng()]);
          center.properties.travelTime = 0;
          //goodPoints.push(center);
          var filtered = turf.featureCollection(goodPoints);
          window.filt = filtered;
          console.log('drawing features')
          var interpolated = drawTimes(filtered);
          //draw isochrones and add to layer control
          var isochrones = L.geoJSON(interpolated, {
            style: style,
            onEachFeature: onEachFeature
          });
          //var pointsUsed = L.geoJSON(filtered).addTo(mymap);
          var pointsUsed = L.geoJSON(null, {
            pointToLayer: function(feature, latlng) {
              var label = String(feature.properties.travelTime);
              return new L.CircleMarker(latlng, {
                                        radius: 1,
              }).bindTooltip(label, {permanent: true, opacity: 0.7}).openTooltip();
            }
          });
          
          //pointsUsed.addData(filtered).addTo(mymap)
  
          var centerMark = L.marker([startPt.lat(), startPt.lng()]).addTo(mymap);
          var newLayer = L.layerGroup([isochrones, centerMark]).addTo(mymap);
          // clear variables
          interpolated = false;
          filtered = false;
          goodPoints = false;
          points = false;
          //center = false;
          clearBar();
          $("#apiProgress").slideUp(500);
          //directCopy(JSON.stringify(interpolated));
          window.interpolated = interpolated;
          layerControl.addOverlay(newLayer, name);
          var toSave = {'name': name,
                        'geography': interpolated};
          // some day we will save the data :)
          //socket.emit('data', toSave);
        } else {
          var limit = 1000
          var start = Date.now();
          var now = start
          while (now -start < limit) {
            now = Date.now();
          }
          console.log(index);
          makeRequest(startPt, time, points, name, index, limiter, goodPoints, size);
        }
      //}
    //});
  });
}
// this functions takes in the starting point, point grid, and a name, 
// then generates the layer
function getTimes(start, points, name) {
  console.log('doing ' + name)
  var size = points.features.length
  //updateBar(0,size);
  console.log('' + size + ' points')
  var limiter = new RateLimiter(1, 50);
  var index = 0;
  var startPt = new google.maps.LatLng(start[0], start[1]);
  var results = []
  // so you can access things through console
  window.requests = []
  window.noResults = []
  var goodPoints = []
  //setting departure date as next wednesday
  var today = new Date(Date.now())
  today.setHours(9);
  today.setMinutes(0);
  today.setSeconds(0);
  today.setMilliseconds(0);
  var departDate = new Date(today.getTime());
  console.log((10-today.getDay()) % 7);
  departDate.setDate((today.getDate() + (10-today.getDay()) % 7)+7);
  console.log(departDate.getHours());
  // loop through all the grid points
  var startTime = NaN;
  var elapsedTime;
  var newTime;
  makeRequest(startPt, departDate, points, name, index, limiter, goodPoints, size);
}

// get map colors based on time
function getColor(d) {
  return d == "80-90" ? '#662506' :
         d == "70-80" ? '#993404' :   // 70 minutes
         d == "60-70"  ? '#cc4c02' :  //60 minutes
         d == "50-60"  ? '#ec7014' : //50 minutes
         d == "40-50"  ? '#fe9929' : // 40 minutes
         d == "30-40"   ? '#fec44f' : // 30 minutes
         d == "20-30"    ? '#fee391' : //20 minutes
         d == "10-20"    ? '#fff7bc' : // 10 minutes
                      '#ffffe5';
}

// the style function for coloring the interpolated polygons
function style(feature) {
    return {
        fillColor: getColor(feature.properties.travelTime),
        //weight: 2,
        opacity: 0,
        //color: 'white',
        //dashArray: '3',
        fillOpacity: 0.7
    };
}

// this function takes in the point collection, and interpolates 
function drawTimes(times) {
  var minTimes = [0, 10,20,30,40,50,60,70,80,90];
  var features = []
  var grid = turf.isobands(times, minTimes, {zProperty: "travelTime"});
  console.log(grid);
  return grid;
}
                  
var markerLayer = {};

var start;

// what happens when you click the map
function onMapClick(e) {
  mymap.removeLayer(markerLayer)
  $("#warning").slideUp(500);
  $("#make").slideDown(500);
  
     /*for(var i = 0; i < this.mapMarkers.length; i++){
       this.map.removeLayer(this.mapMarkers[i]);
     }*/
     //markers.clearLayers();
     // get the lat and lng
  console.log(e.latlng.lat);
  start = [e.latlng.lat, e.latlng.lng]
  var startPt = L.marker(start);
  markerLayer = startPt.addTo(mymap);
     //var pts = generateGrid(start,.01, 5);
}

// jquery dealing with button preses
$(document).ready(function() {
  $("#submit").click(function(){
     // $("#make").slideUp(500)
      $("#make").hide();
      $("#apiProgress").show();;
      var name = $("#lname").val();
      console.log('name is ' + name);
      var pts = turf.pointGrid([start[1]-RADIUS, start[0]-RADIUS, start[1]+RADIUS, start[0]+RADIUS], DENSITY)
      var times = getTimes(start, pts, name);
      $("#lname").val('');
  });
  $("#cancel").click(function(){    $("#make").slideUp(500);});
  $("#bad").click(function(){ $("#warning").slideUp(500);});
});
                  
// get fake data to draw 
function getDummyTimes(start, pts) {
  turf.featureEach(pts, function(pt) {
    var coords = pt.geometry.coordinates
    var dist = Math.hypot(coords[1]-start[0], coords[0]-start[1]);
    pt.properties.travelTime = dist*10000*60
  });
  return pts
}

// reset the progress bar
function clearBar() {
  var bar = document.getElementById("bar");
  bar.style.width = '0%';
  var text = document.getElementById("barText");
  text.innerHTML = '';
}

//update the progress bar
function updateBar(index, size) {
  var percent = index/size
  var bar = document.getElementById("bar");
  bar.style.width = percent*100 + '%';
  var message = index + "/" + size + " API calls returned";
  var text = document.getElementById("barText");
  text.innerHTML = message;
}

// for copying JSON data to clipboard
function directCopy(str){
  //based on https://stackoverflow.com/a/12693636
  document.oncopy = function(event) {
  event.clipboardData.setData("Text", str);
  event.preventDefault();
    };
  document.execCommand("Copy");
  document.oncopy = undefined;
}