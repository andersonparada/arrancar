/** Las siete partes en que se descompone el saldo inicial de una cuenta (lo que manda el servidor). */
export type ParteDeApertura =
  | 'saldo_del_banco'
  | 'cheque_en_circulacion'
  | 'deposito_en_transito'
  | 'debito_en_transito'
  | 'error_del_banco'
  | 'saldo_global'
  | 'cheque_posfechado';

/** Las que el usuario agrega una por una (el saldo del banco va en la cabecera). */
export type ParteQueSeAgrega = Exclude<ParteDeApertura, 'saldo_del_banco' | 'saldo_global'>;

export type FormaDelSaldoInicial = 'sin_saldo' | 'con_partidas' | 'global';

export type CodigoDeHallazgo =
  'no_cuadra' | 'sin_dato_de_libros' | 'sin_evidencia' | 'saldo_global' | 'sobregiro_sin_permiso';

export interface HallazgoDeCierre {
  cuentaBancariaId: string;
  cuentaNombre: string;
  codigo: CodigoDeHallazgo;
  mensaje: string;
  /** Cerrar la carga con este hallazgo pide un motivo. */
  pideMotivo: boolean;
}

/** Un aviso que no bloquea: lo que el servidor quiere que el usuario sepa al guardar. */
export interface AvisoDeApertura {
  codigo: string;
  mensaje: string;
}

/** Una partida de la apertura como la ve la pantalla; las acciones las decide el servidor. */
export interface PartidaDeApertura {
  movimientoId: string;
  parte: ParteDeApertura;
  /** En el error del banco dice si suma (`credito`) o resta (`debito`). */
  tipo: 'credito' | 'debito' | 'cheque';
  fecha: string;
  monto: string;
  serie: string | null;
  numeroDeCheque: number | null;
  beneficiario: string | null;
  referencia: string | null;
  observaciones: string | null;
  conceptoId: string | null;
  conceptoNombre: string | null;
  conciliadaEn: { anio: number; mes: number } | null;
  anulada: boolean;
  revertida: boolean;
  avisos: Array<'antiguo' | 'deposito_viejo'>;
  puedeCorregir: boolean;
  puedeEliminar: boolean;
  puedeAnular: boolean;
}

/** El cuadre del saldo inicial de una cuenta; las cuentas sin saldo salen con ceros. */
export interface ResumenDeSaldoInicial {
  cuentaBancariaId: string;
  cuentaNombre: string;
  bancoNombre: string | null;
  forma: FormaDelSaldoInicial;
  fechaDeCorte: string | null;
  saldoSegunEstadoDeCuenta: string | null;
  totalDepositosEnTransito: string;
  totalChequesEnCirculacion: string;
  totalDebitosEnTransito: string;
  /** Con signo: positivo suma al saldo en libros. */
  totalErroresDelBanco: string;
  saldoEnLibrosAlCorte: string;
  saldoSegunLibrosAnteriores: string | null;
  diferencia: string | null;
  cuadra: boolean;
  /** Informativo: los posfechados cuentan en su fecha, no en el cuadre. */
  totalPosfechados: string;
  tieneEvidencia: boolean;
  tieneConciliaciones: boolean;
  puedeEditar: boolean;
  puedeEliminar: boolean;
}

/** La lista de todas las cuentas y los totales de la empresa, sin compensar. */
export interface SaldosIniciales {
  fechaDeInicio: string | null;
  fechaDeCorte: string | null;
  cargaCerrada: boolean;
  cuentas: ResumenDeSaldoInicial[];
  totalBancos: string;
  totalSobregiros: string;
  hallazgos: HallazgoDeCierre[];
}

/** La ficha de una cuenta: su resumen, sus observaciones y todas sus partidas. */
export interface SaldoInicialDeCuenta extends ResumenDeSaldoInicial {
  observaciones: string | null;
  partidas: PartidaDeApertura[];
}

/** Lo que se manda al guardar la cabecera. */
export interface DatosDeCabecera {
  saldoSegunEstadoDeCuenta: string;
  saldoSegunLibrosAnteriores: string | null;
  observaciones: string | null;
}

/** Lo que se manda al agregar o corregir una partida; lo que no aplica a su parte va como `null`. */
export interface DatosDePartida {
  fecha: string;
  monto: string;
  sentido: 'credito' | 'debito' | null;
  conceptoId: string | null;
  serie: string | null;
  numeroDeCheque: number | null;
  beneficiario: string | null;
  referencia: string | null;
  observaciones: string | null;
}

export interface DatosDeAnulacionDePartida {
  motivo: string;
  fecha: string;
  pagador: string | null;
}

export interface CabeceraGuardada {
  saldoInicial: SaldoInicialDeCuenta;
  avisos: AvisoDeApertura[];
}

export interface PartidaGuardada {
  partida: PartidaDeApertura;
  avisos: AvisoDeApertura[];
}
