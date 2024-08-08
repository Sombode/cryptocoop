const peer = new Peer();
const connections = new Map();
let hiveBrain = new URLSearchParams(location.search).get('room');
let isHiveBrain = hiveBrain === null;
let id;
let numID = (isHiveBrain ? 0 : undefined);

const emit = (msg) => connections.forEach((conn) => conn.send(msg));

// Only the hiveBrain needs to be watching the player array for changes
// So only it uses a proxy for the players array
let players = (isHiveBrain ? arraySubscription([], () => {
  // Sync player list with all other players
  emit({
    type: Messages.UPDATE_PLAYERS,
    players: players
  });
}) : []);

const messageHandlers = [
  updatePlayers,
  handleError,
  onNewQuote,
  remoteReplaceLetter,
  remoteChangeFocus,
  onCompletition
];

const onData = (targetId) => (data) => (messageHandlers[data.type] ? messageHandlers[data.type](targetId, data) : null);

const removePlayer = (targetID) => () => {
  if(isHiveBrain) players = players.filter((player) => player.id !== targetID);
  connections.delete(targetID);
};

const openConnection = (conn) => {
  conn.on('open', () => {
    connections.set(conn.peer, conn);
    conn.on('data', onData(conn.peer));
    // TODO: handle disconnects by polling
    // dataChannel.peerConnection.iceConnectionState
    conn.on('close', removePlayer(conn.peer));
    if(!isHiveBrain) conn.send({
      type: Messages.UPDATE_PLAYERS,
      player: {
        id,
        name: id
      }
    });
  });
}

// An intermediary function for the hiveBrain to validate incoming connections
function handleConnection(conn) {
  if(isHiveBrain && players.length >= MAX_PLAYERS) {
    // If the room is full, let the incoming connection know before closing it
    // TODO: add code to remove dead players before rejecting new ones
    conn.on("open", () => {
      conn.send({
        // Consider error codes if there are enough types of errors
        type: Messages.ERROR,
        error: "The room is full."
      });
      conn.close();
    });
  } else openConnection(conn);
}

// For the hiveBrain, this function serves to initialize a new player
// For other players, it serves to update the list of current players
function updatePlayers(_, data) {
  if(isHiveBrain)
    players.push(data.player);
  else {
    players = data.players;
    if(!numID) {
      numID = players.findIndex((player) => player.id == id);
      document.querySelector(":root").style.setProperty("--hover-color", `var(--${numID}-focus)`);
      document.getElementById("playerNumberStatus").innerText = `You are Player ${Number(numID) + 1}!`;
    }
  }
  for(i in players) {
    // DEBUG
    const statusElement = document.getElementById(`player${i}Status`);
    statusElement.innerText = `Player ${Number(i) + 1}: ${(players[i] ? "" : "Not ")}Connected.`;
  }
}

function handleError(_, data) {
  console.error(data.error);
  alert(data.error);
}

function onNewQuote(_, data) {
  insertQuote(data.quote);
}

function remoteReplaceLetter(_, data) {
  replaceLetter(data.letter, data.replacement);
}

function remoteChangeFocus($id, data) {
  let $numID = players.findIndex((player) => player.id == $id);
  letterFoci[$numID] = (data.index == -1 ? null : inputs[data.index]);
}

function onCompletition(_, data) {
  endCode(data.time);
}

peer.on("open", ($id) => {
    id = $id;
    if(isHiveBrain) {
      players[0] = {
        id,
        name: id
      };
    } else if(hiveBrain != null) openConnection(peer.connect(hiveBrain));
    // DEBUG
    console.info(getJoinLink());
    document.getElementById("joinLink").innerHTML = `Join Link: <a href="${getJoinLink()}">${getJoinLink()}</a>`;
});

peer.on('connection', handleConnection);

peer.on('error', (e) => {
  console.error(e);
  alert("A network error occurred. See the console for details.");
});