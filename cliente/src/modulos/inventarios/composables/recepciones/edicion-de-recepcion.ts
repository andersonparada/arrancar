import { textoONulo } from '@/modulos/core/utilidades/edicion';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import { esCantidadPositiva, esMontoValido, sumarDecimales } from '../compartido/cantidades';
import type { DatosDeRecepcion, LineaPorRecibir, RenglonDeRecepcion } from '../../servicios/recepciones.api';

/** Un renglón de la recepción: lo que se recibe de una línea del libro. Una línea puede tener varios renglones. */
export interface EdicionDeRenglonRecibido {
  clave: number;
  lineaId: string;
  /** «FAC-1 · línea 2 · Concentrado», para saber de qué línea es cada renglón. */
  titulo: string;
  proveedor: string;
  pendiente: string;
  articuloId: string | null;
  /** Con lote nuevo se escribe su código; si no, se elige uno existente. */
  conLoteNuevo: boolean;
  loteId: string | null;
  loteCodigo: string;
  loteVencimiento: string;
  cantidad: string;
  unidadId: string | null;
  monto: string;
}

export interface EdicionDeRecepcion {
  abierta: boolean;
  fecha: string;
  bodegaId: string | null;
  observaciones: string;
  renglones: EdicionDeRenglonRecibido[];
}

let siguienteClave = 1;

function renglonDe(linea: LineaPorRecibir, completo: boolean): EdicionDeRenglonRecibido {
  return {
    clave: siguienteClave++,
    lineaId: linea.lineaId,
    titulo: `${linea.documento} · línea ${linea.numeroDeLinea} · ${linea.conceptoNombre}`,
    proveedor: linea.proveedorNombre,
    pendiente: linea.pendiente,
    articuloId: linea.articuloSugeridoId,
    conLoteNuevo: false,
    loteId: null,
    loteCodigo: '',
    loteVencimiento: '',
    cantidad: '',
    unidadId: null,
    monto: completo ? linea.pendiente : '',
  };
}

/** La ventana abierta con un renglón por línea elegida: el artículo sugerido y todo el pendiente como monto. */
export const recepcionNueva = (lineas: LineaPorRecibir[], hoy: string): EdicionDeRecepcion => ({
  abierta: true,
  fecha: hoy,
  bodegaId: null,
  observaciones: '',
  renglones: lineas.map((linea) => renglonDe(linea, true)),
});

/** Un renglón más de la misma línea (la línea trae varios artículos): sin monto, para repartir lo pendiente. */
export function dividirRenglon(renglones: EdicionDeRenglonRecibido[], indice: number): EdicionDeRenglonRecibido[] {
  const origen = renglones[indice];
  if (!origen) return renglones;
  const copia: EdicionDeRenglonRecibido = {
    ...origen,
    clave: siguienteClave++,
    articuloId: null,
    conLoteNuevo: false,
    loteId: null,
    loteCodigo: '',
    loteVencimiento: '',
    cantidad: '',
    unidadId: null,
    monto: '',
  };
  return [...renglones.slice(0, indice + 1), copia, ...renglones.slice(indice + 1)];
}

/**
 * Al cambiar de artículo se descarta lo que era de otro: unidad, lote elegido y lote nuevo. El artículo nuevo puede
 * no manejar lotes y esos campos quedarían ocultos, pero se seguirían validando y enviando.
 */
export function cambiarDeArticulo(renglon: EdicionDeRenglonRecibido, articuloId: string | null): void {
  Object.assign(renglon, {
    articuloId,
    unidadId: null,
    conLoteNuevo: false,
    loteId: null,
    loteCodigo: '',
    loteVencimiento: '',
  });
}

function renglonSolicitado(renglon: EdicionDeRenglonRecibido): RenglonDeRecepcion {
  const loteNuevo = renglon.conLoteNuevo
    ? {
        codigo: renglon.loteCodigo.trim(),
        fechaDeVencimiento: textoONulo(renglon.loteVencimiento),
        fechaDeFabricacion: null,
      }
    : null;
  return {
    lineaId: renglon.lineaId,
    articuloId: renglon.articuloId ?? '',
    loteId: renglon.conLoteNuevo ? null : renglon.loteId,
    loteNuevo,
    cantidad: String(renglon.cantidad).trim(),
    unidadId: renglon.unidadId,
    monto: String(renglon.monto).trim(),
  };
}

