import { describe, expect, it } from 'vitest';
import { operadorDePrueba } from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import type { ArqueoDeReporte, EstadoDeFondoAlCorte, ReposicionDeReporte } from '../../puertos/puertos-de-reportes.js';
import { arqueo, dependencias, deReporte, reposicion, vale } from './dobles-de-reportes.soporte.js';
import { ReporteDeReposiciones } from './reporte-de-reposiciones.js';
import { ReporteDeArqueos, ReporteDeEstadoDeFondos } from './reportes-de-fondos-y-arqueos.js';

const operador = operadorDePrueba();

describe('CC-R2: reposiciones del período', () => {
  it('reparte lo repuesto por concepto, deducible y no deducible, con su cheque', async () => {
    const item: ReposicionDeReporte = {
      reposicion: reposicion(),
      fondoNombre: 'Fondo Central',
      referenciaDeBancos: '1234',
      lineas: [
        { comprobante: deReporte({ id: 'c1' }), montoCentavos: 10_000 },
        { comprobante: vale({ id: 'v1' }), montoCentavos: 5_000 },
        { comprobante: deReporte({ id: 'c2', resta: true }, 'Medicinas'), montoCentavos: -2_500 },
      ],
    };
    const reporte = await new ReporteDeReposiciones(
      dependencias({ reposicionesDelPeriodo: async () => [item] }),
    ).ejecutar(operador, {});
    const fondo = reporte.fondos[0]!;
    expect(fondo.reposiciones[0]).toMatchObject({ numero: 3, respaldo: 'Cheque 1234', monto: '125.00' });
    expect(fondo.conceptos).toEqual([
      { concepto: 'Medicinas', deducible: '75.00', noDeducible: '0.00', total: '75.00' },
      { concepto: 'Peajes', deducible: '0.00', noDeducible: '50.00', total: '50.00' },
    ]);
    expect(reporte.total).toEqual({ cantidad: 1, deducible: '75.00', noDeducible: '50.00', total: '125.00' });
  });

  it('no repite «Cheque» cuando la referencia de Bancos ya lo trae (QA de CC-11)', async () => {
    const item: ReposicionDeReporte = {
      reposicion: reposicion(),
      fondoNombre: 'Fondo Central',
      referenciaDeBancos: 'Cheque 3',
      lineas: [],
    };
    const reporte = await new ReporteDeReposiciones(
      dependencias({ reposicionesDelPeriodo: async () => [item] }),
    ).ejecutar(operador, {});
    expect(reporte.fondos[0]!.reposiciones[0]!.respaldo).toBe('Cheque 3');
  });

  it('la compensada al cerrar no lleva cheque', async () => {
    const item: ReposicionDeReporte = {
      reposicion: reposicion({ forma: 'compensada_al_cerrar', movimientoId: null }),
      fondoNombre: 'Fondo Central',
      referenciaDeBancos: null,
      lineas: [],
    };
    const reporte = await new ReporteDeReposiciones(
      dependencias({ reposicionesDelPeriodo: async () => [item] }),
    ).ejecutar(operador, {});
    expect(reporte.fondos[0]!.reposiciones[0]!.respaldo).toBe('Compensada al cerrar');
  });
});

describe('CC-R4: estado de los fondos al corte', () => {
  it('calcula el efectivo esperado y suma las columnas', async () => {
    const fondos: EstadoDeFondoAlCorte[] = [
      {
        fondoId: 'f2',
        nombre: 'Bodega',
        custodio: null,
        montoCentavos: 100_000,
        pendienteCentavos: 0,
        valesCentavos: 0,
        ultimoArqueo: null,
      },
      {
        fondoId: 'f1',
        nombre: 'Central',
        custodio: 'Juan Pérez',
        montoCentavos: 500_000,
        pendienteCentavos: 120_000,
        valesCentavos: 30_000,
        ultimoArqueo: { realizadoEn: '2026-10-18T15:00:00Z', diferenciaCentavos: -500 },
      },
    ];
    const reporte = await new ReporteDeEstadoDeFondos(dependencias({ fondosAlCorte: async () => fondos })).ejecutar(
      operador,
      {},
    );
    expect(reporte.fondos.map((f) => f.nombre)).toEqual(['Bodega', 'Central']);
    expect(reporte.fondos[1]).toMatchObject({ efectivoEsperado: '3500.00', diferenciaDelArqueo: '-5.00' });
    expect(reporte.fondos[0]).toMatchObject({ ultimoArqueo: null, diferenciaDelArqueo: null });
    expect(reporte.total).toEqual({
      monto: '6000.00',
      efectivoEsperado: '4500.00',
      pendienteDeReponer: '1200.00',
      valesAbiertos: '300.00',
    });
  });
});

describe('CC-R5: arqueos del período', () => {
  it('clasifica cada arqueo y suma faltantes y sobrantes por separado', async () => {
    const items: ArqueoDeReporte[] = [
      { arqueo: arqueo({}), fondoNombre: 'Central', destino: null },
      {
        arqueo: arqueo({ id: 'a2', numero: 2, diferenciaCentavos: -2_000, motivoDeDiferencia: 'Se perdió un vale' }),
        fondoNombre: 'Central',
        destino: 'cobrar_al_custodio',
      },
      { arqueo: arqueo({ id: 'a3', numero: 3, diferenciaCentavos: 500 }), fondoNombre: 'Central', destino: null },
    ];
    const reporte = await new ReporteDeArqueos(dependencias({ arqueosDelPeriodo: async () => items })).ejecutar(
      operador,
      {},
    );
    const fondo = reporte.fondos[0]!;
    expect(fondo.filas.map((f) => f.resultado)).toEqual(['cuadrado', 'faltante', 'sobrante']);
    expect(fondo.filas[1]).toMatchObject({ destino: 'cobrar_al_custodio', motivo: 'Se perdió un vale' });
    expect(reporte.total).toEqual({ cantidad: 3, faltantes: '20.00', sobrantes: '5.00' });
  });

  it('pasa la zona horaria de la empresa a la lectura', async () => {
    let zona = '';
    await new ReporteDeArqueos(
      dependencias({
        arqueosDelPeriodo: async (filtro) => {
          zona = filtro.zonaHoraria;
          return [];
        },
      }),
    ).ejecutar(operador, { desde: '2026-10-01', hasta: '2026-10-31' });
    expect(zona).toBe('America/Guatemala');
  });
});
