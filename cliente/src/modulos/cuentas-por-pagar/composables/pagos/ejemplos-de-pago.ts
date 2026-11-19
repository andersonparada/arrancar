import type { CargoParaPagar, NotaParaLigar, ParaPagar } from '../../servicios/tipos-de-pagos';
import { edicionDePagoVacia, type EdicionDePago } from './edicion-de-pago';

/** Datos de ejemplo para las pruebas de «Nuevo pago». */
export const cargoDeEjemplo = (id: string, cambios: Partial<CargoParaPagar> = {}): CargoParaPagar => ({
  id,
  contrasenaId: 'c1',
  tipo: 'factura',
  serie: 'A',
  numero: id,
  origen: 'libro_de_compras',
  fechaDeEmision: '2026-10-01',
  fechaDeRecepcion: '2026-10-03',
  vencimiento: '2026-11-01',
  total: '1000.00',
  saldo: '1000.00',
  comprometido: '0.00',
  disponible: cambios.saldo ?? '1000.00',
  comprometidoHasta: null,
  propuesto: '1000.00',
  retencionPorDescontar: '0.00',
  retencionesPorPracticar: '0.00',
  constanciasPendientes: 0,
  mesDeRetencion: null,
  tieneActivoFijo: false,
  sobreUmbralDeBancarizacion: false,
  ...cambios,
});

export const datosDeEjemplo = (cargos: CargoParaPagar[], cambios: Partial<ParaPagar> = {}): ParaPagar => ({
  contrasenas: [
    { id: 'c1', numero: '2026-15', fecha: '2026-10-10' },
    { id: 'c2', numero: '2026-16', fecha: '2026-10-20' },
  ],
  cargos,
  noAutorizados: [],
  fechaMinima: null,
  fechaDeInicio: '2026-01-01',
  cargaCerrada: false,
  beneficiario: 'Agropecuaria La Esperanza, S.A.',
  sumaDelMesAlProveedor: '0.00',
  umbralDeBancarizacion: '30000.00',
  topeDiferencia: '0.05',
  chequesDeAperturaSinLigar: { cantidad: 0, total: '0.00' },
  ...cambios,
});

export const notaDeEjemplo = (cambios: Partial<NotaParaLigar> = {}): NotaParaLigar => ({
  movimientoId: 'n1',
  cuentaBancariaId: 'b1',
  cuentaBancariaNombre: 'Cuenta monetaria',
  fecha: '2026-11-05',
  numero: 45,
  referencia: null,
  beneficiario: null,
  monto: '500.00',
  aplicado: '0.00',
  disponible: '500.00',
  ...cambios,
});

/** Una edición de cheque a la fecha dada, con las contraseñas y los montos propuestos. */
export const edicionDeEjemplo = (cambios: Partial<EdicionDePago> = {}): EdicionDePago => ({
  ...edicionDePagoVacia('2026-11-15'),
  proveedorId: 'p1',
  contrasenasIncluidas: ['c1'],
  medio: 'ch1',
  ...cambios,
});
