import { loadJSON } from './dataLoader.js';

const UOM_TABLE_PATH = 'Required for grocery app/uom_conversion_table.json';
let table = null;

export async function initUomTable() {
  try {
    table = await loadJSON(UOM_TABLE_PATH);
  } catch (e) {
    table = {};
  }
}

export function convert(value, fromUnit, toUnit) {
  if (!table) return value;
  const key = `${fromUnit}_${toUnit}`;
  const factor = table[key];
  if (!factor) return value;
  return value * factor;
}
