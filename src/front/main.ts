import io from "socket.io-client";
import {Player} from "../models/Player";
import Dimension from "../models/utils/Dimension";
import Coordinate from "../models/utils/Coordinate";
import Vector from "../models/utils/Vector";
import SpellInvocation from "../models/utils/spells/SpellInvocation";
import {SpellAction} from "../models/utils/spells/SpellAction";
import {SpellType} from "../models/utils/spells/SpellType";
import SpecialInvocation from "../models/utils/specials/SpecialInvocation";
import SemiCircleShape from "../models/utils/shapes/SemiCircleShape";
import CircleShape from "../models/utils/shapes/CircleShape";
import RectangleShape from "../models/utils/shapes/RectangleShape";
import {clone} from "../utils";

const socket = io();

const canvas: HTMLCanvasElement = document.getElementById(
    "app"
) as HTMLCanvasElement;
const ctx: CanvasRenderingContext2D = canvas.getContext("2d");


//GAME SETUP
type GameState = {
    needToDraw: boolean;
    players: Player[]
};
let mouse = new Coordinate(0, 0);
let frameIndex = 0;
let moveIndex = 0;
let username;
let currentPlayer: Player;
let worldDimension: Dimension;

//HTML elements
const elName: HTMLInputElement = document.getElementById(
    "name"
) as HTMLInputElement;
const elLanding: HTMLDivElement = document.getElementById(
    "landing"
) as HTMLDivElement;
const elButton: HTMLButtonElement = document.getElementById(
    "start"
) as HTMLButtonElement;

//from the server
let gameState: GameState = {
    needToDraw: false,
    players: []
};
//local mouse position
const gameSettings = {
    showMiniMap: true,
    showLeaderboard: false,
    players: true,
    limitWall: 20,
    fps: 60,
    timePerTick: 0, //calculated in init
    backgroundColor: "#fff",
    cheat: true,
    assets: {
        player: document.getElementById("player_run") as HTMLImageElement
    },
    player: {
        animation: {
            playerRunImageWidth: 280,
            playerRunImageHeight: 40,
            playerRunImageFrame: 7,
            playerRunImageFrameWidth: 0, //calculated in init
            playerRunImageFrameY: 0,
        },
        move: {
            delay: 0 //calculated in init
        },
        bind: {
            spell1: "a",
            spell2: "z",
            special: "c",
        }
    },
    minimap: {
        miniMapSize: 400,
        miniMapRatio: 0.05
    }
}

//Listeners landing page
elButton.addEventListener("click", goLesFumer);
elName.addEventListener("keyup", ({key}) => {
    if (key === "Enter") {
        goLesFumer();
    }
});

function goLesFumer() {
    username = elName.value;
    if (username.length === 0) {
        username = "Unknown";
    }
    elLanding.style.display = "none";
    canvas.style.display = "block";

    init();
}

//Draw
function drawPlayer(player: Player) {
    const coefAceSpeed = Math.floor(player.speed / player.initSpeed);
    const ajustedFPS = Math.floor(gameSettings.fps / coefAceSpeed);
    const ajustedFrameIndex = frameIndex % ajustedFPS;
    const playerCanvasCoordinate = convertToCanvasCoordinate(
        player.coordinate,
        currentPlayer
    );

    const playerRunImageFrameIndex = Math.floor(
        (ajustedFrameIndex * (gameSettings.player.animation.playerRunImageFrame - 1)) / ajustedFPS
    );

    const playerRunImageFrameX =
        playerRunImageFrameIndex * gameSettings.player.animation.playerRunImageFrameWidth;

    ctx.save();
    ctx.translate(playerCanvasCoordinate.x, playerCanvasCoordinate.y);
    if (Math.abs(player.rotation) > Math.PI / 2) {
        ctx.scale(-1, 1);
    }
    ctx.drawImage(
        gameSettings.assets.player,
        playerRunImageFrameX,
        gameSettings.player.animation.playerRunImageFrameY,
        gameSettings.player.animation.playerRunImageFrameWidth,
        gameSettings.player.animation.playerRunImageHeight,
        -player.size / 2,
        -player.size / 2,
        player.size,
        player.size
    );

    //draw a red cirlce around the player
    if (gameSettings.cheat && player.id === currentPlayer.id) {
        ctx.beginPath();
        ctx.arc(0, 0, 50, 0, 2 * Math.PI);
        ctx.strokeStyle = "green";
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, 100, 0, 2 * Math.PI);
        ctx.strokeStyle = "blue";
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, 150, 0, 2 * Math.PI);
        ctx.strokeStyle = "yellow";
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, 200, 0, 2 * Math.PI);
        ctx.strokeStyle = "orange";
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, 250, 0, 2 * Math.PI);
        ctx.strokeStyle = "red";
        ctx.stroke();
    }
    ctx.restore();

    //Name
    ctx.font = "20px Arial";
    ctx.fillStyle = "black";
    ctx.textAlign = "center";
    ctx.fillText(player.name, playerCanvasCoordinate.x, playerCanvasCoordinate.y - player.size / 2 - 10);

    //Life
    ctx.fillStyle = "red";
    ctx.fillRect(
        playerCanvasCoordinate.x - player.size / 2,
        playerCanvasCoordinate.y + player.size / 2 + 10,
        player.size,
        10
    );
    ctx.fillStyle = "green";
    ctx.fillRect(
        playerCanvasCoordinate.x - player.size / 2,
        playerCanvasCoordinate.y + player.size / 2 + 10,
        (player.size * player.hp) / player.initHp,
        10
    );
    //Mouse Vector
    if (gameSettings.cheat) {
        ctx.beginPath();
        const currentPlayerCanvasCoordinate = convertToCanvasCoordinate(
            currentPlayer.coordinate,
            currentPlayer
        );
        ctx.moveTo(currentPlayerCanvasCoordinate.x, currentPlayerCanvasCoordinate.y);
        ctx.lineTo(mouse.x, mouse.y);
        ctx.strokeStyle = "red";
        ctx.stroke();
    }

    if (player.onCast && player.currentSpellInvocation !== null) {
        drawSpell(player)
    }
}

