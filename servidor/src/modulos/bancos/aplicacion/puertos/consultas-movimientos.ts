import type {
  FiltroDeMovimientos,
  MovimientoDto,
  ResumenDeSinClasificar,
  SolicitudDeMovimiento,
} from '../dto/movimiento.dto.js';

/** El saldo principal de una cuenta: de qué parte es y su fecha. */
export interface SaldoPrincipalDeLaCuenta {
  parte: 'saldo_del_banco' | 'saldo_global';
  fecha: string;
}

/** Lecturas para pantallas y para las reglas de la cuenta; solo cuentan los movimientos vigentes (sin anular). */
export interface ConsultasMovimientos {
  /** De la fecha más reciente a la más antigua. */
  listar(filtro: FiltroDeMovimientos): Promise<MovimientoDto[]>;
  /** De la fecha más antigua a la más reciente, para el reporte (necesita el saldo corrido en orden). */
  listarAscendente(filtro: FiltroDeMovimientos): Promise<MovimientoDto[]>;
  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  obtener(movimientoId: string): Promise<MovimientoDto>;
  /** @throws RecursoNoEncontrado si algo que se eligió no existe o es ajeno. */
  exigirReferencias(solicitud: SolicitudDeMovimiento): Promise<void>;
  /** @throws RecursoNoEncontrado si la cuenta no existe o no es de la empresa. */
  cuentaEstaActiva(cuentaBancariaId: string): Promise<boolean>;
  /** Créditos menos débitos vigentes, como texto con dos decimales. */
  saldoDe(cuentaBancariaId: string): Promise<string>;
  /** El saldo principal vigente de la cuenta (el del banco al corte o el global de antes), sin contar `excluir`; null si no tiene. */
  saldoPrincipalDe(cuentaBancariaId: string, excluir?: string): Promise<SaldoPrincipalDeLaCuenta | null>;
  /** La fecha del movimiento vigente más antiguo, sin contar `excluir`; null si no hay. */
  fechaMasAntigua(cuentaBancariaId: string, excluir?: string): Promise<string | null>;
  /** Fin de mes de la última conciliación AUTORIZADA de la cuenta; `null` si no tiene ninguna. */
  conciliadaHasta(cuentaBancariaId: string): Promise<string | null>;
  /** Créditos menos débitos vigentes con fecha hasta (incluida) `fecha`, como texto con dos decimales. */
  saldoAlFinDe(cuentaBancariaId: string, fecha: string): Promise<string>;
  /** Los originales vigentes con el concepto de sistema «Sin clasificar», en la cuenta y fechas del filtro. */
  resumenDeSinClasificar(filtro: FiltroDeMovimientos): Promise<ResumenDeSinClasificar>;
  /** La suma de los cheques vigentes (sin anular ni revertir) de la cuenta con fecha posterior a `despuesDe`, con dos decimales. */
  chequesPosfechados(cuentaBancariaId: string, despuesDe: string): Promise<string>;
  /** Los movimientos vigentes de la cuenta con fecha entre `desde` y `hasta`, ambas incluidas. */
  vigentesEntre(cuentaBancariaId: string, desde: string, hasta: string): Promise<MovimientoDto[]>;
}
