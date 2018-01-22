
;/* global L 
   global google 
   global turf
   global geojsonhint*/

/*var RateLimiter = require('request-rate-limiter');
var limiter = new RateLimiter({rate: 50, interval: 1})*/

//var timeIntervals = [600, 1200, 1800, 2400, 3000, 3600, 4200];
//var labels = ['<10 Minutes', '<20 Minutes', '<30 Minutes', '<40 Minutes', '<50 Minutes', '<60 Minutes', '<70 Minutes'];

//server stuff for (eventual) file saving
var io = require('socket.io-client')
var RateLimiter = require('limiter').RateLimiter;
//console.log(require)

var socket = io.connect('https://localhost:3001')

socket.on('data', function (data) {
  // handle data from server
})

socket.on('connect', function () {
  console.log('connected')
})

var directionsService;
var startLatLon = [41.789258, -87.588976]

function initialize() {
  // Instantiate a directions service.
  directionsService = new google.maps.DirectionsService();
}
initialize()

//seting up the map
var mymap = L.map('mapid').setView(startLatLon, 13);

window.map = mymap;

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

var legend = L.control({position: 'bottomright'});
legend.onAdd = function (map) {
  var div = L.DomUtil.create('div', 'info legend'),
      grades = [0, 10, 20, 30, 40, 50, 60, 70],
      labels = ["Travel Time (in minutes)"];
      //labels = ['<10 Minutes', '<20 Minutes', '<30 Minutes', '<40 Minutes', '<50 Minutes', '<60 Minutes', '<70 Minutes'];
  div.innterHTML += 'Travel Time (in minutes';
  for (var i = 0; i < grades.length; i++) {
    div.innerHTML +=
      '<i style="background:' + getColor(grades[i] + 1) + '"></i>' +
      grades[i] + (grades[i+1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
  }
  return div;
};

legend.addTo(mymap);

var layerControl = L.control.layers(baseMaps).addTo(mymap);

var result = mymap.on('click', onMapClick);

// this functions takes in the starting point, point grid, and a name, 
// then generates the layer
function getTimes(start, points, name) {
  var size = points.features.length
  console.log(size)
  var limiter = new RateLimiter(1, 'second');
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
  departDate.setDate(today.getDate() + (10-today.getDay()) % 7);
  // loop through all the grid points
  turf.featureEach(points, function(pt) {
    var coords = pt.geometry.coordinates
    console.log("on point " + coords);
    var endPt = new google.maps.LatLng(coords[1], coords[0])
    //build the request
    var request = {
      origin: startPt,
      destination: endPt,
      travelMode: 'TRANSIT',
      transitOptions: {departureTime: departDate}
    };
    console.log("eplat = " + endPt.lat())
    //console.log(request)
    var value;
    // rate limit api calls
    limiter.removeTokens(1, function () {
      // make request available through console
      window.requests.push(request)
      // make API request
      directionsService.route(request, function(response, status) {
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
          value = NaN;
        } else {
          console.log(status);
          value = NaN;
        }
        pt.properties.travelTime = value
        if (!isNaN(value)) {
          // if the travel time actually exists, add this to the new feature list
          goodPoints.push(pt)
        }
        index ++
        // check to see if all the requests have returned
        if (index == size) {
          console.log('removing NaNs');
          window.points = points;
          // only interpolate from points with valid travel times
          var filtered = turf.featureCollection(goodPoints);
          window.filt = filtered;
          console.log('drawing features')
          var interpolated = drawTimes(filtered);
          //draw isochrones and add to layer control
          var isochrones = L.geoJSON(interpolated, {style: style});
          var centerMark = L.marker(start).addTo(mymap);
          var newLayer = L.layerGroup([isochrones, centerMark]).addTo(mymap);
          directCopy(JSON.stringify(interpolated));
          window.interpolated = interpolated;
          layerControl.addOverlay(newLayer, name);
          var toSave = {'name': name,
                        'geography': interpolated};
          // some day we will save the data :)
          socket.emit('data', toSave);
        }
        //results.push([points[i], value]);
      });
    });
  });
}

// get map colors based on time
function getColor(d) {
  return d > 70 ? '#8c2d04' :   // 70 minutes
         d > 60  ? '#d94801' :  //60 minutes
         d > 50  ? '#f16913' : //50 minutes
         d > 40  ? '#fd8d3c' : // 40 minutes
         d > 30   ? '#fdae6b' : // 30 minutes
         d > 20    ? '#fdd0a2' : //20 minutes
         d > 10    ? '#fee6ce' : // 10 minutes
                      '#fff5eb';
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
  var minTimes = [10,20,30,40,50,60,70,80,90];
  /*var secTimes = []
  for (var i=0; i<minTimes.length; i++) {
    secTimes.push(minTimes*60);
  }*/
  var features = []
  //directCopy(JSON.stringify(features));
  var grid = turf.interpolate(times, .4, {property: "travelTime", gridType: "hex"})//, {units: 'radians'});
  return grid;
}
                  
var markerLayer = {};
// what happens when you click the map
function onMapClick(e) {
     if (markerLayer != undefined) {
       mymap.removeLayer(markerLayer);
     };
     /*for(var i = 0; i < this.mapMarkers.length; i++){
       this.map.removeLayer(this.mapMarkers[i]);
     }*/
     //markers.clearLayers();
     // get the lat and lng
     console.log(e.latlng.lat);
     var start = [e.latlng.lat, e.latlng.lng]
     //var pts = generateGrid(start,.01, 5);
     var pts = turf.pointGrid([start[1]-.1, start[0]-.1, start[1]+.1, start[0]+.1], 5)//0.01, {units: 'radians'});
  var times
  // name the output layer and confirm that you want to use API CALLS
  var input = prompt("Enter confirmation phrase followed by a name for your output layer", "Phrase, My Name Here");
  var inputs = input.split(',');
  var confirmation;
  var name;
  if (inputs.length < 2) {
    name = inputs[0];
  } else {
    confirmation = inputs[0];
    name = inputs[1];
  }
  if (confirmation == "CODEGREEN") {
    times = getTimes(start, pts, name);
  } else {
    /*times = getDummyTimes(start, pts);
    var features = drawTimes(times);
    var isochrones = L.geoJSON(features, {style: style});
    markerLayer = L.layerGroup([isochrones]).addTo(mymap);*/
  }
}

// get fake data to draw 
function getDummyTimes(start, pts) {
  turf.featureEach(pts, function(pt) {
    var coords = pt.geometry.coordinates
    var dist = Math.hypot(coords[1]-start[0], coords[0]-start[1]);
    pt.properties.travelTime = dist*10000*60
  });
  return pts
  /*var results = []
  for (var i=0; i< pts.length; i++) {
    var dist = Math.hypot(pts[i][0]-start[0], pts[i][1]-start[1]);
    results.push([pts[i], dist*10000*60]);
  }
  return results;*/
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


/*var isochrones = L.geoJSON(result).addTo(mymap)
var overlayMaps = {
  "Isochrones": isochrones
};

L.control.layers(overlayMaps.addTo(mymap));
*/

/*var start = result[0];
var points = result[1];
var startPt = new google.maps.LatLng(start[0], start[1]);
for (var i=0; i< points.length; i++) {
  var endPt = new google.maps.LatLng(points[i][0], points[i][1])
  var request = {
    origin: startPt,
    destination: endPt,
    travelMode: 'TRANSIT'
  }
  directionsService.route(request, function(response, status) {
    if (status == "OK") {
      var warnings = document.getElementById("warnings_panel");
      warnings.innerHTML = "" + response.routes[0].warnings + "";
      getTime(response)
    }
  });
}*/


//test.apply(this, startLatLon)

//var startLocation = new google.maps.LatLng.apply(this, startLatLon);