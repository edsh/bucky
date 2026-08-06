<script lang="ts">
  import type { SourceReference } from '@edsh-bucky/deelk-poh-core';

  /**
   * Quellenangaben und Prüfhinweis. Beide kommen wortgleich aus dem Kern
   * (FR-005, FR-006, Zusicherung C-02) und stehen ohne Aufklappen sichtbar —
   * sie sind laut Constitution-Prinzip I Teil des Ergebnisses, kein Beiwerk.
   */
  let {
    sources,
    preflightCheckNotice
  }: { sources: readonly SourceReference[]; preflightCheckNotice: string } = $props();
</script>

<section class="quellen">
  <h3>Verwendete Tabellen</h3>

  <ul>
    {#each sources as source (source.tableId)}
      <li>
        <strong>{source.figure}</strong> — {source.tableName}
        <span class="seiten">
          Seite {source.pohPages.join(', ')} — {source.issue}, {source.revision}
        </span>
        <span class="zitat">{source.citation}</span>
      </li>
    {/each}
  </ul>

  <p class="pruefhinweis" role="note">{preflightCheckNotice}</p>
</section>

<style>
  .quellen {
    margin-top: 1.5rem;
  }

  ul {
    list-style: none;
    padding: 0;
  }

  li {
    margin-bottom: 0.75rem;
  }

  .seiten {
    display: block;
    font-size: 0.9em;
  }

  .zitat {
    display: block;
    font-size: 0.8em;
    color: #666;
  }

  .pruefhinweis {
    margin-top: 1rem;
    padding: 0.75rem;
    border: 2px solid #a00;
    font-weight: 700;
  }
</style>
