var fs = require('fs')
var io = require('socket.io')(3001)
var jsonfile = require('jsonfile')
//var hs = require('http-server')

//var server = hs.createServer()
//server.listen(3000)

console.log('hey i\'m the server, heheheh')

// var data = fs.readFileSync('data.json') // get data from file

var file = 'data.json'

io.on('connection', function (socket) {
  
  // socket.emit('data', data) // send data from file to client
  
  socket.on('data', function (data) {
    console.log('recieving data');
    jsonfile.writeFileSync(file, data, {flag: 'a'})
    console.log('received data from client')
  })
})