function drawLeaderboard() {
    ctx.fillStyle = "black";
    ctx.font = "30px Arial";
    ctx.fillText("Leaderboard", 10, 50);
    ctx.font = "20px Arial";
    gameState.players.forEach((player, index) => {
        ctx.fillText(
            `${index + 1}. ${player.name}: ${player.score}`,
            10,
            80 + index * 30
        );
    });
}

function drawMiniMap() {
    //Mini map
    ctx.save();
    ctx.translate(canvas.width - gameSettings.minimap.miniMapSize, canvas.height - gameSettings.minimap.miniMapSize);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, gameSettings.minimap.miniMapSize, gameSettings.minimap.miniMapSize);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, gameSettings.minimap.miniMapSize, 1);
    ctx.fillRect(0, 0, 1, gameSettings.minimap.miniMapSize);
    ctx.fillRect(gameSettings.minimap.miniMapSize - 1, 0, 1, gameSettings.minimap.miniMapSize);
    ctx.fillRect(0, gameSettings.minimap.miniMapSize - 1, gameSettings.minimap.miniMapSize, 1);

    //Window and current player
    const miniMapPlayerSize = currentPlayer.size * gameSettings.minimap.miniMapRatio;
    const miniMapPlayerX = currentPlayer.coordinate.x * gameSettings.minimap.miniMapRatio;
    const miniMapPlayerY = currentPlayer.coordinate.y * gameSettings.minimap.miniMapRatio;

    if (gameSettings.cheat) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(
            miniMapPlayerX - (canvas.width * gameSettings.minimap.miniMapRatio) / 2,
            miniMapPlayerY - (canvas.height * gameSettings.minimap.miniMapRatio) / 2,
            canvas.width * gameSettings.minimap.miniMapRatio,
            canvas.height * gameSettings.minimap.miniMapRatio
        );
    }

    ctx.fillStyle = "green";
    ctx.beginPath();
    ctx.arc(miniMapPlayerX, miniMapPlayerY, miniMapPlayerSize, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();


    if (gameSettings.cheat) {
        gameState.players.forEach(player => {
            if (player.id === currentPlayer.id) return
            const miniMapPlayerX = player.coordinate.x * gameSettings.minimap.miniMapRatio;
            const miniMapPlayerY = player.coordinate.y * gameSettings.minimap.miniMapRatio;

            ctx.fillStyle = "red";
            ctx.beginPath();
            ctx.arc(miniMapPlayerX, miniMapPlayerY, miniMapPlayerSize, 0, 2 * Math.PI);
            ctx.closePath();
            ctx.fill();
        });
    }

    ctx.restore();
}


