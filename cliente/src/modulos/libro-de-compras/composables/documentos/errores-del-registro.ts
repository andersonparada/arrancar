import { ErrorApi } from '@/modulos/core/servicios/cliente-http';
import { lineaEnBlanco } from './edicion-de-documento';
import type { LineaEnEdicion } from './lineas-del-documento';
import { preguntasDelError, type PreguntaFiscal } from './preguntas-fiscales';

/** Un error del servidor que la pantalla explica y resuelve dentro del formulario, sin un aviso que desaparece. */
export type ProblemaDelFormulario =
  | { tipo: 'datos_fiscales'; mensaje: string; preguntas: PreguntaFiscal[] }
  | { tipo: 'regimen'; mensaje: string }
  | { tipo: 'empresa'; mensaje: string }
  | { tipo: 'repetido'; mensaje: string; documentoId: string | null }
  | { tipo: 'cita_anterior'; mensaje: string; notaId: string | null }
  | { tipo: 'permiso'; mensaje: string }
  | { tipo: 'periodo_declarado'; mensaje: string; propuesto: string | null; enPlazo: boolean | null }
  | { tipo: 'otro'; mensaje: string };

const ELIJA_EL_TIPO = 'Elija el tipo de documento, tal como lo dice el encabezado de la factura.';
const DATO_DEL_VENDEDOR = 'Escriba el NIT o el CUI (DPI) del vendedor, es decir, del particular al que se le compró.';

/** Un error conocido que se muestra en su campo, con lo que el usuario debe hacer. */
interface ErrorDeCampo {
  /** El campo fijo, o el que dice el propio error (`detalles.campo`) con este de respaldo. */
  campo: string | { respaldo: string };
  texto: (error: ErrorApi) => string;
}

const delMensaje = (error: ErrorApi): string => error.message;
const enCampo = (campo: string): ErrorDeCampo => ({ campo, texto: delMensaje });
const deLaFacturaAnterior = (respaldo: string): ErrorDeCampo => ({ campo: { respaldo }, texto: delMensaje });

const delTipo = (texto: (error: ErrorApi) => string): ErrorDeCampo => ({ campo: 'tipoDte', texto });
const delaFactura = (texto: (error: ErrorApi) => string): ErrorDeCampo => ({ campo: 'documentoAfectadoId', texto });
const delVendedor = (texto: (error: ErrorApi) => string): ErrorDeCampo => ({ campo: 'nitReceptor', texto });

/** Los errores del tipo de documento y del vendedor de la factura especial se muestran en su campo. */
const ERRORES_DE_CAMPO: Record<string, ErrorDeCampo> = {
  tipo_dte_incoherente: delTipo(
    () =>
      'El código no corresponde a este documento. Elija otra vez el tipo, tal como lo dice el encabezado de la factura.',
  ),
  tipo_dte_obligatorio: delTipo(() => ELIJA_EL_TIPO),
  tipo_de_documento_obligatorio: delTipo(() => ELIJA_EL_TIPO),
  tipo_dte_sin_fel: delTipo(
    () =>
      'Un documento sin FEL no lleva código de la SAT. Elija «Recibo (sin FEL)» o escriba la autorización de la FEL.',
  ),
  familia_derogada: delTipo((error) => error.message),
  familia_aun_no_vigente: delTipo((error) => error.message),
  factura_especial_no_disponible: delTipo(() => 'La factura especial no está disponible. Elija otro tipo.'),
  factura_especial_siempre_en_el_libro: delTipo(
    () => 'La factura especial siempre se muestra en los reportes SAT. Elija otro tipo si el documento no se reporta.',
  ),
  nota_sobre_factura_especial: delTipo(
    () =>
      'Una nota no puede corregir una factura especial. Anule la FESP en su certificador, anule este registro y registre la nueva.',
  ),
  factura_afectada_incoherente: delaFactura((error) => error.message),
  factura_no_sirve_para_la_nota: delaFactura((error) => error.message),
  nota_supera_la_factura: delaFactura((error) => error.message),
  iva_de_notas_excede_el_de_la_factura: delaFactura((error) => error.message),
  nota_con_iva_de_factura_exenta: delaFactura((error) => error.message),
  nota_de_debito_con_iva_de_factura_sin_iva: delaFactura((error) => error.message),
  nota_de_debito_anterior_a_la_factura: {
    campo: 'fechaEmision',
    texto: () =>
      'La nota de débito no puede ser anterior a la factura que aumenta. Corrija la fecha de emisión de la nota o elija otra factura.',
  },
  vendedor_de_factura_especial_invalido: delVendedor(
    () => `${DATO_DEL_VENDEDOR} No puede quedar vacío, ser CF ni el NIT de su empresa.`,
  ),
  receptor_invalido: delVendedor((error) => `${error.message} ${DATO_DEL_VENDEDOR}`),
  periodo_declarado: { campo: 'periodo', texto: (error) => error.message },
  factura_anterior_sin_fecha_de_inicio: enCampo('documentoAfectadoId'),
  factura_anterior_invalida: deLaFacturaAnterior('facturaAnterior.numero'),
  factura_anterior_posterior_a_la_fecha_de_inicio: enCampo('facturaAnterior.fechaEmision'),
  factura_anterior_muy_antigua: enCampo('facturaAnterior.fechaEmision'),
  factura_anterior_esta_en_el_libro: enCampo('facturaAnterior.numero'),
  factura_anterior_con_otros_datos: enCampo('facturaAnterior.numero'),
  nota_recibida_antes_de_la_fecha_de_inicio: enCampo('fechaRecepcion'),
  otra_causa_sin_detalle: enCampo('observaciones'),
  otra_causa_solo_en_facturas: enCampo('otraCausaSinCredito'),
  vendedor_no_coincide: delVendedor(
    () =>
      'Este NIT o CUI no es el del proveedor elegido. Elija al proveedor correcto o corrija el dato en su ficha de contacto.',
  ),
};

