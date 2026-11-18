import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import { contadorDeCaracteres } from '@/modulos/core/utilidades/contador-de-caracteres';
import { formatearFecha, formatearFechaHora, formatearMonto, formatearTexto } from '@/modulos/core/utilidades/formato';
import type { CambiosDeContrasena, FichaDeContrasena } from '../../servicios/tipos-de-contrasenas';
import { errorDelMotivo } from '../reglas-de-acciones';
import { MAXIMO_DE_OBSERVACIONES } from './edicion-de-contrasena';

/** Lo que se ve en la ventana «Cambiar fecha de pago»; el motivo solo se pide si cambia la fecha prometida. */
export interface EdicionDeCambioDeContrasena {
  abierta: boolean;
  fechaDePago: string;
  observaciones: string;
  motivo: string;
}

export const edicionDeCambioVacia = (): EdicionDeCambioDeContrasena => ({
  abierta: false,
  fechaDePago: '',
  observaciones: '',
  motivo: '',
});

/** La ventana abierta con lo que la contraseña tiene hoy. */
export const edicionDeCambioDe = (ficha: FichaDeContrasena): EdicionDeCambioDeContrasena => ({
  abierta: true,
  fechaDePago: ficha.fechaDePago,
  observaciones: ficha.observaciones ?? '',
  motivo: '',
});

export const cambiaLaFechaDePago = (edicion: EdicionDeCambioDeContrasena, ficha: FichaDeContrasena): boolean =>
  !!edicion.fechaDePago && edicion.fechaDePago !== ficha.fechaDePago;

const cambiaLasObservaciones = (edicion: EdicionDeCambioDeContrasena, ficha: FichaDeContrasena): boolean =>
  edicion.observaciones.trim() !== (ficha.observaciones ?? '');

/** Solo lo que cambió, o `null` si no cambió nada. */
export function cambiosDeContrasena(
  edicion: EdicionDeCambioDeContrasena,
  ficha: FichaDeContrasena,
): CambiosDeContrasena | null {
  const cambios: CambiosDeContrasena = {};
  if (cambiaLaFechaDePago(edicion, ficha)) {
    cambios.fechaDePago = edicion.fechaDePago;
    cambios.motivo = edicion.motivo.trim();
  }
  if (cambiaLasObservaciones(edicion, ficha)) cambios.observaciones = edicion.observaciones.trim() || null;
  return Object.keys(cambios).length > 0 ? cambios : null;
}

/** Errores por campo antes de molestar al servidor; vacío si todo está bien. */
export function erroresDeCambio(
  edicion: EdicionDeCambioDeContrasena,
  ficha: FichaDeContrasena,
): Record<string, string> {
  const errores: Record<string, string> = {};
  if (!edicion.fechaDePago) errores.fechaDePago = 'Escriba la fecha en que prometió pagar.';
  else if (edicion.fechaDePago < ficha.fecha) {
    errores.fechaDePago = `No puede ser anterior a la fecha de la contraseña (${formatearFecha(ficha.fecha)}).`;
  }
  const motivo = cambiaLaFechaDePago(edicion, ficha) ? errorDelMotivo(edicion.motivo) : null;
  if (motivo) errores.motivo = motivo;
  const observaciones = contadorDeCaracteres(edicion.observaciones, MAXIMO_DE_OBSERVACIONES).error;
  if (observaciones) errores.observaciones = observaciones;
  if (Object.keys(errores).length === 0 && !cambiosDeContrasena(edicion, ficha)) {
    errores.fechaDePago = 'No cambió nada. Escriba otra fecha u otras observaciones, o cierre la ventana.';
  }
  return errores;
}

/** Si la contraseña ya se imprimió, lo nuevo sale con «REIMPRESIÓN» y el proveedor tiene que cambiar su papel. */
export const AVISO_DE_REIMPRESION =
  'Esta contraseña ya se imprimió: imprima la nueva (saldrá con «REIMPRESIÓN») y cámbiela por el original que tiene el proveedor.';

export const AVISO_DE_RECUPERAR_EL_ORIGINAL =
  'Esta contraseña ya se imprimió: recupere el original que tiene el proveedor.';

