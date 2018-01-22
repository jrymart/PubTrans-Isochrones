;/* global L 
   global google 
   global turf
   global geojsonhint*/

/*var RateLimiter = require('request-rate-limiter');
var limiter = new RateLimiter({rate: 50, interval: 1})*/

var io = require('socket.io-client')
var RateLimiter = require('limiter').RateLimiter;
//console.log(require)

var socket = io.connect('http://localhost:3001')

socket.on('connect', function () {
  console.log('connected')
  socket.emit('data', {})
})

var directionsService;

function responseToPoint(response, status, point) {
  var value;
  if (status == "OK") {
    var legs = response.routes[0].legs;
    var time = 0;
    for (var i=0; i<legs.length; i++) {
      time += legs[i].duration.value;
    }
    value = time;
  } else {
    console.log(status);
    value = NaN;
  }
  point.properties.travelTime = value
}

const timeGet = valvelet(function mapRequest(request) {
  var value;
  directionsService.route(request, function(response, status) {
    return Promise.resolve
    if (status == "OK") {
      console.log('good getting')
      var warnings = document.getElementById("warnings_panel");
      warnings.innerHTML = "" + response.routes[0].warnings + "";
    } else {
      console.log(status)
      value = NaN;
    }
  });
  return value;
}, 50, 1000)

function getTimes(start, points) {
  var size
  var limiter = new RateLimiter(50, 'second');
  var index = 0;
  var startPt = new google.maps.LatLng(start[0], start[1]);
  var results = []
  turf.featureEach(points, function(pt) {
    var coords = pt.geometry.coordinates
    console.log("on point " + coords);
    var endPt = new google.maps.LatLng(coords[1], [0])
    var request = {
      origin: startPt,
      destination: endPt,
      travelMode: 'TRANSIT'
    }
    var value;
    limiter.removeTokens(1, function () {
      directionsService.route(request, function(response, status) {
        if (status == "OK") {
          console.log('good getting')
          var warnings = document.getElementById("warnings_panel");
          warnings.innerHTML = "" + response.routes[0].warnings + "";
        } else {
          console.log(status)
          value = NaN;
        }
        pt.properties.travelTime = value
        index ++
        if (index == size) {
          interpolated = drawTimes(points);
          var isochrones = L.geoJSON(interpolated, {style: style});
          markerLayer = L.layerGroup([isochrones]).addTo(mymap);
        }
        //results.push([points[i], value]);
      });
    });
  });

function drawTimes(times) {
  var minTimes = [10,20,30,40,50,60,70,80,90];
  var secTimes = []
  for (var i=0; i<minTimes.length; i++) {
    secTimes.push(minTimes*60);
  }
  var features = []
  //console.log("times length is " + times.length);
  /*for (var i=0; i<times.length; i++) {
    //console.log(times);
    var newPt = [times[i][0][1], times[i][0][0]];
    //var newPt = times[i][0];
    //console.log(newPt);
    features.push(turf.point(newPt, {'travelTime': times[i][1]}));
    //features.push([turf.point(times[0][0], {'travelTime': times[0][1]})]);
  }*/
  //console.log(features);
  directCopy(JSON.stringify(features));
  //var collection = turf.featureCollection(features);
  //L.geoJSON(collection).addTo(mymap);
  var errors = geojsonhint.hint(times);
  console.log(errors);
  console.log(times);
  var grid = turf.interpolate(times, .4, {property: "travelTime", gridType: "hex"})//, {units: 'radians'});
  //var bands = turf.isobands(grid, secTimes, {'zProperty':'travelTime'});
  //var isocrones = L.geoJSON(bands);
  //console.log("collection is");
  //console.log(collection);
  console.log("grid is");
  console.log(grid);
  return grid;
  //return bands;
  //return isocrones;
}
                   
/*function getTime(start, end) {
  var startPt = new google.maps.LatLng(start[0], start[1]);
  var endPt = new google.maps.LatLng(start[1], start[0]);
  var request = {
      origin: startPt,
      destination: endPt,
      travelMode: 'TRANSIT'
    }
function initialize() {
  // Instantiate a directions service.
  directionsService = new google.maps.DirectionsService();
}
initialize()
var directionsService

var startLatLon = [41.789258, -87.588976]

function test(a,b) {
  console.log(a)
  console.log(b)
}

function nextTo(point, dist) {
  var mods = [[0,-1],[0,1], [1, -1], [1,0], [1,1], [-1,-1], [-1, 0], [-1,1]]
  var outPoints = []
  for (var i=0; i< mods.length; i++){
    var newPoint = []
    for (var j=0; j< point.length; j++) {
      newPoint.push(point[j]+mods[i][j]*dist)
    }
    outPoints.push(newPoint)
  }
  return outPoints
}


function generateGrid(start, step, radius) {
  var outPoints = []
  var bottom = [start[0]-step*radius, start[1]-step*radius]
  //var bottom = start
  for (var i=0; i < radius*2; i++) {
    for (var j=0; j< radius*2; j++) {
      outPoints.push([bottom[0]+i*step, bottom[1]+j*step])
    }
  }
  /*var outPoints = [start]
  for (var i=0; i < radius; i++) {
    //console.log('a'+i)
    outPoints = outPoints.concat(nextTo(start, step*(i+1)))
    //console.log(i)
    //console.log(radius)
  }*/
  return outPoints
}

