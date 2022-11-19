const express = require('express');
const app = express();
const path = require('path');
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const Player = require('./models/Player');
const Bullet = require('./models/Bullet');
const { calcVector, getDistanceOfVector } = require('./utils');

const PORT = process.env.PORT || 3000;
const PUBLIC_FOLDER = "public";
const VIEWS_FOLDER = "views";

var players = [];
var bullets = [];

app.use(express.static(path.join(__dirname, PUBLIC_FOLDER)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, VIEWS_FOLDER, 'index.html'));
});

io.on('connection', (socket) => {
    //create a new player and add it to our players array
    var currentPlayer = new Player(socket.id);
    players.push(currentPlayer);

    console.log(`New player connected: ${socket.id}, current players: ${players.length}`);

    //send the players object to the new player
    io.emit('update', { players: players });

    socket.on('moving', (playerMouvementInformation) => {
        currentPlayer.mouse = playerMouvementInformation;
    });

    socket.on('shoot', (shootCord) => {
        var bullet = new Bullet(currentPlayer.x, currentPlayer.y, shootCord.x, shootCord.y);
        bullets.push(bullet);
    });

    socket.on('disconnect', () => {
        players = players.filter(p => p.id !== socket.id);
        console.log(`Player disconnected: ${socket.id}, current players: ${players.length}`);

    });
});

var int = setInterval(() => {
    bullets = bullets.filter(b => b.isAlive)
    if (players.length == 0) return;
    bullets.forEach(bullet => {
        var vector = calcVector(bullet.current.x, bullet.current.y, bullet.end.x, bullet.end.y);
        var distance = getDistanceOfVector(vector);

        var coef = distance / bullet.speed;
        if (coef > 1) {
            bullet.current.x += vector.x * (1 / coef);
            bullet.current.y += vector.y * (1 / coef);
        } else {
            bullet.current.x += bullet.end.x;
            bullet.current.y += bullet.end.y;
            bullet.isAlive = false;
        }
    });


    players.forEach(player => {
        var vector = calcVector(player.x, player.y, player.mouse.x, player.mouse.y);
        var distance = getDistanceOfVector(vector);

        var coef = distance / player.speed;
        if (coef > 1) {
            player.x += vector.x * (1 / coef);
            player.y += vector.y * (1 / coef);
        } else {
            player.x = player.mouse.x;
            player.y = player.mouse.y;
        }
    });
    io.emit('update', { players: players, bullets: bullets });
}, 30 / 1000);

server.listen(PORT, () => {
    console.log(`listening on *:${PORT}`);
});