export const textoDeImpresion = (ficha: Pick<FichaDeContrasena, 'impresa' | 'impresaEn'>): string =>
  ficha.impresa && ficha.impresaEn ? `Impresa el ${formatearFechaHora(ficha.impresaEn)}` : 'Sin imprimir';

/** Lo que se tiene al abrir la ficha, en el orden en que se lee. */
export function detallesDeFichaDeContrasena(ficha: FichaDeContrasena): DetalleDeRegistro[] {
  return [
    { etiqueta: 'Proveedor', valor: ficha.proveedorNombre },
    { etiqueta: 'NIT del proveedor', valor: formatearTexto(ficha.proveedorNit) },
    { etiqueta: 'Fecha de la contraseña', valor: formatearFecha(ficha.fecha) },
    { etiqueta: 'Pago prometido', valor: formatearFecha(ficha.fechaDePago) },
    { etiqueta: 'Impresión', valor: textoDeImpresion(ficha) },
    { etiqueta: 'Creada por', valor: formatearTexto(ficha.creadoPorNombre) },
    { etiqueta: 'Observaciones', valor: formatearTexto(ficha.observaciones) },
  ];
}

/** Los totales de la contraseña: lo fijo y lo que falta por pagar hoy. */
export function detallesDeTotalesDeContrasena(ficha: FichaDeContrasena): DetalleDeRegistro[] {
  const { totales } = ficha;
  return [
    { etiqueta: 'Total de las facturas', valor: formatearMonto(totales.total) },
    { etiqueta: 'Retenciones', valor: formatearMonto(totales.retenciones) },
    { etiqueta: 'Rebajado (notas y pagos anteriores al inicio)', valor: formatearMonto(totales.rebajado) },
    { etiqueta: 'Pagado', valor: formatearMonto(totales.pagado) },
    ...(Number(totales.comprometido) > 0
      ? [{ etiqueta: 'Comprometido (cheques posfechados)', valor: formatearMonto(totales.comprometido) }]
      : []),
    { etiqueta: 'Saldo por pagar', valor: formatearMonto(totales.saldo) },
  ];
}

export function detallesDeAnulacionDeContrasena(ficha: FichaDeContrasena): DetalleDeRegistro[] {
  const { anulacion } = ficha;
  if (!anulacion) return [];
  return [
    { etiqueta: 'Motivo', valor: anulacion.motivo },
    { etiqueta: 'Anulada por', valor: formatearTexto(anulacion.anuladaPorNombre) },
    { etiqueta: 'Anulada el', valor: formatearFechaHora(anulacion.anuladaEn) },
  ];
}

const conAviso = (texto: string, ficha: FichaDeContrasena): string =>
  ficha.impresa ? `${texto} ${AVISO_DE_REIMPRESION}` : texto;

/** Lo que va a pasar al quitar un documento, para leerlo antes de pedir el motivo. */
export function resumenDeQuitarDocumento(ficha: FichaDeContrasena, documento: string): string {
  const texto = `Se quitará ${documento} de la contraseña ${ficha.numero}: quedará libre para otra contraseña y se rehace el reparto de las notas.`;
  return conAviso(texto, ficha);
}

/** Lo que va a pasar al anular, con el aviso de recuperar el original si ya se imprimió. */
export function resumenDeAnularContrasena(ficha: FichaDeContrasena): string {
  const texto = `Se anulará la contraseña ${ficha.numero} de ${ficha.proveedorNombre}: sus documentos quedan libres y las notas aplicadas en ella recuperan su saldo a favor. No se puede deshacer.`;
  return ficha.impresa ? `${texto} ${AVISO_DE_RECUPERAR_EL_ORIGINAL}` : texto;
}

/** Lo que va a pasar al agregar documentos (se pide confirmar solo si la contraseña ya se imprimió). */
export function resumenDeAgregarDocumentos(ficha: FichaDeContrasena, cantidad: number): string {
  const documentos = cantidad === 1 ? '1 documento' : `${cantidad} documentos`;
  return conAviso(
    `Se agregará ${documentos} a la contraseña ${ficha.numero} y se rehará el reparto de las notas.`,
    ficha,
  );
}
