import { derived, writable } from 'svelte/store';
import { writable as lswritable } from 'svelte-local-storage-store';
import { firstlaunch } from './constants.js';

/** @typedef {import('./quotes.js').EncryptedQuote} EncryptedQuote */

// progress is null if none or an array of whether the char is filled
const defaultUsers = [
  {
    id: '',
    name: '',
    /** @type {string | null} */
    focussedKey: null,
  },
].slice(1);

/** @typedef {typeof defaultUsers[0]} User */
/** @typedef {import('peerjs').DataConnection} Connection */

export const users = writable(defaultUsers);

export const id = writable('');
export const gameProblem = writable(
  /** @type {EncryptedQuote | null} */ (null)
);
export const name = lswritable(
  'name',
  `person-${Math.floor(Math.random() * 10000)}`
);
export const patristocratEnabled = lswritable('patristocrat', false);
export const hintEnabled = lswritable('hint', false);
export const hivemindConnection = writable(
  /** @type {Connection | null} */ (null)
);
export const replacement = writable(Array(26).fill(''));
export const solved = writable(false);
export const isFirstLaunch = lswritable(firstlaunch, true);
export const needsKeyboardEntry = writable(false);
export const focussedKey = writable(/** @type {string | null} */ (null));

/** @type {Map<string, Connection>} */
export const connections = new Map(); // id -> connection

/** @type {Map<number, (newChar: string) => void>} */
export const keyboardSubscriptions = new Map();

export const self = derived(
  [id, name, focussedKey],
  ([id, name, focussedKey]) => {
    return { id, name, focussedKey };
  }
);

export const problemStart = derived(
  gameProblem,
  ($gp) => $gp?.start ?? Date.now()
);

export const resetStores = () => {
  id.set('');
  gameProblem.set(null);
  name.set('');
  solved.set(false);
  replacement.set(Array(26).fill(''));
  hivemindConnection.set(null);
  connections.clear();
};