//console.log(nextTo([0,0],1))


/*var strs = ["data:text/csv;charset=utf-8,", "lat, long"]
for (i=0; i < pts.length; i++) {
  strs.push(pts[i].toString())
}
var csvContent = strs.join("\n")

var encodedUri = encodeURI(csvContent);
		window.open(encodedUri);
*/

/*var mymap = L.map('mapid').setView(startLatLon, 13);
L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox.streets',
    accessToken: 'pk.eyJ1IjoianJ5bWEiLCJhIjoiY2pjamV1bjNhMnhtNzMzdDVhbW1oN3JiMSJ9.LqiN5ZA7mSeFl0yCSMESEg'
}).addTo(mymap);*/

var popup = L.popup();
var markerLayer = {};
function onMapClick(e) {
     if (markerLayer != undefined) {
       mymap.removeLayer(markerLayer);
     };
     /*for(var i = 0; i < this.mapMarkers.length; i++){
       this.map.removeLayer(this.mapMarkers[i]);
     }*/
     //markers.clearLayers();
     console.log(e.latlng.lat);
     var start = [e.latlng.lat, e.latlng.lng]
     //var pts = generateGrid(start,.01, 5);
     var pts = turf.pointGrid([start[1]-.05, start[0]-.05, start[1]+.05, start[0]+.05], 1)//0.01, {units: 'radians'});
     console.log("pointGrid is");
     console.log(pts);
     var geojsonMarkerOptions = {
       radius: 8,
       fillColor: "#ff7800",
       color: "#000",
       weight: 1,
       opacity: 1,
       fillOpacity: 0.8
     };
     var ptgrid = L.geoJSON(pts, {
      pointToLayer: function(feature, latlng) {
      return L.circleMarker(latlng, geojsonMarkerOptions);
      }  
     });
     var markers = [];
     //console.log('click event')
     for (var i=0; i < pts.length; i++) {
       //console.log(pts[i]);
       markers.push(L.marker(pts[i]));
      //this.mapMarkers.push(marker);
     };
     //var grid = 
     //markerLayer = L.layerGroup([ptgrid]).addTo(mymap);
     //grid.addTo(map);
     /*popup
        .setLatLng(e.latlng)
        .setContent("You clicked the map at " + e.latlng.toString())
        .openOn(mymap);*/
  var times
  var confirmation = prompt("Enter confirmation phrase to generate travel times");
  if (confirmation == "CODEGREEN") {
    times = getTimes(start, pts);
    return drawTimes(times);
  } else {
    times = getDummyTimes(start, pts);
  }
  //var times = getDummyTimes(start, pts);
  var features = drawTimes(times);
  //console.log('copying GeoJSON');
  //directCopy(JSON.stringify(features));
  //console.log(JSON.stringify(features));
  var myStyle = {"color": "#ff7800"};
  var geojsonMarkerOptions = {
    radius: 8,
    fillColor: "#0087ff",
    color: "#000",
    weight: 1,
    opacity: 1,
    fillOpacity: 0.8
  };

  var isochrones = L.geoJSON(features, {style: style});
  markerLayer = L.layerGroup([isochrones]).addTo(mymap);
  console.log("logging isochrones");
  console.log(features);
  //var isochrones = L.geoJSON(features).addTo(mymap);
  var overlayMaps = {
    "Isochrones": isochrones
  };

  //L.control.layers(null, overlayMaps).addTo(mymap);
  //return [start, pts];
     
}

