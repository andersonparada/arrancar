import { textoDeEdicion, textoONulo } from '@/modulos/core/utilidades/edicion';
import type { DatosDeSaldoInicial, SaldoInicial } from '../../servicios/tipos-de-saldos-iniciales';
import type { TipoDeDocumento } from '../../servicios/tipos';

/** Lo que muestra cada campo de la ventana mientras se carga o corrige un saldo inicial. */
export interface EdicionDeSaldoInicial {
  abierta: boolean;
  id: string | null;
  proveedorId: string | null;
  tipo: TipoDeDocumento;
  serie: string;
  numero: string;
  referencia: string;
  fechaEmision: string;
  vencimiento: string;
  total: string | number;
  retenciones: string | number;
  retencionesPorPracticar: string | number;
  saldoPendiente: string | number;
  tieneActivoFijo: boolean;
  /** Verdadero cuando el usuario escribió el saldo pendiente: ya no se propone solo. */
  saldoEscrito: boolean;
}

const CERO = '0.00';

/** La ventana vacía, cerrada; el tipo por omisión es factura. */
export const edicionVacia = (): EdicionDeSaldoInicial => ({
  abierta: false,
  id: null,
  proveedorId: null,
  tipo: 'factura',
  serie: '',
  numero: '',
  referencia: '',
  fechaEmision: '',
  vencimiento: '',
  total: '',
  retenciones: '',
  retencionesPorPracticar: '',
  saldoPendiente: '',
  tieneActivoFijo: false,
  saldoEscrito: false,
});

/** La ventana abierta para cargar un saldo nuevo. */
export const edicionNueva = (): EdicionDeSaldoInicial => ({ ...edicionVacia(), abierta: true });

/** La ventana abierta con los datos de un saldo para corregirlo (el saldo ya viene escrito: no se propone). */
export const edicionDe = (saldo: SaldoInicial): EdicionDeSaldoInicial => ({
  abierta: true,
  id: saldo.id,
  proveedorId: saldo.proveedorId,
  tipo: saldo.tipo,
  serie: textoDeEdicion(saldo.serie),
  numero: saldo.numero,
  referencia: textoDeEdicion(saldo.referencia),
  fechaEmision: saldo.fechaEmision,
  vencimiento: textoDeEdicion(saldo.vencimiento),
  total: saldo.total,
  retenciones: saldo.retenciones,
  retencionesPorPracticar: saldo.retencionesPorPracticar,
  saldoPendiente: saldo.saldoPendiente,
  tieneActivoFijo: saldo.tieneActivoFijo,
  saldoEscrito: true,
});

/** La nota de crédito no lleva vencimiento ni retenciones: la ventana oculta esos campos. */
export const esNotaDeCredito = (tipo: TipoDeDocumento): boolean => tipo === 'nota_de_credito';

/** Quetzales escritos a centavos enteros; `null` si no es un monto válido (evita errores de coma flotante). */
export function centavosDe(valor: string | number): number | null {
  const texto = textoDeEdicion(valor).trim();
  if (!/^-?\d+(\.\d{1,2})?$/.test(texto)) return null;
  return Math.round(Number(texto) * 100);
}

const comoMonto = (centavos: number): string => (centavos / 100).toFixed(2);

/** El saldo pendiente que se propone: el total menos las retenciones; `''` si el total aún no es un monto. */
export function propuestaDeSaldoPendiente(total: string | number, retenciones: string | number): string {
  const centavosTotal = centavosDe(total);
  if (centavosTotal === null || centavosTotal <= 0) return '';
  const centavosRetenciones = textoDeEdicion(retenciones).trim() === '' ? 0 : centavosDe(retenciones);
  if (centavosRetenciones === null || centavosRetenciones > centavosTotal) return '';
  return comoMonto(centavosTotal - centavosRetenciones);
}

/** Si el usuario no ha escrito el saldo pendiente, lo propone a partir del total y las retenciones. */
export function aplicarPropuesta(edicion: EdicionDeSaldoInicial): void {
  if (edicion.saldoEscrito) return;
  const retenciones = esNotaDeCredito(edicion.tipo) ? '' : edicion.retenciones;
  edicion.saldoPendiente = propuestaDeSaldoPendiente(edicion.total, retenciones);
}

/** El error de las retenciones por practicar si pasan de las retenciones; `null` si está bien o no se puede saber. */
export function errorDeRetencionesPorPracticar(edicion: EdicionDeSaldoInicial): string | null {
  if (esNotaDeCredito(edicion.tipo)) return null;
  const porPracticar = centavosDe(edicion.retencionesPorPracticar);
  const retenciones = centavosDe(edicion.retenciones);
  if (porPracticar === null || retenciones === null || porPracticar <= retenciones) return null;
  return 'No pueden ser más que las retenciones del documento: son la parte de ellas que todavía no se practicó.';
}

/** Lo que se manda al servidor: lo vacío como `null`, el dinero como texto y, en una nota de crédito, sin vencimiento ni retenciones. */
export function datosDeSaldoInicial(edicion: EdicionDeSaldoInicial): DatosDeSaldoInicial {
  const sinRetenciones = esNotaDeCredito(edicion.tipo);
  const dinero = (valor: string | number): string => textoDeEdicion(valor).trim();
  return {
    proveedorId: edicion.proveedorId ?? '',
    tipo: edicion.tipo,
    serie: textoONulo(edicion.serie),
    numero: edicion.numero.trim(),
    referencia: textoONulo(edicion.referencia),
    fechaEmision: edicion.fechaEmision,
    vencimiento: sinRetenciones ? null : textoONulo(edicion.vencimiento),
    total: dinero(edicion.total),
    retenciones: sinRetenciones ? CERO : dinero(edicion.retenciones) || CERO,
    retencionesPorPracticar: sinRetenciones ? CERO : dinero(edicion.retencionesPorPracticar) || CERO,
    saldoPendiente: dinero(edicion.saldoPendiente),
    tieneActivoFijo: edicion.tieneActivoFijo,
  };
}
