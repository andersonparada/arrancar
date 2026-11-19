import type { Anticipo, AnticipoResumen } from '../servicios/tipos-de-anticipos';
import type { Gasto, GastoDeBandeja } from '../servicios/tipos-de-gastos';

/** Un anticipo abierto de ejemplo: 1,500 entregados y 1,200 gastados. */
export const anticipoDeEjemplo = (cambios: Partial<Anticipo> = {}): Anticipo => ({
  id: '3f2b8c1e-5d4a-4e6f-9a7b-1c2d3e4f5a6b',
  numero: '5',
  beneficiarioId: 'b-1',
  beneficiario: 'Ana López',
  esEmpleado: true,
  clase: 'viatico',
  forma: 'cheque',
  fecha: '2026-11-01',
  fechaLimite: '2026-11-16',
  monto: '1500.00',
  gastado: '1200.00',
  porJustificar: '300.00',
  estado: 'abierto',
  diasDesdeLaEntrega: 10,
  diasVencido: 0,
  vencido: false,
  aviso: null,
  movimiento: { id: 'm-1', cuentaBancariaId: 'c-1', numero: 1234 },
  descripcion: 'Viaje a la finca',
  beneficiarioUsuarioId: null,
  localidadId: null,
  motivoConVencidos: null,
  liquidacion: null,
  anulacion: null,
  puedeAnular: false,
  puedeLiquidar: true,
  puedeReabrir: false,
  avisos: [],
  ...cambios,
});

export const resumenDeEjemplo = (cambios: Partial<AnticipoResumen> = {}): AnticipoResumen => {
  const { movimiento, ...resto } = anticipoDeEjemplo();
  return {
    ...resto,
    documento: movimiento.numero,
    cuentaBancariaId: movimiento.cuentaBancariaId,
    ...cambios,
  } as AnticipoResumen;
};

export const gastoDeEjemplo = (cambios: Partial<Gasto> = {}): Gasto => ({
  id: 'g-1',
  anticipoId: 'a-1',
  clase: 'documento',
  documentoDeCompraId: 'd-1',
  tipoDeDocumento: 'factura',
  etiqueta: 'A-123',
  proveedorId: 'p-1',
  proveedor: 'Ferretería El Clavo',
  fechaDeEmision: '2026-11-03',
  fecha: '2026-11-03',
  monto: '800.00',
  montoRetenido: '0.00',
  conRetencion: false,
  motivoConRetencion: null,
  resta: false,
  conActivoFijo: false,
  descripcion: null,
  pagadoA: null,
  conceptoDeGastoId: null,
  motivoSinDocumento: null,
  tratamientoSinDocumento: null,
  sinBancarizar: false,
  asignadoEn: '2026-11-04T10:00:00Z',
  estado: 'vigente',
  avisos: [],
  ...cambios,
});

export const gastoSinDocumentoDeEjemplo = (cambios: Partial<Gasto> = {}): Gasto =>
  gastoDeEjemplo({
    id: 'g-2',
    clase: 'sin_documento',
    documentoDeCompraId: null,
    tipoDeDocumento: null,
    etiqueta: 'Taxi al aeropuerto',
    proveedorId: null,
    proveedor: null,
    fechaDeEmision: null,
    monto: '45.50',
    pagadoA: 'Taxista',
    motivoSinDocumento: 'No dio factura',
    tratamientoSinDocumento: 'no_deducible',
    ...cambios,
  });

export const gastoDeBandejaDeEjemplo = (cambios: Partial<GastoDeBandeja> = {}): GastoDeBandeja => ({
  ...gastoDeEjemplo({ anticipoId: null }),
  puedeAsignarConRetencion: false,
  ...cambios,
});
