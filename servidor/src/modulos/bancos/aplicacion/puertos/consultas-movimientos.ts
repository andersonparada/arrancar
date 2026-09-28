import type { FiltroDeMovimientos, MovimientoDto, SolicitudDeMovimiento } from '../dto/movimiento.dto.js';

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
  /** La fecha del saldo inicial vigente de la cuenta, sin contar `excluir`; null si no tiene. */
  fechaDelSaldoInicial(cuentaBancariaId: string, excluir?: string): Promise<string | null>;
  /** La fecha del movimiento vigente más antiguo, sin contar `excluir`; null si no hay. */
  fechaMasAntigua(cuentaBancariaId: string, excluir?: string): Promise<string | null>;
  /** Fin de mes de la última conciliación AUTORIZADA de la cuenta; `null` si no tiene ninguna. */
  conciliadaHasta(cuentaBancariaId: string): Promise<string | null>;
  /** Créditos menos débitos vigentes con fecha hasta (incluida) `fecha`, como texto con dos decimales. */
  saldoAlFinDe(cuentaBancariaId: string, fecha: string): Promise<string>;
  /** Los movimientos vigentes de la cuenta con fecha entre `desde` y `hasta`, ambas incluidas. */
  vigentesEntre(cuentaBancariaId: string, desde: string, hasta: string): Promise<MovimientoDto[]>;
}
