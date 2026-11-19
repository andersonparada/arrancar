import { aCentavos, deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type { SaldoInicialDto, TotalDeClaseDeSaldos, TotalesDeSaldosIniciales } from '../../dto/saldo-inicial.dto.js';

const sumaDe = (saldos: readonly SaldoInicialDto[], campo: keyof SaldoInicialDto): number =>
  saldos.reduce((total, saldo) => total + aCentavos(String(saldo[campo])), 0);

/** El cuadre de los saldos iniciales: cuántos activos y lo que suman sus costos, acumuladas y valor en libros. */
export function totalesDeSaldos(saldos: readonly SaldoInicialDto[]): TotalesDeSaldosIniciales {
  const monto = (campo: keyof SaldoInicialDto) => deCentavos(sumaDe(saldos, campo));
  return {
    activos: saldos.length,
    costo: monto('costo'),
    depreciacionAcumuladaContable: monto('depreciacionAcumuladaContable'),
    valorEnLibros: monto('valorEnLibros'),
    costoFiscal: monto('costoFiscal'),
    baseFiscal: monto('baseFiscal'),
    depreciacionAcumuladaFiscal: monto('depreciacionAcumuladaFiscal'),
  };
}

/** El costo y la depreciación acumulada contable por clase, por nombre de clase. */
export function totalesPorClase(saldos: readonly SaldoInicialDto[]): TotalDeClaseDeSaldos[] {
  const porClase = new Map<string, SaldoInicialDto[]>();
  for (const saldo of saldos) porClase.set(saldo.claseId, [...(porClase.get(saldo.claseId) ?? []), saldo]);
  return [...porClase.entries()]
    .map(([claseId, delaClase]) => ({
      claseId,
      clase: delaClase[0]!.claseNombre,
      costo: deCentavos(sumaDe(delaClase, 'costo')),
      depreciacionAcumuladaContable: deCentavos(sumaDe(delaClase, 'depreciacionAcumuladaContable')),
    }))
    .sort((a, b) => a.clase.localeCompare(b.clase));
}
