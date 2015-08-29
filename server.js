var express = require('express'), 
    app = express(),
    http = require('http'),
    socketio = require('socket.io'),
    conf = require('./config.json'),
    fs = require('fs');

var server = http.createServer(app);
var io = socketio.listen(server);
server.listen(conf.port, "0.0.0.0");

app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
   res.sendfile(__dirname + '/public/index.html');
});

var stroke_history = [];
var index = 0;

if (fs.existsSync('history.json')) {
   fs.readFile('history.json', function(err, data) {
      if (err) {
         return console.log(err);
      }
      stroke_history = JSON.parse(data);
      index = stroke_history.length;
   });
}


function asyncUpdate() {
   var length = stroke_history.length;
   if (index < stroke_history.length) {
      var delta = stroke_history.slice(index);
      index = stroke_history.length;
      io.sockets.emit('draw_strokes', { strokes: delta });
   }
   setTimeout(asyncUpdate, 250);
}

asyncUpdate();

io.sockets.on('connection', function (socket) {
   console.log("Connected: " + socket.handshake.address + '(' + socket.id + ')'); 
   
   socket.on('draw_stroke', function (data) {
      stroke_history.push(data.stroke);
   });

   socket.on('get_history', function(data) {
      socket.emit('draw_strokes', { strokes: stroke_history });
   });

   socket.on('disconnect', function(msg) {
      console.log("Disconnected: " + socket.handshake.address + '(' + socket.id + ')'); 
   });
   
});

process.on('SIGINT', function(){
   io.sockets.emit('server_quit');
   fs.writeFile('history.json', JSON.stringify(stroke_history), function(err) {
      if (err) {
         return console.log(err);
      }
      console.log('History saved');
   });
});


console.log('Server running: http://127.0.0.1:' + conf.port + '/');
