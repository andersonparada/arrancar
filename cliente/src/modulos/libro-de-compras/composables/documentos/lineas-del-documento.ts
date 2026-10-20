import { textoONulo } from '@/modulos/core/utilidades/edicion';
import type { ConceptoDeGasto } from '../../servicios/conceptos-de-gasto.api';
import type { LineaSolicitada } from '../../servicios/registro-de-documentos.api';

type Valor = string | number | null | undefined;

/** Una línea tal como se escribe en el formulario; los montos son lo que el usuario teclea. */
export interface LineaEnEdicion {
  /** Identifica la fila mientras se edita (no viaja al servidor). */
  clave: number;
  conceptoId: string | null;
  descripcion: string;
  tipo: 'bien' | 'servicio';
  esActivoFijo: boolean;
  esCombustible: boolean;
  combustibleId: string | null;
  galones: Valor;
  total: Valor;
  exento: Valor;
  /** Tasa municipal, turismo, timbre…: viene en la factura y no paga IVA. */
  otrosImpuestos: Valor;
  /** Combustible: el IDP lo dice la factura (en vez de calcularse de los galones). */
  escribeIdp: boolean;
  idpEscrito: Valor;
}

let ultimaClave = 0;

export function lineaVacia(): LineaEnEdicion {
  return {
    clave: ++ultimaClave,
    conceptoId: null,
    descripcion: '',
    tipo: 'bien',
    esActivoFijo: false,
    esCombustible: false,
    combustibleId: null,
    galones: '',
    total: '',
    exento: '',
    otrosImpuestos: '',
    escribeIdp: false,
    idpEscrito: '',
  };
}

/**
 * Un monto escrito como texto con la cantidad de decimales pedida (`12,5` → `12.50`); `null` si está vacío o no es
 * un número.
 */
export function montoEnTexto(valor: Valor, decimales = 2): string | null {
  const texto = textoONulo(typeof valor === 'string' ? valor.replace(',', '.') : valor);
  if (texto === null || !Number.isFinite(Number(texto))) return null;
  return Number(texto).toFixed(decimales);
}

const aCentavos = (valor: Valor): number => Math.round(Number(montoEnTexto(valor) ?? 0) * 100);

/** Elegir un concepto propone el tipo y si es activo fijo; el usuario puede cambiarlos. */
export function aplicarConcepto(linea: LineaEnEdicion, concepto: ConceptoDeGasto | undefined): void {
  if (!concepto) return;
  linea.tipo = concepto.tipoPorOmision;
  linea.esActivoFijo = concepto.esActivoFijo;
  if (concepto.esActivoFijo) linea.esCombustible = false;
}

/** Un activo fijo o el combustible siempre son un bien: marcarlo fija el tipo. */
export function ajustarTipoDeLinea(linea: LineaEnEdicion): void {
  if (linea.esActivoFijo || linea.esCombustible) linea.tipo = 'bien';
  if (!linea.esCombustible) {
    linea.combustibleId = null;
    linea.galones = '';
    linea.escribeIdp = false;
    linea.idpEscrito = '';
  }
}

const idpTecleado = (linea: LineaEnEdicion): boolean => aCentavos(linea.idpEscrito) > 0;

/** Con el IDP de la factura, el combustible y los galones van juntos o no van: sirven solo para comparar. */
function combustibleCompleto(linea: LineaEnEdicion): boolean {
  const tieneGalones = montoEnTexto(linea.galones, 3) !== null;
  if (linea.escribeIdp) return idpTecleado(linea) && !!linea.combustibleId === tieneGalones;
  return !!linea.combustibleId && tieneGalones;
}

/** La línea tiene lo mínimo para pedirle el cálculo al servidor: concepto y total (y galones o IDP si es combustible). */
export function lineaCompleta(linea: LineaEnEdicion): boolean {
  if (!linea.conceptoId || montoEnTexto(linea.total) === null) return false;
  return !linea.esCombustible || combustibleCompleto(linea);
}

const montosExtraDelCuerpo = (linea: LineaEnEdicion) => ({
  otrosImpuestos: montoEnTexto(linea.otrosImpuestos),
  idpEscrito: linea.esCombustible && linea.escribeIdp ? montoEnTexto(linea.idpEscrito) : null,
});

/**
 * La línea para el cuerpo de la API; `null` si está incompleta. Con `conMontosExtra` en falso (factura especial) no
 * lleva otros impuestos ni IDP escrito.
 */
export function lineaParaElCuerpo(linea: LineaEnEdicion, conMontosExtra = true): LineaSolicitada | null {
  const total = montoEnTexto(linea.total);
  if (!lineaCompleta(linea) || total === null || !linea.conceptoId) return null;
  return {
    conceptoId: linea.conceptoId,
    descripcion: textoONulo(linea.descripcion),
    tipo: linea.tipo,
    esActivoFijo: linea.esActivoFijo,
    combustibleId: linea.esCombustible ? linea.combustibleId : null,
    galones: linea.esCombustible ? montoEnTexto(linea.galones, 3) : null,
    total,
    exento: montoEnTexto(linea.exento),
    ...(conMontosExtra ? montosExtraDelCuerpo(linea) : { otrosImpuestos: null, idpEscrito: null }),
  };
}

/**
 * Errores que se ven sin ir al servidor, en el campo de la línea: montos negativos, o que el IDP, lo exento y los
 * otros impuestos sumen más que el total.
 */
export function erroresLocalesDeLinea(linea: LineaEnEdicion): Record<string, string> {
  const errores: Record<string, string> = {};
  for (const campo of ['exento', 'otrosImpuestos', 'idpEscrito'] as const) {
    if (aCentavos(linea[campo]) < 0) errores[campo] = 'El monto no puede ser negativo.';
  }
  const total = aCentavos(linea.total);
  const idp = linea.esCombustible && linea.escribeIdp ? aCentavos(linea.idpEscrito) : 0;
  if (
    total > 0 &&
    Object.keys(errores).length === 0 &&
    idp + aCentavos(linea.exento) + aCentavos(linea.otrosImpuestos) > total
  ) {
    errores.otrosImpuestos = 'Lo exento, el IDP y los otros impuestos no pueden sumar más que el total de la línea.';
  }
  return errores;
}

/** Lo que suman los totales tecleados, en quetzales con dos decimales (sin ningún impuesto: solo la suma). */
export function sumaDeLineas(lineas: LineaEnEdicion[]): string {
  const centavos = lineas.reduce((suma, { total }) => suma + aCentavos(total), 0);
  return (centavos / 100).toFixed(2);
}
