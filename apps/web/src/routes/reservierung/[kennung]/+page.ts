import { STAMMKENNUNGEN } from '@edsh-bucky/reservierung-core';
import type { EntryGenerator } from './$types.js';

/**
 * Welche Kennungen beim Bauen als Seite entstehen.
 *
 * Die App wird vollständig vorgebaut (`prerender = true`), und eine
 * Adressschablone kann der Baulauf nicht von allein auflösen. Die Liste kommt
 * deshalb aus derselben Stammliste im Kern, die auch `/api/flotte` beantwortet
 * — die eine Wahrheit über die Flotte (D1). Kommt ein Flugzeug hinzu, entsteht
 * seine Detailseite mit dem nächsten Bau von selbst.
 */
export const entries: EntryGenerator = () =>
	STAMMKENNUNGEN.map((kennung) => ({ kennung: kennung.toLowerCase() }));