function drawSpell(player: Player) {
    //TODO REFACTO
    switch (player.currentSpellInvocation.spell.shape.name) {
        case "SemiCircleShape":
            ctx.save();
            ctx.beginPath();
            ctx.fillStyle = "black";
            if (player.currentSpellInvocation.spell.type === SpellType.onGround) {
                const coordinate = convertToCanvasCoordinate(player.currentSpellInvocation.coordinate, player);
                ctx.translate(coordinate.x, coordinate.y);
            } else {
                const coordinate = convertToCanvasCoordinate(player.coordinate, player);
                ctx.translate(coordinate.x, coordinate.y);
            }
            //rotate to the direction of the player
            ctx.rotate(player.currentSpellInvocation.spell.initPlayerRotation - Math.PI / 2);
            ctx.arc(0, 0, (player.currentSpellInvocation.spell.shape as SemiCircleShape).radius, 0, Math.PI);
            ctx.fill();
            ctx.closePath();
            ctx.restore();
            break;
        case "CircleShape":
            ctx.save();
            ctx.beginPath();
            ctx.fillStyle = "black";
            if (player.currentSpellInvocation.spell.type === SpellType.onGround) {
                const coordinate = convertToCanvasCoordinate(player.currentSpellInvocation.coordinate, player);
                ctx.translate(coordinate.x, coordinate.y);
            } else {
                const coordinate = convertToCanvasCoordinate(player.coordinate, player);
                ctx.translate(coordinate.x, coordinate.y);
            }
            //rotate to the direction of the player
            ctx.rotate(player.currentSpellInvocation.spell.initPlayerRotation - Math.PI / 2);
            ctx.arc(0, 0, (player.currentSpellInvocation.spell.shape as CircleShape).radius, 0, 2 * Math.PI);
            ctx.fill();
            ctx.closePath();
            ctx.restore();
            break;
        case "RectangleShape":
            ctx.save();
            ctx.beginPath();
            ctx.fillStyle = "black";
            if (player.currentSpellInvocation.spell.type === SpellType.onGround) {
                const coordinate = convertToCanvasCoordinate(player.currentSpellInvocation.coordinate, player);
                ctx.translate(coordinate.x, coordinate.y);
            } else {
                const coordinate = convertToCanvasCoordinate(player.coordinate, player);
                ctx.translate(coordinate.x, coordinate.y);
            }
            //rotate to the direction of the player
            ctx.rotate(player.currentSpellInvocation.spell.initPlayerRotation - Math.PI / 2);

            const rectangleX = -(player.currentSpellInvocation.spell.shape as RectangleShape).width / 2;

            ctx.fillRect(rectangleX, 0, (player.currentSpellInvocation.spell.shape as RectangleShape).width, (player.currentSpellInvocation.spell.shape as RectangleShape).length);
            ctx.fill();
            ctx.closePath();
            ctx.restore();
            break;
    }
}

function drawUI() {
    //Draw Spells of the currentPlayer at the bottom left of the screen
    ctx.save();
    ctx.translate(0, canvas.height - 100);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, 100);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, 1);
    ctx.fillRect(0, 0, 1, 100);
    ctx.fillRect(canvas.width - 1, 0, 1, 100);
    ctx.fillRect(0, 100 - 1, canvas.width, 1);
    ctx.restore();

    for (let i = 0; i < currentPlayer.spells.length; i++) {
        ctx.save();
        ctx.translate(0, canvas.height - 100);
        ctx.translate(10 + i * 100, 10);
        if (currentPlayer.onCast) {
            if (currentPlayer.spells[i].onCast) {
                //Spell is onCast
                ctx.fillStyle = "blue";
            } else {
                //Can't the other spells
                ctx.fillStyle = "orange";
            }
        } else {
            //Cooldown
            ctx.fillStyle = currentPlayer.spells[i].onCooldown ? "red" : "green";
        }

        ctx.fillRect(0, 0, 80, 80);
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, 80, 1);
        ctx.fillRect(0, 0, 1, 80);
        ctx.fillRect(80 - 1, 0, 1, 80);
        ctx.fillRect(0, 80 - 1, 80, 1);
        ctx.restore();
    }
}

function drawMap() {
    const topLeft = new Coordinate(
        currentPlayer.coordinate.x - canvas.width / 2,
        currentPlayer.coordinate.y - canvas.height / 2
    );
    const bottomRight = new Coordinate(
        currentPlayer.coordinate.x + canvas.width / 2,
        currentPlayer.coordinate.y + canvas.height / 2
    );

    //draw map limit if the canvas is out of the map
    if (topLeft.x < 0) {
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, -topLeft.x, canvas.height);

    }
    if (topLeft.y < 0) {
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, -topLeft.y);

    }
    if (bottomRight.x > worldDimension.width) {
        ctx.fillStyle = "black";
        ctx.fillRect(canvas.width - (bottomRight.x - worldDimension.width), 0, bottomRight.x - worldDimension.width, canvas.height);
    }
    if (bottomRight.y > worldDimension.height) {
        ctx.fillStyle = "black";
        ctx.fillRect(0, canvas.height - (bottomRight.y - worldDimension.height), canvas.width, bottomRight.y - worldDimension.height);
    }
}

function draw() {
    if (frameIndex === gameSettings.fps) {
        frameIndex = 0;
    } else {
        frameIndex++;
    }
    if (gameState.needToDraw) {
        // clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // draw background
        ctx.fillStyle = gameSettings.backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // draw players
        if (gameSettings.players) {
            gameState.players.forEach(drawPlayer);
        }

        drawMap();

        drawUI();

        if (gameSettings.showMiniMap) {
            drawMiniMap();
        }

        if (gameSettings.showLeaderboard) {
            drawLeaderboard();
        }


        gameState.needToDraw = false;
    }
}

