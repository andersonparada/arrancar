import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type { CuentaParaPagar } from '../../servicios/tipos-de-pagos';
import type { DocumentoPorPagar } from '../../servicios/tipos';
import type { FormaDeReintegro, SolicitudDeReintegro } from '../../servicios/tipos-de-reintegros';
import { centavosDe, textoDeCentavos } from '../dinero';
import { tituloDeDocumento } from '../detalles-de-documento';

export const MAXIMO_DE_LA_REFERENCIA_DEL_REINTEGRO = 100;
export const MAXIMO_DE_LAS_OBSERVACIONES = 500;

/** Una nota que se reintegra, con su saldo libre (el máximo) y lo que se devolvió. */
export interface NotaPorReintegrar {
  notaId: string;
  titulo: string;
  saldo: string;
  monto: string;
}

/** Lo que se escribe en la ventana de reintegro. */
export interface EdicionDeReintegro {
  abierta: boolean;
  proveedorId: string;
  proveedorNombre: string;
  forma: FormaDeReintegro;
  cuentaBancariaId: string;
  referencia: string;
  fecha: string;
  observaciones: string;
  notas: NotaPorReintegrar[];
}

export const edicionDeReintegroVacia = (): EdicionDeReintegro => ({
  abierta: false,
  proveedorId: '',
  proveedorNombre: '',
  forma: 'deposito',
  cuentaBancariaId: '',
  referencia: '',
  fecha: '',
  observaciones: '',
  notas: [],
});

/** Al abrir: cada nota propone todo su saldo libre, la fecha es hoy y el depósito es la forma más común. */
export function edicionDeReintegro(notas: readonly DocumentoPorPagar[], hoy: string): EdicionDeReintegro {
  return {
    ...edicionDeReintegroVacia(),
    abierta: true,
    proveedorId: notas[0]?.proveedorId ?? '',
    proveedorNombre: notas[0]?.proveedorNombre ?? '',
    fecha: hoy,
    notas: notas.map((nota) => ({
      notaId: nota.id,
      titulo: tituloDeDocumento(nota),
      saldo: nota.saldo,
      monto: nota.saldo,
    })),
  };
}

/** Las notas se pueden escoger juntas si son del mismo proveedor (el servidor revisa el resto). */
export const esDelMismoProveedor = (marcadas: readonly DocumentoPorPagar[], otra: DocumentoPorPagar): boolean =>
  marcadas.length === 0 || marcadas[0]?.proveedorId === otra.proveedorId;

export const totalDelReintegro = (notas: readonly NotaPorReintegrar[]): number =>
  notas.reduce((suma, { monto }) => suma + (centavosDe(monto) ?? 0), 0);

function errorDelMonto({ monto, saldo, titulo }: NotaPorReintegrar): string | null {
  const centavos = centavosDe(monto);
  if (centavos === null || centavos <= 0) return 'Escriba un monto mayor que cero, con hasta dos decimales.';
  return centavos > (centavosDe(saldo) ?? 0)
    ? `La nota ${titulo} solo tiene ${formatearMonto(saldo)} a favor; baje el monto.`
    : null;
}

function errorDelMedio(edicion: EdicionDeReintegro): Record<string, string> {
  if (edicion.forma === 'deposito')
    return edicion.cuentaBancariaId ? {} : { cuentaBancariaId: 'Escoja la cuenta donde cayó el depósito.' };
  return edicion.referencia.trim() ? {} : { referencia: 'Escriba el número del recibo de caja o de la boleta.' };
}

/** Errores por campo antes de molestar al servidor; las llaves son las del servidor (`notas.0.monto`). */
export function erroresDeReintegro(edicion: EdicionDeReintegro, hoy: string): Record<string, string> {
  const errores: Record<string, string> = errorDelMedio(edicion);
  edicion.notas.forEach((nota, indice) => {
    const error = errorDelMonto(nota);
    if (error) errores[`notas.${indice}.monto`] = error;
  });
  if (!edicion.fecha) errores.fecha = 'Escriba la fecha del reintegro.';
  else if (edicion.fecha > hoy) errores.fecha = 'La fecha no puede ser futura.';
  if (edicion.referencia.length > MAXIMO_DE_LA_REFERENCIA_DEL_REINTEGRO)
    errores.referencia = `La referencia admite hasta ${MAXIMO_DE_LA_REFERENCIA_DEL_REINTEGRO} caracteres.`;
  return errores;
}

/** El cuerpo de la solicitud; solo se llama con la edición ya validada. */
export function solicitudDeReintegro(edicion: EdicionDeReintegro): SolicitudDeReintegro {
  const deposito = edicion.forma === 'deposito';
  return {
    proveedorId: edicion.proveedorId,
    forma: edicion.forma,
    fecha: edicion.fecha,
    cuentaBancariaId: deposito ? edicion.cuentaBancariaId : null,
    referencia: edicion.referencia.trim() || null,
    observaciones: edicion.observaciones.trim() || null,
    notas: edicion.notas.map(({ notaId, monto }) => ({ notaId, monto: String(monto).trim() })),
  };
}

/** Las cuentas por nombre, con la invitación a escoger primero. */
export function opcionesDeCuenta(cuentas: readonly CuentaParaPagar[]): { valor: string; texto: string }[] {
  const ordenadas = cuentas
    .map((cuenta) => ({ valor: cuenta.cuentaBancariaId, texto: cuenta.nombre }))
    .sort((a, b) => a.texto.localeCompare(b.texto, 'es', { sensitivity: 'base' }));
  return [{ valor: '', texto: 'Escoja la cuenta' }, ...ordenadas];
}

/** Lo que va a pasar al confirmar. */
export function resumenDeReintegro(edicion: EdicionDeReintegro, cuentas: readonly CuentaParaPagar[]): string {
  const total = formatearMonto(textoDeCentavos(totalDelReintegro(edicion.notas)));
  const cuantas = edicion.notas.length === 1 ? 'la nota de crédito' : `${edicion.notas.length} notas de crédito`;
  if (edicion.forma === 'efectivo')
    return `${edicion.proveedorNombre} devuelve ${total} en efectivo de ${cuantas}. No se mueve ninguna cuenta bancaria.`;
  const cuenta = cuentas.find(({ cuentaBancariaId }) => cuentaBancariaId === edicion.cuentaBancariaId)?.nombre;
  const donde = cuenta ? `la cuenta ${cuenta}` : 'la cuenta escogida';
  return `${edicion.proveedorNombre} devuelve ${total} de ${cuantas}: se registrará una nota de crédito en ${donde} de Bancos.`;
}

export const AVISO_DE_EFECTIVO =
  'Deposite el efectivo recibido o regístrelo en la caja de la empresa; Arrancar no lleva caja todavía.';

/** Lo que dice la ventana de anular, según cómo se cobró. */
export function resumenDeAnularReintegro(forma: FormaDeReintegro, numero: string, monto: string): string {
  const base = `Se anulará el reintegro ${numero} por ${formatearMonto(monto)}: el monto vuelve al saldo a favor de las notas.`;
  return forma === 'deposito' ? `${base} En Bancos se anulará su nota de crédito con un movimiento inverso.` : base;
}
