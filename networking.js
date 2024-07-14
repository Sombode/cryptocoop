const peer = new Peer();
let hiveBrain = new URLSearchParams(location.search).get('room');
let isHiveBrain = hiveBrain === null;
// REFACTOR: might be able to remove this
let hiveBrainConn;
let id;
// consider changing the map to an array?
const connections = new Map();
const Messages = {
    INIT: 0,
    ERROR: 1,
    NEW_QUOTE: 2,
    REPLACE_LETTER: 3,
}

let players = new Array();

const MAX_PLAYERS = 2;

const emit = (msg) => connections.forEach((conn) => conn.send(msg));

const onData = (targetId) => (data) => (messageHandlers[data.type] ? messageHandlers[data.type](targetId, data) : null);

const removePlayer = (targetId) => () => {
  players = players.filter((player) => player.id !== targetId);
  connections.delete(targetId);
};

const sendInitialState = (conn) =>
  (conn ? conn.send({
    type: Messages.INIT,
    // TODO: Add names!
    name: id,
  }) : null);

const openConnection = (conn) =>
  new Promise((res) => {
    conn.on('open', () => {
      if (conn.peer === hiveBrain) hiveBrainConn = conn;
      connections.set(conn.peer, conn);
      conn.on('data', onData(conn.peer));
      // TODO: handle disconnects by polling
      // dataChannel.peerConnection.iceConnectionState
      conn.on('close', removePlayer(conn.peer));
      setTimeout(() => { sendInitialState(conn) }, 100);
      res(conn);
    });
  });

const connectTo = (targetId) =>
  new Promise((res) => {
    const conn = peer.connect(targetId);
    openConnection(conn).then(res);
    // const unsub = id.subscribe(($id) => {
    //   if ($id === '') return;
    //   const conn = peer.connect(targetId);
    //   setTimeout(() => unsub());
    //   openConnection(conn).then(res);
    // });
  });

const initializePlayer = (id, data) => {
  players.push({
    id,
    name: data.name,
    // TODO: ick (my own code!)
    focussedKey: null
  });
};

const handleError = (_, data) => console.error(data.error);

const onNewQuote = (_, data) => insertQuote(data.quote);

const remoteReplaceLetter = (_, data) => replaceLetter(data.letter, data.replacement);

const messageHandlers = [
  initializePlayer,
  handleError,
  onNewQuote,
  remoteReplaceLetter
]

function handleConnection(conn) {
  if(isHiveBrain && players.length >= MAX_PLAYERS) {
    // If the room is full, let the incoming connection know before closing it
    conn.on("open", () => {
      conn.send({
        type: Messages.ERROR,
        // Consider error codes if there are enough types of errors
        error: "The room is full."
      });
      conn.close();
    });
    return;
  }
  openConnection(conn);
}

peer.on("open", ($id) => {
    id = $id;
    document.getElementById("debugId").innerText = `${(isHiveBrain ? "[HIVEBRAIN] " : "")} ${id}`;
    if(!isHiveBrain && hiveBrain != null) connectTo(hiveBrain);
    console.info(isHiveBrain ? `${window.location.href}?room=${encodeURIComponent(id)}` : window.location.href);
});

peer.on('connection', handleConnection);

peer.on('error', (e) => console.error(e));