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
  }
}

/** La línea tiene lo mínimo para pedirle el cálculo al servidor: concepto y total (y galones si es combustible). */
export function lineaCompleta(linea: LineaEnEdicion): boolean {
  if (!linea.conceptoId || montoEnTexto(linea.total) === null) return false;
  return !linea.esCombustible || (!!linea.combustibleId && montoEnTexto(linea.galones, 3) !== null);
}

/** La línea para el cuerpo de la API; `null` si está incompleta. */
export function lineaParaElCuerpo(linea: LineaEnEdicion): LineaSolicitada | null {
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
  };
}

/** Lo que suman los totales tecleados, en quetzales con dos decimales (sin ningún impuesto: solo la suma). */
export function sumaDeLineas(lineas: LineaEnEdicion[]): string {
  const centavos = lineas.reduce((suma, { total }) => suma + aCentavos(total), 0);
  return (centavos / 100).toFixed(2);
}
