import type { PlzDataset } from './plz-lookup';

// Eigene Datei, damit Tests die große Tabelle nicht laden müssen.
export const plzDataset: PlzDataset = require('../../../../assets/data/plz-wahlkreis.json');
