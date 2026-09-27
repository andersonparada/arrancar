/** Lo que se escribió después de `npm run generar --`. */
export interface Orden {
  comando: string;
  argumentos: string[];
  /** `--nombre "Ganado"` → `{ nombre: 'Ganado' }`. */
  opciones: Record<string, string>;
}

/** Separa el comando, sus argumentos y las opciones `--clave valor`. */
export function leerOrden(palabras: readonly string[]): Orden {
  const [comando = 'ayuda', ...resto] = palabras;
  const argumentos: string[] = [];
  const opciones: Record<string, string> = {};
  for (let i = 0; i < resto.length; i++) {
    const palabra = resto[i]!;
    if (palabra.startsWith('--')) opciones[palabra.slice(2)] = resto[++i] ?? '';
    else argumentos.push(palabra);
  }
  return { comando, argumentos, opciones };
}

export const AYUDA = `Uso:
  npm run generar -- modulo <clave> [--nombre "Nombre visible"] [--descripcion "..."] [--icono Beef]
      Esqueleto de un módulo en el servidor y en el cliente, su documento y su registro.

  npm run generar -- recurso <modulo>/<entidad>
      Todo lo de una entidad a partir de generador/definiciones/<modulo>/<entidad>.ts.
`;
