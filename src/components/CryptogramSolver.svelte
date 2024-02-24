<script>
  import { createEventDispatcher } from 'svelte';
  import { get } from 'svelte/store';
  import { alphabet, splitQuote } from '@/js/quotes.js';
  import { log } from '@/js/utils.js';
  import { replacement } from '@/js/store';

  import Word from './Word.svelte';
  import ReplacementTable from './ReplacementTable.svelte';

  /** @typedef {import('@/js/quotes.js').EncryptedQuote} EncryptedQuote */

  /** @type {EncryptedQuote | null} */
  export let problem = null;

  const dispatch = createEventDispatcher();

  /** @type {(replacement: { from: string, to: string }) => void} */
  const replace = ({ from, to }) => {
    if ((to.length !== 1 || !/[a-zA-Z]/.test(to)) && to !== 'BACKSPACE') return;
    const newReplacement = [...get(replacement)];
    newReplacement[alphabet.indexOf(from)] = to === 'BACKSPACE' ? '' : to;
    replacement.set(newReplacement);
    console.table(get(replacement));
    // maybe??
    // substitutions.set(replacement);
  };

  /** @type {(replacement: string[], problem: EncryptedQuote | null) => boolean} */
  const isCorrect = (replacement, problem) => {
    if (!problem) return false;
    return [...problem.ciphertext].every(
      (ch, i) =>
        !alphabet.includes(ch) ||
        problem.plaintext[i] === replacement[alphabet.indexOf(ch)]
    );
  };

  /** @type {(replacement: string[], ciphertext: string) => boolean[]} */
  const getProgress = (replacement, ciphertext) =>
    [...ciphertext].map(
      (ch) => alphabet.includes(ch) && replacement[alphabet.indexOf(ch)] !== ''
    );

  /** @type {(e: CustomEvent<any>) => void} */
  const handleReplace = (e) => replace(e.detail);

  $: problem;

  $: words = splitQuote(problem?.ciphertext ?? '');
  $: solved = isCorrect(get(replacement), problem);
  $: if (solved) {
    dispatch('solved');
  }
  $: dispatch('progress', {
    progress: getProgress(get(replacement), problem?.ciphertext ?? ''),
  });

  $: log('problem:', problem, 'replacement', replacement);
</script>

{#if problem}
  <p>Solve this quote by {problem.author}</p>
  {#if problem.hint}
    <p>HINT: The first word is {problem.hint}</p>
  {/if}
  <div class="cryptogram" class:solved>
    {#each words as word}
      <Word
        {word}
        disabled={solved}
        on:replace={handleReplace}
        on:error
      />
    {/each}
  </div>
  <ReplacementTable
    quote={problem.ciphertext}
    disabled={solved}
    on:replace={handleReplace}
    on:error
  />
{/if}

<style>
  p {
    margin: 0 0 0.5rem 0;
  }

  .cryptogram {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 2rem;
  }

  .solved {
    color: var(--solved-text-color);
  }
</style>