export const datosDeRecepcion = (edicion: EdicionDeRecepcion): DatosDeRecepcion => ({
  fecha: edicion.fecha,
  bodegaId: edicion.bodegaId ?? '',
  observaciones: textoONulo(edicion.observaciones),
  renglones: edicion.renglones.map(renglonSolicitado),
});

const aCentavos = (valor: string): number => Math.round(Number(valor) * 100);

/** Lo que se recibe de cada línea, sumando todos sus renglones. */
function recibidoPorLinea(renglones: EdicionDeRenglonRecibido[]): Map<string, string> {
  const montos = new Map<string, string[]>();
  for (const renglon of renglones) {
    const monto = String(renglon.monto).trim();
    if (esMontoValido(monto)) montos.set(renglon.lineaId, [...(montos.get(renglon.lineaId) ?? []), monto]);
  }
  return new Map([...montos].map(([lineaId, lista]) => [lineaId, sumarDecimales(lista, 2)!]));
}

function erroresDelRenglon(
  renglon: EdicionDeRenglonRecibido,
  indice: number,
  recibido: string,
): Record<string, string> {
  const errores: Record<string, string> = {};
  const clave = (campo: string) => `renglones.${indice}.${campo}`;
  if (!renglon.articuloId) errores[clave('articuloId')] = 'Elija el artículo que se recibe.';
  if (!esCantidadPositiva(renglon.cantidad)) {
    errores[clave('cantidad')] = 'Escriba la cantidad recibida, mayor que cero y con hasta 4 decimales.';
  }
  if (renglon.conLoteNuevo && !renglon.loteCodigo.trim())
    errores[clave('loteNuevo')] = 'Escriba el código del lote nuevo.';
  if (!esMontoValido(renglon.monto) || aCentavos(renglon.monto) <= 0) {
    errores[clave('monto')] =
      `Escriba cuánto del costo de la línea recibe (hasta ${formatearMonto(renglon.pendiente)} pendientes), mayor que cero.`;
  } else if (aCentavos(recibido) > aCentavos(renglon.pendiente)) {
    errores[clave('monto')] =
      `Lo que recibe de esta línea (${formatearMonto(recibido)}) pasa de lo pendiente (${formatearMonto(renglon.pendiente)}). Baje el monto.`;
  }
  return errores;
}

/** Lo que falta o está mal antes de enviar, incluido que lo recibido de una línea no pase de su pendiente. */
export function erroresDeRecepcion(edicion: EdicionDeRecepcion): Record<string, string> {
  const errores: Record<string, string> = {};
  if (!edicion.fecha) errores.fecha = 'Escriba la fecha en que llegó la mercadería.';
  if (!edicion.bodegaId) errores.bodegaId = 'Elija la bodega que recibe.';
  if (!edicion.renglones.length) errores.renglones = 'Agregue al menos una línea para recibir.';
  const recibido = recibidoPorLinea(edicion.renglones);
  edicion.renglones.forEach((renglon, indice) => {
    Object.assign(errores, erroresDelRenglon(renglon, indice, recibido.get(renglon.lineaId) ?? '0.00'));
  });
  return errores;
}

/** Lo que va a pasar al guardar: cuánto entra, dónde y cuánto queda por recibir. */
export function resumenDeRecepcion(edicion: EdicionDeRecepcion, bodega: string): string {
  const total = sumarDecimales(
    edicion.renglones.map((renglon) => (esMontoValido(renglon.monto) ? String(renglon.monto).trim() : null)),
    2,
  );
  const lineas = new Set(edicion.renglones.map((renglon) => renglon.lineaId)).size;
  const parcial = edicion.renglones.some(
    (renglon) =>
      aCentavos(recibidoPorLinea(edicion.renglones).get(renglon.lineaId) ?? '0') < aCentavos(renglon.pendiente),
  );
  const resto = parcial ? ' Lo que falte por recibir queda en la bandeja.' : '';
  const costo = total === null ? '' : ` por un costo de ${formatearMonto(total)}`;
  return `Entrará a «${bodega}» la mercadería de ${lineas === 1 ? '1 línea' : `${lineas} líneas`}${costo}.${resto} Si el mes sigue abierto, podrá anular la recepción con un motivo.`;
}
