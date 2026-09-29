/**
 * Un registro que se elige en una columna de referencia: su id y el nombre que se escribe en Excel
 * (o su código, si lo tiene).
 */
export interface OpcionDeReferencia {
  id: string;
  nombre: string;
  codigo?: string;
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
      /** Si las opciones traen `codigo`, en Excel también se puede escribir; la hoja de instrucciones lo dice. */
      tambienPorCodigo?: boolean;
      /** Lo que se puede elegir; se consulta una vez por importación, dentro de su transacción. */
      opciones: () => Promise<OpcionDeReferencia[]>;
    });

export type TipoDeColumna = Columna['tipo'];

/** Para comparar lo escrito a mano: sin tildes, sin mayúsculas, sin espacios de más ni el `*` de obligatorio. */
export const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/\p{M}/gu, '').replace(/\*/g, '').trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * Las opciones de una columna de referencia a partir de las consultas del
 * recurso referido: su id y el campo que lo nombra. Con `campoDeCodigo`, en Excel también
 * se puede escribir su código.
 * @example opcionesDe(new ConsultasPotrerosDrizzle(), 'nombre')
 * @example opcionesDe(new ConsultasLocalidadesDrizzle(), 'nombre', 'codigo')
 */
export const opcionesDe =
  <Registro extends { id: string }>(
    consultas: { listar(): Promise<Registro[]> },
    campo: keyof Registro,
    campoDeCodigo?: keyof Registro,
  ) =>
  async (): Promise<OpcionDeReferencia[]> =>
    (await consultas.listar()).map((registro) => ({
      id: registro.id,
      nombre: String(registro[campo]),
      ...(campoDeCodigo ? { codigo: String(registro[campoDeCodigo]) } : {}),
    }));
