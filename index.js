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

var view = io.of("/view");
var controllers = io.of("/controller")

controllers.on('connection', socket => {
  var id = uuidv4();

  view.emit('connection', id);

  socket.on('fire', msg => {
    view.emit('fire', { action: msg, id });
  });

  socket.on('disconnect', msg => {
    console.log("Player " + id + " disconnected");
    view.emit('remove player', id);
  });

  socket.on('direction change', msg => {
    msg.id = id;
    view.emit('direction change', msg);
  });
});

http.listen(port, () => {
  console.log(`Socket.IO server running at http://localhost:${port}/`);
});
