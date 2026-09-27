/**
 * Tipos de campo de una definición. Cada función devuelve la descripción del
 * campo; qué columna, esquema, objeto de valor y control genera cada tipo lo
 * deciden las plantillas del servidor y del cliente.
 */

interface ComunDeCampo {
  requerido: boolean;
  /** Lo que lee el usuario; si falta, sale del nombre del campo (`fechaDeNacimiento` → "Fecha de nacimiento"). */
  etiqueta?: string;
}

interface OpcionesComunes {
  requerido?: boolean;
  etiqueta?: string;
}

interface OpcionesUnicas extends OpcionesComunes {
  /** No se repite dentro del alcance (empresa o cuenta). */
  unico?: boolean;
}

export type Campo =
  | (ComunDeCampo & { tipo: 'texto'; unico: boolean; largoMaximo: number })
  | (ComunDeCampo & { tipo: 'textoLargo' })
  | (ComunDeCampo & { tipo: 'entero'; minimo?: number; maximo?: number })
  | (ComunDeCampo & { tipo: 'decimal'; decimales: number })
  | (ComunDeCampo & { tipo: 'dinero' })
  | (ComunDeCampo & { tipo: 'fecha' })
  | (ComunDeCampo & { tipo: 'siNo'; predeterminado: boolean })
  | (ComunDeCampo & { tipo: 'lista'; opciones: Record<string, string> })
  | (ComunDeCampo & { tipo: 'correo' | 'telefono' | 'nit' | 'dpi'; unico: boolean })
  | (ComunDeCampo & { tipo: 'referencia'; entidad: string });

export type TipoDeCampo = Campo['tipo'];

const LARGO_DE_TEXTO = 150;

const comun = ({ requerido = false, etiqueta }: OpcionesComunes) => ({ requerido, etiqueta });

export const texto = (opciones: OpcionesUnicas & { largoMaximo?: number } = {}): Campo => ({
  tipo: 'texto',
  ...comun(opciones),
  unico: opciones.unico ?? false,
  largoMaximo: opciones.largoMaximo ?? LARGO_DE_TEXTO,
});

export const textoLargo = (opciones: OpcionesComunes = {}): Campo => ({ tipo: 'textoLargo', ...comun(opciones) });

export const entero = (opciones: OpcionesComunes & { minimo?: number; maximo?: number } = {}): Campo => ({
  tipo: 'entero',
  ...comun(opciones),
  minimo: opciones.minimo,
  maximo: opciones.maximo,
});

export const decimal = (opciones: OpcionesComunes & { decimales?: number } = {}): Campo => ({
  tipo: 'decimal',
  ...comun(opciones),
  decimales: opciones.decimales ?? 2,
});

/** Montos en quetzales u otra moneda: `numeric(14,2)`, viajan como texto. */
export const dinero = (opciones: OpcionesComunes = {}): Campo => ({ tipo: 'dinero', ...comun(opciones) });

export const fecha = (opciones: OpcionesComunes = {}): Campo => ({ tipo: 'fecha', ...comun(opciones) });

/** Sí o no; nunca queda vacío, así que no lleva `requerido`. */
export const siNo = (opciones: { etiqueta?: string; predeterminado?: boolean } = {}): Campo => ({
  tipo: 'siNo',
  requerido: true,
  etiqueta: opciones.etiqueta,
  predeterminado: opciones.predeterminado ?? false,
});

/**
 * Una opción de una lista fija. Con una lista de valores, el texto que ve el
 * usuario es el valor con mayúscula; con un objeto, se da cada texto.
 * @example lista(['macho', 'hembra']) · lista({ directo: 'Consumidor directo', feria: 'Subasta o feria' })
 */
export function lista(opciones: readonly string[] | Record<string, string>, extra: OpcionesComunes = {}): Campo {
  const conTexto = Array.isArray(opciones)
    ? Object.fromEntries(opciones.map((valor) => [valor, valor.charAt(0).toUpperCase() + valor.slice(1)]))
    : (opciones as Record<string, string>);
  return { tipo: 'lista', ...comun(extra), opciones: conTexto };
}

const conObjetoDeValor =
  (tipo: 'correo' | 'telefono' | 'nit' | 'dpi') =>
  (opciones: OpcionesUnicas = {}): Campo => ({ tipo, ...comun(opciones), unico: opciones.unico ?? false });

/** Se guarda en minúsculas (objeto de valor `Correo`). */
export const correo = conObjetoDeValor('correo');
/** Se guarda sin separadores (objeto de valor `Telefono`) y se muestra como "5555-1234". */
export const telefono = conObjetoDeValor('telefono');
/** Se valida el dígito verificador (objeto de valor `Nit`); acepta "CF". */
export const nit = conObjetoDeValor('nit');
/** Se valida el CUI (objeto de valor `Dpi`). */
export const dpi = conObjetoDeValor('dpi');

/** Otra entidad del mismo módulo, por su nombre de código: `referencia('Potrero')`. */
export const referencia = (entidad: string, opciones: OpcionesComunes = {}): Campo => ({
  tipo: 'referencia',
  ...comun(opciones),
  entidad,
});
