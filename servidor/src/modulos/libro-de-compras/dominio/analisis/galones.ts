/** Milésimas enteras de galón como texto con tres decimales: `10500` → `"10.500"`, `-250` → `"-0.250"`. */
export function galonesATexto(milesimas: number): string {
  const signo = milesimas < 0 ? '-' : '';
  const absoluto = Math.abs(milesimas);
  return `${signo}${Math.trunc(absoluto / 1000)}.${String(absoluto % 1000).padStart(3, '0')}`;
}