/** El error del tipo o del vendedor, con el nombre de su campo, si el error del servidor es de ellos. */
export function errorDelTipo(error: unknown): Record<string, string> | null {
  const conocido = error instanceof ErrorApi ? ERRORES_DE_CAMPO[error.codigo] : undefined;
  if (!conocido || !(error instanceof ErrorApi)) return null;
  const campo =
    typeof conocido.campo === 'string' ? conocido.campo : (error.campoDelConflicto ?? conocido.campo.respaldo);
  return { [campo]: conocido.texto(error) };
}

const TEXTO_SIN_PERMISO =
  'No tiene permiso para cambiar retenciones. Quite el ajuste de las retenciones, o pídale el permiso «Ajustar retenciones» al administrador.';

function idDeLosDetalles(detalles: unknown, clave: 'documentoId' | 'notaId'): string | null {
  const id = (detalles as Record<string, unknown> | null | undefined)?.[clave];
  return typeof id === 'string' ? id : null;
}
const documentoDelRepetido = (detalles: unknown): string | null => idDeLosDetalles(detalles, 'documentoId');

/** El período que el servidor propone en lugar del declarado (`AAAA-MM`) y si todavía da crédito fiscal. */
export function propuestaDelPeriodo(detalles: unknown): { propuesto: string | null; enPlazo: boolean | null } {
  const { periodoPropuesto, propuestaEnPlazo } = (detalles ?? {}) as Record<string, unknown>;
  return {
    propuesto: typeof periodoPropuesto === 'string' ? periodoPropuesto.slice(0, 7) : null,
    enPlazo: typeof propuestaEnPlazo === 'boolean' ? propuestaEnPlazo : null,
  };
}

const deLaEmpresa = (error: ErrorApi): ProblemaDelFormulario => ({ tipo: 'empresa', mensaje: error.message });

/** Cómo se explica cada código de error que el formulario sabe resolver. */
const PROBLEMAS_POR_CODIGO: Record<string, (error: ErrorApi) => ProblemaDelFormulario> = {
  periodo_declarado: (error) => ({
    tipo: 'periodo_declarado',
    mensaje: error.message,
    ...propuestaDelPeriodo(error.detalles),
  }),
  faltan_datos_fiscales_del_proveedor: (error) => ({
    tipo: 'datos_fiscales',
    mensaje: error.message,
    preguntas: preguntasDelError(error.detalles),
  }),
  tipo_no_corresponde_al_proveedor: (error) => ({ tipo: 'regimen', mensaje: error.message }),
  empresa_sin_datos_fiscales: deLaEmpresa,
  empresa_sin_nit: deLaEmpresa,
  factura_ya_es_del_sistema_anterior: (error) => ({
    tipo: 'cita_anterior',
    mensaje: error.message,
    notaId: idDeLosDetalles(error.detalles, 'notaId'),
  }),
  documento_repetido: (error) => ({
    tipo: 'repetido',
    mensaje: error.message,
    documentoId: documentoDelRepetido(error.detalles),
  }),
};

/**
 * Clasifica un error de calcular o registrar. Los errores de validación por campo no son un problema del formulario
 * entero (cada campo muestra el suyo): devuelve `null`.
 */
export function problemaDeError(error: unknown): ProblemaDelFormulario | null {
  if (!(error instanceof ErrorApi)) {
    return { tipo: 'otro', mensaje: error instanceof Error ? error.message : 'Ocurrió un error inesperado.' };
  }
  if (error.codigo === 'periodo_declarado') return PROBLEMAS_POR_CODIGO.periodo_declarado!(error);
  if (error.erroresCampos.length > 0 || errorDelTipo(error)) return null;
  const delCodigo = PROBLEMAS_POR_CODIGO[error.codigo];
  if (delCodigo) return delCodigo(error);
  if (error.estado === 403) return { tipo: 'permiso', mensaje: TEXTO_SIN_PERMISO };
  return { tipo: 'otro', mensaje: error.message };
}

/** Los errores por campo de una línea, por su clave en el formulario. */
export type ErroresDeLineas = Record<number, Record<string, string>>;

/**
 * Reparte `lineas.N.campo` entre las líneas del formulario. El servidor numera solo las líneas que se enviaron, es
 * decir, sin las filas en blanco.
 */
export function erroresDeLineas(lineas: LineaEnEdicion[], errores: Record<string, string>): ErroresDeLineas {
  const enviadas = lineas.filter((linea) => !lineaEnBlanco(linea));
  const resultado: ErroresDeLineas = {};
  for (const [campo, mensaje] of Object.entries(errores)) {
    const [raiz, indice, nombre] = campo.split('.');
    const linea = raiz === 'lineas' ? enviadas[Number(indice)] : undefined;
    if (linea && nombre) (resultado[linea.clave] ??= {})[nombre] = mensaje;
  }
  return resultado;
}

/** Los errores del encabezado: todo lo que no es de una línea ni de un ajuste. */
export const erroresDelEncabezado = (errores: Record<string, string>): Record<string, string> =>
  Object.fromEntries(Object.entries(errores).filter(([campo]) => !campo.startsWith('lineas.')));