function convertToCanvasCoordinate(
    objectCoordinate: Coordinate,
    currentPlayer: Player
): Coordinate {
    const x =
        objectCoordinate.x - (currentPlayer.coordinate.x - canvas.width / 2);
    const y =
        objectCoordinate.y - (currentPlayer.coordinate.y - canvas.height / 2);
    return new Coordinate(x, y);
}

function convertToGameCoordinate(
    objectCoordinate: Coordinate,
    currentPlayer: Player
): Coordinate {
    const x =
        objectCoordinate.x + (currentPlayer.coordinate.x - canvas.width / 2);
    const y =
        objectCoordinate.y + (currentPlayer.coordinate.y - canvas.height / 2);
    return new Coordinate(x, y);
}


function getRotationByClick(event) {
    mouse = new Coordinate(event.clientX, event.clientY);
    const mouseWorldCoordinate = convertToGameCoordinate(
        mouse,
        currentPlayer
    );

    const vector = Vector.factoryWithPoint(
        currentPlayer.coordinate,
        mouseWorldCoordinate
    );

    let rotation = vector.getAngle();

    if (rotation < 0) {
        rotation = 2 * Math.PI + rotation;
    }


    return rotation;
}

function manageKeyEventFromPlayer(event) {
    if (currentPlayer.onCast) return
    switch (event.key.toLowerCase()) {
        case gameSettings.player.bind.spell1:
            emitSpell(SpellAction.spell1)
            break;
        case gameSettings.player.bind.spell2:
            emitSpell(SpellAction.spell2)
            break;
        case gameSettings.player.bind.special:
            let spellSpecial = null;
            if (currentPlayer.special.type === SpellType.onGround) {
                spellSpecial = new SpecialInvocation(currentPlayer.special, convertToGameCoordinate(mouse, currentPlayer), currentPlayer);
            } else {
                spellSpecial = new SpecialInvocation(currentPlayer.special, null, currentPlayer)
            }
            socket.emit("special", spellSpecial);
            break;
    }
}


function manageClickFromPlayer(event: MouseEvent) {
    emitSpell(SpellAction.basicAttack)
}

function emitSpell(spellAction: SpellAction) {
    if (!currentPlayer) return

    const spell = currentPlayer.spells.find((spell) => spell.action === spellAction);
    let spellInvocation: SpellInvocation = null;
    if (spell.type === SpellType.onGround) {
        spellInvocation = new SpellInvocation(spell, convertToGameCoordinate(mouse, currentPlayer));
    } else {
        spellInvocation = new SpellInvocation(spell, null)
    }
    socket.emit("spell", spellInvocation);
}

function init() {
    //SETUP
    canvas.width = window.document.documentElement.clientWidth;
    canvas.height = window.document.documentElement.clientHeight - 1;
    //Calculate
    gameSettings.player.animation.playerRunImageFrameWidth = gameSettings.player.animation.playerRunImageWidth / gameSettings.player.animation.playerRunImageFrame
    gameSettings.timePerTick = 1000 / gameSettings.fps;
    gameSettings.player.move.delay = Math.floor(gameSettings.fps / 10);

    if (gameSettings.players) {
        canvas.addEventListener(
            "mousemove",
            function (event) {
                if (moveIndex >= gameSettings.player.move.delay) {
                    socket.emit("moving", getRotationByClick(event));
                    moveIndex = 0;
                } else {
                    moveIndex++;
                }

            },
            false
        );

        document.addEventListener(
            "keypress",
            manageKeyEventFromPlayer);

        document.addEventListener(
            "click",
            manageClickFromPlayer);
    }

    //IO
    socket.emit("init", {
        window: new Dimension(canvas.width, canvas.height),
        name: username,
    });

    socket.on("welcome", (metadataFromServer) => {
        console.log("MetaData from server: ", metadataFromServer);
        currentPlayer = metadataFromServer.currentPlayer;
        worldDimension = metadataFromServer.worldDimension;
        gameSettings.minimap.miniMapRatio = gameSettings.minimap.miniMapSize / worldDimension.width;
    });

    socket.on("update", (gameStateFromServer) => {


        gameState = {...gameStateFromServer};

        const localCurrentPlayer = gameState.players.find((player) => player.id === currentPlayer.id)
        if (gameSettings.players && localCurrentPlayer) {
            currentPlayer = clone(localCurrentPlayer)
        }

        gameState.needToDraw = true;
        draw();
    });

    if (canvas.getContext("2d")) {
        console.log("Game is ready 😊");
        setInterval(draw, gameSettings.timePerTick);
    }
}
