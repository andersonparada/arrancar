import type { PartidaDeApertura, ResumenDeSaldoInicial } from '../../servicios/tipos-de-saldos-iniciales';

/** Un resumen de ejemplo para las pruebas: una cuenta con partidas que cuadra con los libros anteriores. */
export const resumenDeEjemplo = (cambios: Partial<ResumenDeSaldoInicial> = {}): ResumenDeSaldoInicial => ({
  cuentaBancariaId: 'cuenta-1',
  cuentaNombre: 'Monetaria Industrial',
  bancoNombre: 'Banco Industrial',
  forma: 'con_partidas',
  fechaDeCorte: '2026-12-31',
  saldoSegunEstadoDeCuenta: '10000.00',
  totalDepositosEnTransito: '500.00',
  totalChequesEnCirculacion: '1200.00',
  totalDebitosEnTransito: '0.00',
  totalErroresDelBanco: '0.00',
  saldoEnLibrosAlCorte: '9300.00',
  saldoSegunLibrosAnteriores: '9300.00',
  diferencia: '0.00',
  cuadra: true,
  totalPosfechados: '0.00',
  tieneEvidencia: false,
  tieneConciliaciones: false,
  puedeEditar: true,
  puedeEliminar: true,
  ...cambios,
});

/** Una partida de ejemplo para las pruebas: un cheque en circulación. */
export const partidaDeEjemplo = (cambios: Partial<PartidaDeApertura> = {}): PartidaDeApertura => ({
  movimientoId: 'mov-1',
  parte: 'cheque_en_circulacion',
  tipo: 'cheque',
  fecha: '2026-12-20',
  monto: '1200.00',
  serie: null,
  numeroDeCheque: 4501,
  beneficiario: 'Ferretería La Esquina',
  referencia: null,
  observaciones: null,
  conceptoId: null,
  conceptoNombre: null,
  conciliadaEn: null,
  anulada: false,
  revertida: false,
  avisos: [],
  puedeCorregir: true,
  puedeEliminar: true,
  puedeAnular: false,
  ...cambios,
});
