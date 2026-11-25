import { textoONulo } from '@/modulos/core/utilidades/edicion';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type { CausaDeBaja, DatosDeBaja, OrigenDelCostoFiscal } from '../../servicios/bajas.api';

/** Lo que se escribe al dar de baja o vender un activo. */
export interface EdicionDeBaja {
  fecha: string;
  causa: CausaDeBaja | null;
  descripcion: string;
  autorizadaPor: string;
  destinoDelBien: string;
  numeroDeDenuncia: string;
  comprador: string;
  nitDelComprador: string;
  precio: string;
  iva: string;
  serieFel: string;
  numeroFel: string;
  autorizacionFel: string;
  /** El contador escribe el costo fiscal en vez del que calcula el sistema. */
  costoDelContador: boolean;
  costoFiscal: string;
  motivoDelCosto: string;
}

export const CAUSAS_DE_BAJA: Record<CausaDeBaja, string> = {
  venta: 'Venta',
  destruccion: 'Destrucción',
  robo: 'Robo',
  extravio: 'Extravío',
  donacion: 'Donación',
  obsolescencia: 'Obsolescencia',
  faltante_de_inventario: 'Faltante de inventario',
  devuelto_al_dueno: 'Devuelto al dueño',
  otra: 'Otra',
};

export const ORIGENES_DEL_COSTO_FISCAL: Record<OrigenDelCostoFiscal, string> = {
  en_libros: 'El de los libros del activo (cero en un bien de control de quien lleva contabilidad completa)',
  documentado: 'El costo de compra documentado',
  sin_documento: 'Cero: no hay documento de compra que lo respalde',
  criterio_del_contador: 'El que sostuvo el contador, con su motivo',
};

/** El formulario nuevo; `hoy` es la fecha que se propone (`AAAA-MM-DD`). */
export const edicionDeBajaNueva = (hoy: string): EdicionDeBaja => ({
  fecha: hoy,
  causa: null,
  descripcion: '',
  autorizadaPor: '',
  destinoDelBien: '',
  numeroDeDenuncia: '',
  comprador: '',
  nitDelComprador: '',
  precio: '',
  iva: '0.00',
  serieFel: '',
  numeroFel: '',
  autorizacionFel: '',
  costoDelContador: false,
  costoFiscal: '',
  motivoDelCosto: '',
});

const esDinero = (texto: string): boolean => /^\d+(\.\d{1,2})?$/.test(texto.trim());

function erroresDeLaVenta(edicion: EdicionDeBaja): Record<string, string> {
  const errores: Record<string, string> = {};
  if (!edicion.comprador.trim()) errores['venta.comprador'] = 'Escriba el nombre de quien compra.';
  if (!edicion.nitDelComprador.trim()) errores['venta.nitDelComprador'] = 'Escriba el NIT del comprador (o CF).';
  if (!esDinero(edicion.precio)) errores['venta.precio'] = 'Escriba el precio sin IVA, por ejemplo 1500.00.';
  if (!esDinero(edicion.iva)) errores['venta.iva'] = 'Escriba el IVA de la factura; si no lleva IVA, 0.00.';
  if (!edicion.numeroFel.trim()) errores['venta.numeroFel'] = 'Escriba el número de la factura.';
  if (!edicion.autorizacionFel.trim()) errores['venta.autorizacionFel'] = 'Pegue la autorización de la factura.';
  return errores;
}

function erroresDelCostoDelContador(edicion: EdicionDeBaja): Record<string, string> {
  const errores: Record<string, string> = {};
  if (!esDinero(edicion.costoFiscal))
    errores['costoFiscalDelContador.monto'] = 'Escriba el costo fiscal, por ejemplo 800.00.';
  if (!edicion.motivoDelCosto.trim())
    errores['costoFiscalDelContador.motivo'] = 'Escriba el motivo y el documento que respalda el costo.';
  return errores;
}

/** Lo que falla antes de mandar, por campo y con cómo corregirlo; el servidor revisa igual. */
export function erroresDeBaja(edicion: EdicionDeBaja): Record<string, string> {
  const errores: Record<string, string> = {};
  if (!edicion.fecha) errores.fecha = 'Elija la fecha de la baja.';
  if (!edicion.causa) errores.causa = 'Elija la causa de la baja.';
  if (!edicion.descripcion.trim()) errores.descripcion = 'Cuente qué pasó con el bien.';
  if (!edicion.autorizadaPor.trim()) errores.autorizadaPor = 'Escriba quién autoriza la baja: firma el acta.';
  if (edicion.causa === 'venta') Object.assign(errores, erroresDeLaVenta(edicion));
  if (edicion.causa === 'venta' && edicion.costoDelContador)
    Object.assign(errores, erroresDelCostoDelContador(edicion));
  return errores;
}

function datosDeLaVenta(edicion: EdicionDeBaja): DatosDeBaja['venta'] {
  if (edicion.causa !== 'venta') return null;
  return {
    comprador: edicion.comprador.trim(),
    nitDelComprador: edicion.nitDelComprador.trim(),
    precio: edicion.precio.trim(),
    iva: edicion.iva.trim(),
    serieFel: textoONulo(edicion.serieFel),
    numeroFel: edicion.numeroFel.trim(),
    autorizacionFel: edicion.autorizacionFel.trim(),
  };
}

/** Lo que se manda al servidor: lo vacío como `null`; la venta y el costo del contador solo si se vende. */
export function datosDeBaja(activoId: string, edicion: EdicionDeBaja): DatosDeBaja {
  const delContador = edicion.causa === 'venta' && edicion.costoDelContador;
  return {
    activoId,
    fecha: edicion.fecha,
    causa: edicion.causa ?? 'otra',
    descripcion: edicion.descripcion.trim(),
    autorizadaPor: edicion.autorizadaPor.trim(),
    destinoDelBien: textoONulo(edicion.destinoDelBien),
    numeroDeDenuncia: textoONulo(edicion.numeroDeDenuncia),
    venta: datosDeLaVenta(edicion),
    costoFiscalDelContador: delContador
      ? { monto: edicion.costoFiscal.trim(), motivo: edicion.motivoDelCosto.trim() }
      : null,
  };
}

/** El costo fiscal de la venta, dicho para confirmar. El sistema lo calcula; el contador puede sostener otro. */
function textoDelCostoFiscal(edicion: EdicionDeBaja, esDeControl: boolean): string {
  if (edicion.costoDelContador)
    return ` El costo fiscal queda en ${formatearMonto(edicion.costoFiscal)} por criterio del contador, y eso queda en la auditoría.`;
  return esDeControl
    ? ' El costo fiscal lo calcula el sistema según los datos fiscales de la empresa, y se lo mostramos al terminar.'
    : '';
}

/** Lo que pasará, para confirmar: qué se da de baja, con qué causa y, si se vende, a quién y por cuánto. */
export function mensajeDeBaja(descripcionDelActivo: string, edicion: EdicionDeBaja, esDeControl: boolean): string {
  const causa = (CAUSAS_DE_BAJA[edicion.causa ?? 'otra'] ?? '').toLowerCase();
  const inicio = `Se da de baja ${descripcionDelActivo} (con sus componentes, si los tiene) el ${formatearFecha(edicion.fecha)}, por ${causa}.`;
  if (edicion.causa !== 'venta') return `${inicio} Se genera el acta numerada, y el activo ya no se deprecia.`;
  const venta = ` Se vende a ${edicion.comprador.trim()} por ${formatearMonto(edicion.precio)} sin IVA.`;
  return `${inicio}${venta}${textoDelCostoFiscal(edicion, esDeControl)} Una baja se puede anular, pero quedará registrada.`;
}
