<script>
  import {
    alphabet,
    cryptogramCharacterLabel,
    occurencesCharacterLabel,
    replacementCharacterLabel,
  } from '@/js/constants.js';
  import { getCounts } from '@/js/utils.js';
  import ReplacementCharacter from './ReplacementCharacter.svelte';
  import { replacement } from '@/js/store';

  export let quote = '';
  export let disabled = false;

  $: frequencies = getCounts(quote);
</script>

<table class="replacement-table" class:disabled>
  <tr class="header">
    <td title={cryptogramCharacterLabel} class="from-label">BLANK</td>
    <td title={occurencesCharacterLabel} class="occurences-label">Frequency</td>
    <td title={replacementCharacterLabel} class="to-label">Replacement</td>
  </tr>
  {#each alphabet as ch, i}
    {@const replacementId = `replacement-${i}`}
    {@const isInQuote = frequencies.has(ch)}
    <tr class:no-occurence={!isInQuote}>
      <td id={replacementId}>{ch}</td>
      <td style="font-weight: 400;">{isInQuote ? frequencies.get(ch) : 0}</td>
      <ReplacementCharacter
        tag="td"
        replacement={$replacement[i]}
        disabled={disabled || !isInQuote}
        ogchar={ch}
        disableUnderline
        on:error
        on:replace
      />
    </tr>
  {/each}
</table>

<style>
  .replacement-table {
    font-family: var(--cipher-font);
    font-weight: 700;
    --border: 1px solid black;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    user-select: none;
    text-align: center;
  }

  tr {
    display: flex;
    flex-direction: column;
    width: 2rem;
  }

  .replacement-table :global(td) {
    border-right: var(--border);
    border-bottom: var(--border);
    padding: 0.25rem;
  }

  .replacement-table :global(td:first-child) {
    border-top: var(--border);
  }

  tr:first-child {
    border-left: var(--border);
  }

  .header {
    width: min-content;
  }

  .from-label {
    color:transparent;
  }

  .to-label {
    height: 1.15rem;
  }

  .replacement-table :global(.decrypted-letter) {
    padding: 0rem;
    width: calc(2rem - 1px);
    height: 1.65rem;
  }

  .replacement-table :global(.decrypted-letter-input) {
    padding: 0.25rem;
  }

  .replacement-table :global(div.decrypted-letter-input) {
    justify-content: center;
  }

  .no-occurence {
    background-color: var(--no-occurence-color);
    color: var(--no-occurence-bg-color);
    pointer-events: none;
  }
</style>
