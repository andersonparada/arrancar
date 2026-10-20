/** Suma, en centavos (o en la unidad entera que sea), las columnas indicadas de las filas. */
export function sumarColumnas<Fila extends Record<Clave, number>, Clave extends string>(
  filas: readonly Fila[],
  claves: readonly Clave[],
): Record<Clave, number> {
  const total = {} as Record<Clave, number>;
  for (const clave of claves) {
    total[clave] = filas.reduce<number>((suma, fila) => suma + fila[clave], 0);
  }
  return total;
}

/** Un grupo de filas con la misma clave y su subtotal. */
export interface GrupoConSubtotal<Fila, Clave extends string> {
  clave: string | null;
  filas: Fila[];
  subtotal: Record<Clave, number>;
}

/** Agrupa las filas por clave, en el orden en que aparece cada una, y calcula el subtotal de cada grupo. */
export function agruparConSubtotal<Fila extends Record<Clave, number>, Clave extends string>(
  filas: readonly Fila[],
  opciones: { clave: (fila: Fila) => string | null; sumar: readonly Clave[] },
): Array<GrupoConSubtotal<Fila, Clave>> {
  const grupos = new Map<string | null, Fila[]>();
  for (const fila of filas) {
    const clave = opciones.clave(fila);
    grupos.set(clave, [...(grupos.get(clave) ?? []), fila]);
  }
  return [...grupos].map(([clave, delGrupo]) => ({
    clave,
    filas: delGrupo,
    subtotal: sumarColumnas(delGrupo, opciones.sumar),
  }));
}
