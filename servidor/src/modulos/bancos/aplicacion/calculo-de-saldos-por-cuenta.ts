import { aCentavos, deCentavos } from '../dominio/centavos.js';
import { finDelMesDe } from '../dominio/conciliacion.js';
import type {
  CategoriaEnTransito,
  ReporteDeSaldosPorCuentaDto,
  SaldoDeCuentaDto,
  TotalDeSaldosDto,
  TotalEnTransitoDto,
} from './dto/saldos-por-cuenta.dto.js';
import type { LecturaDeCuenta, LecturaDeSaldos, SumaEnTransito } from './puertos/consultas-de-saldos-por-cuenta.js';

export const NOTA_DE_SALDOS_POR_CUENTA =
  'El disponible no incluye fondos retenidos por el banco (depósitos de cheques de otros bancos aún en reserva) ni el sobregiro autorizado.';

/** Lo que cada categoría resta o suma al saldo en libros: con este signo el monto de cheques y débitos queda positivo. */
const SIGNO_DE_LA_CATEGORIA: Record<CategoriaEnTransito, 1 | -1> = {
  cheque_en_circulacion: -1,
  deposito_en_transito: 1,
  debito_en_transito: -1,
  error_del_banco: 1,
};

function totalDe(sumas: readonly SumaEnTransito[], categoria: CategoriaEnTransito): TotalEnTransitoDto {
  const suma = sumas.find((s) => s.categoria === categoria);
  const efecto = suma ? aCentavos(suma.efecto) : 0;
  return { cantidad: suma?.cantidad ?? 0, monto: deCentavos(efecto * SIGNO_DE_LA_CATEGORIA[categoria]) };
}

const totalesEnTransito = (sumas: readonly SumaEnTransito[]) => ({
  chequesEnCirculacion: totalDe(sumas, 'cheque_en_circulacion'),
  depositosEnTransito: totalDe(sumas, 'deposito_en_transito'),
  debitosEnTransito: totalDe(sumas, 'debito_en_transito'),
  erroresDelBanco: totalDe(sumas, 'error_del_banco'),
});

/**
 * Tiene movimientos del día a día en meses completos anteriores a la fecha y su última conciliación autorizada no llega al fin del
 * mes inmediato anterior.
 */
export function estaAtrasada(cuenta: LecturaDeCuenta, finDelMesAnterior: string): boolean {
  if (cuenta.movimientosAnteriores === 0) return false;
  if (!cuenta.ultimaConciliacion) return true;
  return finDelMesDe(cuenta.ultimaConciliacion) < finDelMesAnterior;
}

function saldosDeLaCuenta(cuenta: LecturaDeCuenta, lectura: LecturaDeSaldos, finDelMesAnterior: string) {
  const sumas = lectura.sumas.filter((s) => s.cuentaBancariaId === cuenta.cuentaBancariaId);
  const libros = aCentavos(cuenta.libros);
  const posfechados = aCentavos(cuenta.posfechados);
  const efectoEnTransito = sumas.reduce((total, s) => total + aCentavos(s.efecto), 0);
  const disponible = libros - posfechados;
  return {
    sumas,
    libros,
    posfechados,
    disponible,
    saldoSegunBanco: libros - efectoEnTransito,
    atrasada: estaAtrasada(cuenta, finDelMesAnterior),
  };
}

/** El saldo de una cuenta a la fecha: sus libros, lo comprometido, el disponible y lo que el banco aún no ha visto. */
export function armarSaldoDeCuenta(
  cuenta: LecturaDeCuenta,
  lectura: LecturaDeSaldos,
  finDelMesAnterior: string,
): SaldoDeCuentaDto {
  const calculo = saldosDeLaCuenta(cuenta, lectura, finDelMesAnterior);
  return {
    cuentaBancariaId: cuenta.cuentaBancariaId,
    cuentaBancariaNombre: cuenta.nombre,
    bancoNombre: cuenta.bancoNombre,
    numero: cuenta.numero,
    activo: cuenta.activo,
    saldoEnLibros: deCentavos(calculo.libros),
    chequesPosfechados: deCentavos(calculo.posfechados),
    disponible: deCentavos(calculo.disponible),
    fondosInsuficientes: calculo.posfechados > 0 && calculo.disponible < 0,
    ...totalesEnTransito(calculo.sumas),
    saldoSegunBanco: deCentavos(calculo.saldoSegunBanco),
    ultimaConciliacion: cuenta.ultimaConciliacion,
    atrasada: calculo.atrasada,
    partidas: lectura.partidas.filter((p) => p.cuentaBancariaId === cuenta.cuentaBancariaId),
  };
}

/** Una cuenta inactiva sin saldo, sin partidas y sin posfechados no aporta nada al reporte. */
const aportaAlReporte = (cuenta: SaldoDeCuentaDto): boolean =>
  cuenta.activo ||
  aCentavos(cuenta.saldoEnLibros) !== 0 ||
  aCentavos(cuenta.chequesPosfechados) !== 0 ||
  cuenta.partidas.length > 0;

/** Suma un lado: con el signo -1 las cuentas negativas quedan en valor absoluto (el sobregiro). Los posfechados no cambian. */
function sumarLado(cuentas: readonly SaldoDeCuentaDto[], signo: 1 | -1): TotalDeSaldosDto {
  const suma = (valor: (c: SaldoDeCuentaDto) => string) => cuentas.reduce((total, c) => total + aCentavos(valor(c)), 0);
  return {
    cantidadDeCuentas: cuentas.length,
    saldoEnLibros: deCentavos(signo * suma((c) => c.saldoEnLibros)),
    chequesPosfechados: deCentavos(suma((c) => c.chequesPosfechados)),
    disponible: deCentavos(signo * suma((c) => c.disponible)),
  };
}

/**
 * El reporte a la fecha: cada cuenta y los totales **sin compensar**: Bancos (libros de cero o positivos) y
 * Sobregiros bancarios (libros negativos, en valor absoluto). Una cuenta sobregirada con posfechados compromete más:
 * su disponible en valor absoluto es el sobregiro más los posfechados.
 */
export function armarReporteDeSaldos(
  lectura: LecturaDeSaldos,
  contexto: { fecha: string; finDelMesAnterior: string },
): ReporteDeSaldosPorCuentaDto {
  const cuentas = lectura.cuentas
    .map((cuenta) => armarSaldoDeCuenta(cuenta, lectura, contexto.finDelMesAnterior))
    .filter(aportaAlReporte);
  const esSobregiro = (c: SaldoDeCuentaDto) => aCentavos(c.saldoEnLibros) < 0;
  return {
    fecha: contexto.fecha,
    cuentas,
    bancos: sumarLado(
      cuentas.filter((c) => !esSobregiro(c)),
      1,
    ),
    sobregiros: sumarLado(cuentas.filter(esSobregiro), -1),
    nota: NOTA_DE_SALDOS_POR_CUENTA,
  };
}
