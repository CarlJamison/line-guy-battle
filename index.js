const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;

var players = 1;

app.use(express.static(__dirname + '/public'));
app.get('/nipplejs.js', (req, res) => {
  res.sendFile(__dirname + '/node_modules/nipplejs/dist/nipplejs.js');
});
var view = io.of("/view");
var controllers = io.of("/controller")
var settings = io.of("/settings")

controllers.on('connection', (socket) => {

  var playerNumber = players;
  players++;

  socket.on('fire', msg => {
    view.emit('fire', playerNumber);
  });
  socket.on('disconnect', msg => {
    console.log("Player " + playerNumber + " disconnected: " + socket.client.conn.remoteAddress);
    view.emit('remove player', playerNumber);
  });
  socket.on('direction change', msg => {
    msg.player = playerNumber;
    view.emit('direction change', msg);
  });
});

settings.on('connection', (socket) => {

  socket.on('update settings', msg => {
    view.emit('update settings', msg);
  });

  socket.on('start game', msg => {
    view.emit('start game', msg);
  });

  socket.on('reset game', msg => {
    view.emit('reset game', msg);
  });
});

http.listen(port, () => {
  console.log(`Socket.IO server running at http://localhost:${port}/`);
});
