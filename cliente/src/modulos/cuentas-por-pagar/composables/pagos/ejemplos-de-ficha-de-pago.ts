import type { FichaDePago, LineaDeLaFicha, PagoResumen } from '../../servicios/tipos-de-pagos';

/** Datos de ejemplo para las pruebas de la lista y la ficha de pagos. */
export const lineaDeEjemplo = (id: string, cambios: Partial<LineaDeLaFicha> = {}): LineaDeLaFicha => ({
  documentoId: id,
  tipo: 'factura',
  serie: 'A',
  numero: id,
  origen: 'libro_de_compras',
  total: '1000.00',
  retenciones: '0.00',
  contrasena: { id: 'c1', numero: '2026-15' },
  retencionDescontada: '0.00',
  monto: '600.00',
  cubre: '600.00',
  notasAplicadas: '0.00',
  saldoDelDocumento: '400.00',
  disponibleDelDocumento: '400.00',
  diferenciaOfrecible: '0.00',
  retencionesDelLibro: [],
  ...cambios,
});

const MOVIMIENTO_DE_EJEMPLO: FichaDePago['movimiento'] = {
  id: 'm1',
  cuentaBancariaId: 'b1',
  cuentaBancariaNombre: 'Cuenta monetaria',
  tipo: 'cheque',
  numero: 1523,
  fecha: '2026-11-10',
  conciliado: false,
  anulado: false,
};

const FICHA_BASE: FichaDePago = {
  id: 'p1',
  numero: '2026-7',
  contrasenas: [{ id: 'c1', numero: '2026-15' }],
  proveedor: { id: 'pr1', nombre: 'Agro', nit: '1234567' },
  beneficiario: 'Agropecuaria La Esperanza, S.A.',
  forma: 'cheque',
  fecha: '2026-11-10',
  posfechado: false,
  monto: '1000.00',
  observaciones: null,
  motivo: null,
  conCargaCerrada: null,
  retiroId: null,
  recibidoPor: null,
  motivoSinBancarizar: null,
  estado: 'vigente',
  anulacion: null,
  diferencias: [],
  referencia: null,
  movimiento: MOVIMIENTO_DE_EJEMPLO,
  conciliado: false,
  retiro: null,
  aplicaciones: [lineaDeEjemplo('d1', { monto: '600.00' }), lineaDeEjemplo('d2', { monto: '400.00' })],
  creadoPorNombre: 'Ana',
  creadoEn: '2026-11-10T15:00:00.000Z',
  puedeAnular: true,
  puedeReaplicar: true,
  puedeSaldarDiferencia: true,
};

export const fichaDeEjemplo = (cambios: Partial<FichaDePago> = {}): FichaDePago => ({ ...FICHA_BASE, ...cambios });

export const resumenDeEjemplo = (cambios: Partial<PagoResumen> = {}): PagoResumen => ({
  id: 'p1',
  numero: '2026-7',
  proveedor: { id: 'pr1', nombre: 'Agro', nit: '1234567' },
  contrasenas: [{ id: 'c1', numero: '2026-15' }],
  forma: 'cheque',
  fecha: '2026-11-10',
  posfechado: false,
  monto: '1000.00',
  estado: 'vigente',
  fechaDeAnulacion: null,
  movimiento: { cuentaBancariaId: 'b1', cuentaBancariaNombre: 'Banco X', numero: 1523 },
  retiro: null,
  ...cambios,
});
