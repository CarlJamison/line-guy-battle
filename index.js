const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 80;
const { v4: uuidv4 } = require('uuid');

app.use(express.static(__dirname + '/public'));
app.get('/nipplejs.js', (req, res) => {
  res.sendFile(__dirname + '/node_modules/nipplejs/dist/nipplejs.js');
});
app.get('/qrcode.js', (req, res) => {
  res.sendFile(__dirname + '/node_modules/qrcode/build/qrcode.js');
});

var view = io.of("/view");
var controllers = io.of("/controller")

view.on('connection', socket => {
  socket.on('pong', msg => {
    controllers.to(msg).emit('pong');
  });

  socket.emit('register', socket.id);
})

controllers.on('connection', socket => {
  var id = uuidv4();
  var socketId = '';
  view.emit('connection', id);

  socket.on('fire', msg => {
    getView(msg.socketId).emit('fire', { action: msg.action, id });
    socketId = msg.socketId;
  });

  socket.on('ping', msg => {
    getView(msg).emit('ping', socket.id);
  });

  socket.on('disconnect', msg => {
    console.log("Player " + id + " disconnected");
    getView(socketId).emit('remove player', id);
  });

  socket.on('direction change', msg => {
    msg.id = id;
    getView(msg.socketId).emit('direction change', msg);
    socketId = msg.socketId;
  });
});

http.listen(port, () => {
  console.log(`Socket.IO server running at http://localhost:${port}/`);
});

function getView(id){
  return view
    .to(id);
}
