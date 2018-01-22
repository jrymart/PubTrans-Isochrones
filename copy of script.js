/* global L 
   global google */


/*var directionsService;


function initialize() {
  // Instantiate a directions service.
  directionsService = new google.maps.DirectionsService();*/

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

var mymap = L.map('mapid').setView(startLatLon, 13);
L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox.streets',
    accessToken: 'pk.eyJ1IjoianJ5bWEiLCJhIjoiY2pjamV1bjNhMnhtNzMzdDVhbW1oN3JiMSJ9.LqiN5ZA7mSeFl0yCSMESEg'
}).addTo(mymap);

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
     var pts = generateGrid(start,.01, 5);
     var markers = [];
     //console.log('click event')
     for (var i=0; i < pts.length; i++) {
       //console.log(pts[i]);
       markers.push(L.marker(pts[i]));
      //this.mapMarkers.push(marker);
     };
     //var grid = 
     markerLayer = L.layerGroup(markers).addTo(mymap);
     //grid.addTo(map);
     /*popup
        .setLatLng(e.latlng)
        .setContent("You clicked the map at " + e.latlng.toString())
        .openOn(mymap);*/
  return [start, pts];
     
}

/*for (i=0; i < pts.length; i++) {
  var marker = L.marker(pts[i]).addTo(mymap);
}*/

var result = mymap.on('click', onMapClick);
var start = result[0];
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
}

function getTime(directionResult) {
  var time = 0;
  var route = directionResult.routes[0];
  for (var i=0; i < route.legs.length; i++) {
    time += route.legs[i].value
  }
}

//test.apply(this, startLatLon)

//var startLocation = new google.maps.LatLng.apply(this, startLatLon);
