import { Errors } from '@/js/constants.js';

/**
 * @template T
 * @typedef {(node: HTMLElement, options: Partial<T>) => Partial<{
 *  update: (newOptions: Partial<T>) => void,
 *  destroy: () => void
 * }>} Action
 */

const replaceableElementDefaultOptions = {
  ogchar: '',
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  dispatch: (/** @type {string} */ _key, _detail = {}) => {},
  disabled: false,
};

/** @type {Action<typeof replaceableElementDefaultOptions>} */
export const replaceableElement = (node, options_ = {}) => {
  let options = /** @type {typeof replaceableElementDefaultOptions} */ ({
    ...options_,
    replaceableElementDefaultOptions,
  });
  const { dispatch } = options;

  const setProperties = () => {
    node.style.setProperty(
      'pointer-events',
      options.disabled ? 'none' : 'auto'
    );
  };

  setProperties();

  const selectKey = (offset = 1, selector = ".decrypted-letter:not(.non-alphabetic, .disabled) > .decrypted-letter-input") => {
    /** @type {HTMLElement[]} */
    const letters = [].slice.call(document.querySelectorAll(selector));
    return letters[letters.indexOf(node) + offset];
  }

  /** @type {(e: KeyboardEvent) => void} */
  const onKeyDown = (e) => {
    if (options.disabled) return;

    e.preventDefault();
    if( e.key == 'ArrowLeft') {
      selectKey(-1)?.focus();
      return;
    }
    if( e.key == 'ArrowRight') {
      selectKey()?.focus();
      return;
    }

    if (options.ogchar === e.key.toUpperCase()) {
      dispatch('error', {
        id: Errors.NO_SELF_DECODE,
        msg: 'Letters cannot decode to themselves',
      });
      return;
    }

    dispatch('replace', {
      from: options.ogchar,
      to: e.key.toUpperCase(),
    });

    if( e.key == 'Backspace') {
      selectKey(-1)?.focus();
      return;
    }

    // Focus on next letter if possible (horribly janky I know)
    let key;
    let offset = 0;
    do
      key = selectKey(++offset, ".decrypted-letter.empty:not(.non-alphabetic, .disabled) > .decrypted-letter-input");
    while(key && key.parentElement?.previousElementSibling?.innerHTML === options.ogchar && key !== node);
    key?.focus();
  };

  node.addEventListener('keydown', onKeyDown);

  return {
    update(newOptions) {
      options = { ...options, ...newOptions };
      setProperties();
    },

    destroy() {
      node.removeEventListener('keydown', onKeyDown);
    },
  };
};
