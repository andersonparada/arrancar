import { describe, expect, it } from 'vitest';
import {
  operadorDePrueba,
  RelojFijo,
  UnidadDeTrabajoEnMemoria,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import type {
  ConsultasDeSaldosPorCuenta,
  FiltroDeLectura,
  LecturaDeSaldos,
} from '../../puertos/consultas-de-saldos-por-cuenta.js';
import { ReporteDeSaldosPorCuenta } from './reporte-de-saldos-por-cuenta.js';

class ConsultasFijas implements ConsultasDeSaldosPorCuenta {
  filtros: FiltroDeLectura[] = [];

  constructor(private readonly lectura: LecturaDeSaldos) {}

  async leer(filtro: FiltroDeLectura): Promise<LecturaDeSaldos> {
    this.filtros.push(filtro);
    return this.lectura;
  }
}

const LECTURA: LecturaDeSaldos = {
  cuentas: [
    {
      cuentaBancariaId: 'cuenta-1',
      nombre: 'Monetaria',
      bancoNombre: 'Banco',
      numero: '001',
      activo: true,
      libros: '800.00',
      posfechados: '0.00',
      movimientosAnteriores: 0,
      ultimaConciliacion: null,
    },
  ],
  sumas: [],
  partidas: [],
};

const armar = () => {
  const consultas = new ConsultasFijas(LECTURA);
  const reporte = new ReporteDeSaldosPorCuenta({
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    consultas,
    reloj: new RelojFijo('2026-03-15'),
  });
  return { consultas, reporte };
};

describe('reporte de saldos por cuenta', () => {
  it('sin fecha usa hoy y pide a la lectura el fin del mes anterior', async () => {
    const { consultas, reporte } = armar();

    const resultado = await reporte.ejecutar(operadorDePrueba());

    expect(resultado.fecha).toBe('2026-03-15');
    expect(consultas.filtros).toEqual([
      { fecha: '2026-03-15', finDelMesAnterior: '2026-02-28', cuentaBancariaId: undefined },
    ]);
  });

  it('con fecha y cuenta las pasa tal cual, también cruzando de año', async () => {
    const { consultas, reporte } = armar();

    await reporte.ejecutar(operadorDePrueba(), { fecha: '2026-01-10', cuentaBancariaId: 'cuenta-1' });

    expect(consultas.filtros).toEqual([
      { fecha: '2026-01-10', finDelMesAnterior: '2025-12-31', cuentaBancariaId: 'cuenta-1' },
    ]);
  });

  it('arma el reporte con las cuentas y la nota', async () => {
    const { reporte } = armar();

    const resultado = await reporte.ejecutar(operadorDePrueba(), { fecha: '2026-03-15' });

    expect(resultado.cuentas).toHaveLength(1);
    expect(resultado.bancos.saldoEnLibros).toBe('800.00');
    expect(resultado.sobregiros.cantidadDeCuentas).toBe(0);
    expect(resultado.nota).toContain('fondos retenidos');
  });
});
