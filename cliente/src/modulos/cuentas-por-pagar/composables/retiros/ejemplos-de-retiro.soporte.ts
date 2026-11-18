import type { Retiro, RetiroResumen } from '../../servicios/tipos-de-retiros';

/** Datos de ejemplo para las pruebas de los retiros de efectivo. */
export const retiroDeEjemplo = (cambios: Partial<Retiro> = {}): Retiro => ({
  id: 'r1',
  numero: '2026-4',
  forma: 'cheque',
  fecha: '2026-11-10',
  monto: '5000.00',
  movimiento: { id: 'm1', cuentaBancariaId: 'b1', numero: 1523 },
  custodio: 'Juan Pérez',
  custodioUsuarioId: null,
  observaciones: null,
  estado: 'abierto',
  pagado: '3200.00',
  disponible: '1800.00',
  devuelto: '0.00',
  faltante: '0.00',
  motivoDeFaltante: null,
  liquidacion: null,
  anulacion: null,
  pagos: [],
  deMesAnterior: false,
  puedeAnular: false,
  puedeLiquidar: true,
  puedeReabrir: false,
  liquidaElCustodio: false,
  avisos: [],
  ...cambios,
});

export const resumenDeRetiroDeEjemplo = (cambios: Partial<RetiroResumen> = {}): RetiroResumen => ({
  id: 'r1',
  numero: '2026-4',
  forma: 'cheque',
  documento: 1523,
  cuentaBancariaId: 'b1',
  fecha: '2026-11-10',
  custodio: 'Juan Pérez',
  monto: '5000.00',
  pagado: '3200.00',
  disponible: '1800.00',
  estado: 'abierto',
  deMesAnterior: false,
  aviso: null,
  ...cambios,
});

/** El formato de montos separa «Q» del número con un espacio especial: para comparar textos se unifican los espacios. */
export const normalizar = (texto: string): string => texto.replace(/[\s\u00a0\u202f]+/g, ' ');
