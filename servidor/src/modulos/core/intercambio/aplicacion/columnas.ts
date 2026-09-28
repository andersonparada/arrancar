/** Un registro que se elige en una columna de referencia: su id y el nombre que se escribe en Excel. */
export interface OpcionDeReferencia {
  id: string;
  nombre: string;
}

interface ComunDeColumna {
  /** El campo de la solicitud y del registro: `arete`, `potreroId`. */
  clave: string;
  /** El encabezado en Excel: `Arete`, `Potrero`. */
  titulo: string;
  requerido: boolean;
}

/**
 * Una columna del Excel de un recurso: qué dato lleva y cómo se escribe. Las
 * referencias se escriben por nombre; al importar se buscan entre `opciones`.
 */
export type Columna =
  | (ComunDeColumna & { tipo: 'texto' | 'entero' | 'decimal' | 'fecha' | 'siNo' })
  | (ComunDeColumna & { tipo: 'lista'; opciones: Readonly<Record<string, string>> })
  | (ComunDeColumna & {
      tipo: 'referencia';
      /** El campo del registro con el nombre de lo elegido: `potreroNombre`. */
      campoDeNombre: string;
      /** Lo que se puede elegir; se consulta una vez por importación, dentro de su transacción. */
      opciones: () => Promise<OpcionDeReferencia[]>;
    });

export type TipoDeColumna = Columna['tipo'];

/** Para comparar lo escrito a mano: sin tildes, sin mayúsculas, sin espacios de más ni el `*` de obligatorio. */
export const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/\p{M}/gu, '').replace(/\*/g, '').trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * Las opciones de una columna de referencia a partir de las consultas del
 * recurso referido: su id y el campo que lo nombra.
 * @example opcionesDe(new ConsultasPotrerosDrizzle(), 'nombre')
 */
export const opcionesDe =
  <Registro extends { id: string }>(consultas: { listar(): Promise<Registro[]> }, campo: keyof Registro) =>
  async (): Promise<OpcionDeReferencia[]> =>
    (await consultas.listar()).map((registro) => ({ id: registro.id, nombre: String(registro[campo]) }));
