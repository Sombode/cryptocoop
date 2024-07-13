const peer = new Peer();
let hiveBrain = new URLSearchParams(location.search).get('room');
let isHiveBrain = hiveBrain === null;
let hiveBrainConn;
let id;
const connections = new Map();
const Messages = {
    INIT: 0,
}

const arraySubscription = (target, updateFunc) => new Proxy(target, {
  set(target, prop) {
    // array.push() hits this trap twice as
    // it also set the length (which counts I guess)
    
    // also, using setTimeout here to delay updateFunc to the next event cycle
    // since the array doesn't actually get modified until afterwards
    if(prop != "length") setTimeout(updateFunc);
    return Reflect.set(...arguments);
  }
});

//let players = [];
let players = arraySubscription([], () => {
  console.log(`Updated Players ${players}`);
})

// const connections = subscription(new Map(), () => {
//   console.log(connections);
// });

// class SubscribableArray extends Array {
//   constructor(updateFunc) {
//     super();
//     this.updateFunc = updateFunc;
//   }
//   set(...args) {
//     console.log("SET");
//     this.updateFunc();
//     return super.set(...args);
//   }
// }

// let players = new SubscribableArray(() => {
//   console.log("PLAYERS UPDATED");
// });

const emit = (msg) =>
  connections.forEach((conn) => conn.send(msg));

const onData = (targetId) => (data) => {
  console.log(`Recieved data! ${data}`);
  if (messageHandlers[data.type]) messageHandlers[data.type](targetId, data);
};

const removePlayer = (targetId) => () => {
    players = players.filter((player) => player.id !== targetId);
    connections.delete(targetId);
  };

const sendInitialState = (conn) =>
    (conn === null || conn === void 0 ? void 0 : conn.send({
      type: Messages.INIT,
      // TODO: Add names!
      name: id,
    }));

const openConnection = (conn) =>
    new Promise((res) => {
      conn.on('open', () => {
        if (conn.peer === hiveBrain) hiveBrainConn = conn;
        connections.set(conn.peer, conn);
        conn.on('data', onData(conn.peer));
        conn.on('close', removePlayer(conn.peer));
        setTimeout(() => {
          sendInitialState(conn);
        }, 100);
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

const messageHandlers = [
  initializePlayer,
]

peer.on("open", ($id) => {
    id = $id;
    document.getElementById("debugId").innerText = `${(isHiveBrain ? "[HIVEBRAIN] " : "")} ${id}`;
    if(!isHiveBrain && hiveBrain != null) connectTo(hiveBrain);
    console.info(isHiveBrain
    ? `${window.location.href}?room=${encodeURIComponent(id)}`
    : window.location.href);

});

peer.on('connection', openConnection);

peer.on('error', (e) => {
  console.error(e);
});

/**
 * @param {number} i
 * @param {string} j
 * @returns {number}
 */
const add = (i, j) => {
  return i + parseFloat(j);
};