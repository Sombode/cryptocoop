const MAX_PLAYERS = 3;
const ALPHABET = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
const Messages = {
    UPDATE_PLAYERS: 0,
    ERROR: 1,
    NEW_QUOTE: 2,
    REPLACE_LETTER: 3,
    CHANGED_FOCUS: 4
}

const clamp = (value, min, max) => Math.max(Math.min(value, max), min);

const getJoinLink = () => (isHiveBrain ? `${window.location.href}?room=${encodeURIComponent(id)}` : window.location.href);

// Creates a proxy object to call updateFunc every time target (an array)
// is modified (essentially a RxJS subscription)
const arraySubscription = (target, updateFunc) => new Proxy(target, {
    set(_, prop) {
      // Turns out functions that change length hit this trap
      if(prop != "length") setTimeout(() => {
        updateFunc.call(this, prop)
      });
      return Reflect.set(...arguments);
    }
});

// This is taken directly from r2dev2's Cryptoduel,
// (which the original Cryptocoop forked)
// Hence why the code is actually good here
const shuffleArray = (arr) => arr
    .map((a) => ([Math.random(), a]))
    .sort((a, b) => a[0] - b[0])
    .map((a) => a[1]);

const generateRandomEncryption = () => {
    const encMap = shuffleArray([...Array(26).keys()]);
    if (encMap.some((x, i) => x === i)) return generateRandomEncryption();
    return encMap.map((i) => ALPHABET[i]);
};