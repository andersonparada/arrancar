/** «Falta el número y la fecha.» / «Faltan 3 datos: …» para el cuadro de la parte de arriba del formulario. */
export function avisoDeLaFalta(pendientes: readonly string[]): string {
  if (pendientes.length === 0) return '';
  const lista =
    pendientes.length === 1 ? (pendientes[0] ?? '') : `${pendientes.slice(0, -1).join(', ')} y ${pendientes.at(-1)}`;
  return `Falta ${lista}.`;
}
