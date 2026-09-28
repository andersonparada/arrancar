import type { Campo, TipoDeCampo } from '../definicion/campos.js';

/**
 * Cómo trabaja el formulario con el campo: como texto (también números y fechas,
 * que el campo devuelve así), como sí/no, como una opción de lista o como el id de otro registro.
 */
export type FormaEnFormulario = 'texto' | 'numero' | 'siNo' | 'lista' | 'referencia';

/** Cómo se escribe un tipo de campo en el cliente. */
export interface CampoEnCliente {
  forma: FormaEnFormulario;
  /** Atributos de `CampoTexto` además de etiqueta y modelo: `tipo="date"`, `multilinea`… */
  atributos: string;
  /** Cómo se muestra en la tarjeta: `formatearFecha(registro.nacimiento)`. `{}` es el valor. */
  detalle: string;
  /** Al mandarlo: `numeroONulo(edicion.crias)`. `{}` es el valor; obligatorio y opcional. */
  alServidor: [obligatorio: string, opcional: string];
}

const COMO_TEXTO: [string, string] = ['{}', 'textoONulo({})'];
const COMO_TEXTO_DE_NUMERO: [string, string] = ['textoDeEdicion({})', 'textoONulo({})'];

const texto = (atributos = ''): CampoEnCliente => ({
  forma: 'texto',
  atributos,
  detalle: 'formatearTexto({})',
  alServidor: COMO_TEXTO,
});

/** Un campo de número; sin `paso="any"` el navegador solo acepta enteros. */
const numero = (detalle: string, alServidor: [string, string], conDecimales: boolean): CampoEnCliente => ({
  forma: 'numero',
  atributos: conDecimales ? 'tipo="number" paso="any"' : 'tipo="number"',
  detalle,
  alServidor,
});

const TRADUCTORES: Record<TipoDeCampo, CampoEnCliente> = {
  texto: texto(),
  textoLargo: texto('multilinea'),
  entero: numero('formatearTexto({})', ['numeroRequerido({})', 'numeroONulo({})'], false),
  decimal: numero('formatearCantidad({})', COMO_TEXTO_DE_NUMERO, true),
  dinero: numero('formatearMonto({})', COMO_TEXTO_DE_NUMERO, true),
  fecha: { ...texto('tipo="date"'), detalle: 'formatearFecha({})' },
  siNo: {
    forma: 'siNo',
    atributos: '',
    detalle: 'formatearSiNo({})',
    alServidor: ['{}', '{}'],
  },
  lista: { forma: 'lista', atributos: '', detalle: '', alServidor: ['{}', '{}'] },
  correo: texto('tipo="email"'),
  telefono: {
    ...texto('tipo="tel"'),
    detalle: 'formatearTexto(formatearTelefono({}))',
  },
  nit: texto('sin-correccion'),
  dpi: texto('sin-correccion'),
  // Sin elegir, uno obligatorio se manda vacío para que el servidor diga "Elija una opción".
  referencia: { forma: 'referencia', atributos: '', detalle: 'formatearTexto({})', alServidor: ["{} ?? ''", '{}'] },
};

export const enCliente = (campo: Campo): CampoEnCliente => TRADUCTORES[campo.tipo];

/** Pone el valor en el lugar de `{}`. */
export const conValor = (molde: string, valor: string) => molde.replaceAll('{}', valor);