/*for (i=0; i < pts.length; i++) {
  var marker = L.marker(pts[i]).addTo(mymap);
}*/

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

const timeGet = valvelet(function mapRequest(request) {
  var value;
  directionsService.route(request, function(response, status) {
    return Promise.resolve
    if (status == "OK") {
      console.log('good getting')
      var warnings = document.getElementById("warnings_panel");
      warnings.innerHTML = "" + response.routes[0].warnings + "";
    } else {
      console.log(status)
      value = NaN;
    }
  });
  return value;
}, 50, 1000)

function getTimes(start, points) {
  var startPt = new google.maps.LatLng(start[0], start[1]);
  var results = []
  turf.featureEach(points, function(pt) {
    var coords = pt.geometry.coordinates
    console.log("on point " + coords);
    var endPt = new google.maps.LatLng(coords[1], [0])
    var request = {
      origin: startPt,
      destination: endPt,
      travelMode: 'TRANSIT'
    }
    /*var value;
    setTimeout(function () {
        directionsService.route(request, function(response, status) {
        if (status == "OK") {
          console.log('good getting')
          var warnings = document.getElementById("warnings_panel");
          warnings.innerHTML = "" + response.routes[0].warnings + "";
        } else {
          console.log(status)
          value = NaN;
        }
        pt.properties.travelTime = value

        //results.push([points[i], value]);
      });
    }, 200);*/
    pt.properties.travelTime = timeGet(request);
  });
  return points;
}
  
function getTime(response) {
  var legs = response.routes[0].legs;
  var time = 0
  for (var i=0; i<legs.length; i++) {
    time += legs[i].duration.value;
  }
  return time;
}


function directCopy(str){
    //based on https://stackoverflow.com/a/12693636
        document.oncopy = function(event) {
    event.clipboardData.setData("Text", str);
    event.preventDefault();
        };
    document.execCommand("Copy");
        document.oncopy = undefined;
}

function getColor(d) {
  return d > 26000 ? '#800026' :
         d > 25000  ? '#BD0026' :
         d > 24000  ? '#E31A1C' :
         d > 23000  ? '#FC4E2A' :
         d > 22000   ? '#FD8D3C' :
         d > 21000    ? '#FEB24C' :
         d > 20000    ? '#FED976' :
                      '#FFEDA0';
}

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

function drawTimes(times) {
  var minTimes = [10,20,30,40,50,60,70,80,90];
  var secTimes = []
  for (var i=0; i<minTimes.length; i++) {
    secTimes.push(minTimes*60);
  }
  var features = []
  //console.log("times length is " + times.length);
  /*for (var i=0; i<times.length; i++) {
    //console.log(times);
    var newPt = [times[i][0][1], times[i][0][0]];
    //var newPt = times[i][0];
    //console.log(newPt);
    features.push(turf.point(newPt, {'travelTime': times[i][1]}));
    //features.push([turf.point(times[0][0], {'travelTime': times[0][1]})]);
  }*/
  //console.log(features);
  directCopy(JSON.stringify(features));
  //var collection = turf.featureCollection(features);
  //L.geoJSON(collection).addTo(mymap);
  var errors = geojsonhint.hint(times);
  console.log(errors);
  console.log(times);
  var grid = turf.interpolate(times, .4, {property: "travelTime", gridType: "hex"})//, {units: 'radians'});
  //var bands = turf.isobands(grid, secTimes, {'zProperty':'travelTime'});
  //var isocrones = L.geoJSON(bands);
  //console.log("collection is");
  //console.log(collection);
  console.log("grid is");
  console.log(grid);
  return grid;
  //return bands;
  //return isocrones;
}

var mymap = L.map('mapid').setView(startLatLon, 13);
L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox.streets',
    accessToken: 'pk.eyJ1IjoianJ5bWEiLCJhIjoiY2pjamV1bjNhMnhtNzMzdDVhbW1oN3JiMSJ9.LqiN5ZA7mSeFl0yCSMESEg'
}).addTo(mymap);

var result = mymap.on('click', onMapClick);

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