import type { PuntoDePartida, SaldoDelBancoDeLaApertura } from '../aplicacion/puertos/consultas-conciliaciones.js';
import { aCentavos, deCentavos, efectoEnCentavos } from '../dominio/centavos.js';
import { finDelMesDe, periodoAnterior, type Conciliacion, type Periodo } from '../dominio/conciliacion.js';
import type { MovimientosEnMemoria } from './dobles-de-movimientos.js';

/** El saldo del estado de cuenta de la carga inicial de la cuenta, o `null` si no tiene. */
export async function saldoDelBancoEnMemoria(
  movimientos: MovimientosEnMemoria,
  cuentaBancariaId: string,
): Promise<SaldoDelBancoDeLaApertura | null> {
  const todos = await movimientos.listar({ cuentaBancariaId });
  const saldo = todos.find((m) => !m.anuladoEn && m.parteDeApertura === 'saldo_del_banco');
  if (!saldo) return null;
  return { fecha: saldo.fecha, monto: deCentavos(efectoEnCentavos(saldo.tipo, saldo.monto)) };
}

/**
 * Como en Postgres: con la foto del mes anterior, sus saldos; sin ella, los libros al fin del mes anterior y el banco
 * en cero, salvo con saldo del banco de la carga inicial (parte de él y de los libros al corte).
 */
export async function puntoDePartidaEnMemoria(datos: {
  movimientos: MovimientosEnMemoria;
  cuentaBancariaId: string;
  periodo: Periodo;
  fotoAnterior: string | null;
}): Promise<PuntoDePartida> {
  const { movimientos, cuentaBancariaId, periodo, fotoAnterior } = datos;
  const finDelMesAnterior = finDelMesDe(periodoAnterior(periodo));
  const delBanco = fotoAnterior ? null : await saldoDelBancoEnMemoria(movimientos, cuentaBancariaId);
  const despuesDe = delBanco && delBanco.fecha > finDelMesAnterior ? delBanco.fecha : finDelMesAnterior;
  return {
    librosEnCentavos: aCentavos(await movimientos.saldoAlFinDe(cuentaBancariaId, despuesDe)),
    bancoEnCentavos: aCentavos(fotoAnterior ?? delBanco?.monto ?? '0.00'),
    despuesDe,
    saldoInicialDelBancoDeLaApertura: delBanco,
  };
}

/** El saldo calculado de la foto de la conciliación del mes anterior; `null` si no existe o no tiene foto. */
export function fotoDelMesAnteriorEnMemoria(conciliaciones: readonly Conciliacion[], periodo: Periodo): string | null {
  const anterior = periodoAnterior(periodo);
  const previa = conciliaciones
    .map((c) => c.instantanea())
    .find((p) => p.anio === anterior.anio && p.mes === anterior.mes);
  return previa?.foto?.saldoCalculadoEstadoDeCuenta ?? null;
}
