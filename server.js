const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let currentMultiplier = 1.0;
let crashPoint = generateCrashPoint();
let gameInterval;
let bets = {};

// Generate a random crash point
function generateCrashPoint() {
    return parseFloat((Math.random() * 10 + 1).toFixed(2));
}

// Start a new game round
function startGame() {
    crashPoint = generateCrashPoint();
    currentMultiplier = 1.0;
    console.log(`New crash point: ${crashPoint}`);

    gameInterval = setInterval(() => {
        currentMultiplier += 0.1;
        io.emit('updateMultiplier', currentMultiplier);

        if (currentMultiplier >= crashPoint) {
            io.emit('crash', currentMultiplier);
            clearInterval(gameInterval);
            calculatePayouts();
            setTimeout(startGame, 5000); // Start new round after 5 seconds
        }
    }, 100);
}

// Calculate payouts for players
function calculatePayouts() {
    for (const [player, bet] of Object.entries(bets)) {
        if (bet.cashoutMultiplier <= currentMultiplier) {
            const winnings = bet.amount * bet.cashoutMultiplier;
            io.to(player).emit('win', winnings);
        } else {
            io.to(player).emit('lose');
        }
    }
    bets = {}; // Reset bets
}

let leaderboard = {}; // Track player winnings

function calculatePayouts() {
    for (const [player, bet] of Object.entries(bets)) {
        if (bet.cashoutMultiplier <= currentMultiplier) {
            const winnings = bet.amount * bet.cashoutMultiplier;

            if (!leaderboard[player]) leaderboard[player] = 0;
            leaderboard[player] += winnings;

            io.to(player).emit('win', winnings);
        } else {
            io.to(player).emit('lose');
        }
    }
    io.emit('leaderboardUpdate', leaderboard); // Broadcast leaderboard
    bets = {}; // Reset bets
}

io.on('connection', (socket) => {
    // Send leaderboard to new players
    socket.emit('leaderboardUpdate', leaderboard);

    socket.on('placeBet', (bet) => {
        bets[socket.id] = bet;
    });
});


io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Handle placing bets
    socket.on('placeBet', (bet) => {
        bets[socket.id] = bet;
        console.log(`Bet placed: ${JSON.stringify(bet)}`);
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        delete bets[socket.id];
    });
});

startGame();

server.listen(3000, () => {
    console.log('Server is running on port 3000');
});
