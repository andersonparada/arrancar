import { describe, expect, it } from 'vitest';
import {
  RelojFijo,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import type { Anticipo } from '../../../dominio/anticipos.js';
import type { FiltroDeAnticipos, FilaDeAnticipo } from '../../puertos/puertos-de-anticipos.js';
import type { FiltroDeNoLiquidado } from '../../puertos/puertos-de-reportes.js';
import { ReporteDeAnticiposPorLiquidar } from './reporte-de-anticipos-por-liquidar.js';
import { ReporteDeNoLiquidado } from './reporte-de-no-liquidado.js';

const operador = operadorDePrueba();

const anticipo = (cambios: Partial<Anticipo>): Anticipo => ({
  id: 'a1',
  numero: 1,
  anioDeNumero: 0,
  beneficiarioId: 'b1',
  beneficiario: 'Ana',
  esEmpleado: true,
  beneficiarioUsuarioId: null,
  clase: 'viatico',
  descripcion: 'Viaje',
  localidadId: null,
  fecha: '2026-10-01',
  fechaLimite: '2026-10-31',
  montoCentavos: 100_000,
  forma: 'cheque',
  movimientoId: 'm1',
  motivoConVencidos: null,
  estado: 'abierto',
  fechaDeLiquidacion: null,
  devueltoCentavos: 0,
  movimientoDeDevolucionId: null,
  reembolsadoCentavos: 0,
  movimientoDeReembolsoId: null,
  noLiquidadoCentavos: 0,
  destinoDeNoLiquidado: null,
  cuotas: null,
  motivoDeNoLiquidado: null,
  fechaDeAnulacion: null,
  motivoDeAnulacion: null,
  ...cambios,
});

const fila = (cambios: Partial<Anticipo>, gastadoCentavos = 0): FilaDeAnticipo => ({
  anticipo: anticipo(cambios),
  cuentaBancariaId: 'c1',
  numeroDelDocumento: 7,
  gastadoCentavos,
});

describe('CL-R1: anticipos por liquidar', () => {
  const armar = (filas: FilaDeAnticipo[]) => {
    const pedidos: FiltroDeAnticipos[] = [];
    const reporte = new ReporteDeAnticiposPorLiquidar({
      unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
      reloj: new RelojFijo('2026-12-15'),
      consultas: {
        listar: async (filtro: FiltroDeAnticipos) => {
          pedidos.push(filtro);
          return { filas, total: filas.length, totalPorJustificarCentavos: 0 };
        },
      } as never,
    });
    return { reporte, pedidos };
  };

  it('agrupa por beneficiario, ordena por nombre y calcula antigüedad y tramos', async () => {
    const { reporte, pedidos } = armar([
      fila({ id: 'a1', numero: 1, beneficiarioId: 'b2', beneficiario: 'Beto', fechaLimite: '2026-12-01' }, 20_000),
      fila({ id: 'a2', numero: 2, fechaLimite: '2026-10-01' }, 30_000),
      fila({ id: 'a3', numero: 3, fechaLimite: '2027-01-10', montoCentavos: 50_000 }),
    ]);
    const resultado = await reporte.ejecutar(operador, {});
    expect(pedidos[0]).toMatchObject({ corte: '2026-12-15', vencidos: false, estado: 'todos' });
    expect(resultado.corte).toBe('2026-12-15');
    expect(resultado.beneficiarios.map((b) => b.beneficiario)).toEqual(['Ana', 'Beto']);
    const ana = resultado.beneficiarios[0]!;
    expect(ana).toMatchObject({ cantidad: 2, vencidos: 1, monto: '1500.00', porJustificar: '1200.00' });
    expect(ana.anticipos[0]).toMatchObject({ diasVencido: 75, tramo: 'de_61_a_90', porJustificar: '700.00' });
    expect(ana.anticipos[1]).toMatchObject({ diasVencido: 0, vencido: false, tramo: 'al_dia' });
    expect(resultado.beneficiarios[1]!.anticipos[0]).toMatchObject({ diasVencido: 14, tramo: 'de_1_a_30' });
    expect(resultado.total).toEqual({
      beneficiarios: 2,
      anticipos: 3,
      vencidos: 2,
      monto: '2500.00',
      porJustificar: '2000.00',
      porJustificarVencido: '1500.00',
    });
    expect(resultado.porTramo.map((t) => [t.tramo, t.cantidad])).toEqual([
      ['al_dia', 1],
      ['de_1_a_30', 1],
      ['de_31_a_60', 0],
      ['de_61_a_90', 1],
      ['mas_de_90', 0],
    ]);
  });

  it('pasa el corte, el beneficiario y los vencidos a la lectura', async () => {
    const { reporte, pedidos } = armar([]);
    const resultado = await reporte.ejecutar(operador, {
      corte: '2026-11-30',
      beneficiarioId: 'b9',
      soloVencidos: true,
    });
    expect(pedidos[0]).toMatchObject({ corte: '2026-11-30', beneficiarioId: 'b9', vencidos: true });
    expect(resultado.total).toMatchObject({ anticipos: 0, monto: '0.00', porJustificar: '0.00' });
  });
});

describe('CL-R2: lo no liquidado', () => {
  const armar = (anticipos: Anticipo[]) => {
    const pedidos: FiltroDeNoLiquidado[] = [];
    const reporte = new ReporteDeNoLiquidado({
      unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
      reloj: new RelojFijo('2026-12-15'),
      lecturas: {
        noLiquidados: async (filtro: FiltroDeNoLiquidado) => {
          pedidos.push(filtro);
          return anticipos;
        },
      },
    });
    return { reporte, pedidos };
  };

  const liquidado = (cambios: Partial<Anticipo>) =>
    anticipo({
      estado: 'liquidado',
      fechaDeLiquidacion: '2026-12-10',
      motivoDeNoLiquidado: 'No hubo facturas',
      ...cambios,
    });

  it('muestra los tres destinos con sus subtotales, y la cuota solo al cobrar', async () => {
    const { reporte, pedidos } = armar([
      liquidado({ id: 'a1', noLiquidadoCentavos: 100_000, destinoDeNoLiquidado: 'cobrar', cuotas: 6 }),
      liquidado({ id: 'a2', numero: 2, noLiquidadoCentavos: 25_050, destinoDeNoLiquidado: 'renta_del_trabajo' }),
    ]);
    const resultado = await reporte.ejecutar(operador, {});
    expect(pedidos[0]).toEqual({ desde: '2026-12-01', hasta: '2026-12-15', destino: undefined });
    expect(resultado.grupos.map((g) => [g.destino, g.cantidad, g.monto])).toEqual([
      ['cobrar', 1, '1000.00'],
      ['renta_del_trabajo', 1, '250.50'],
      ['perdida', 0, '0.00'],
    ]);
    expect(resultado.grupos[0]!.filas[0]).toMatchObject({ cuotas: 6, valorDeCuota: '166.66' });
    expect(resultado.grupos[1]!.filas[0]).toMatchObject({ cuotas: null, valorDeCuota: null });
    expect(resultado.total).toEqual({ cantidad: 2, monto: '1250.50' });
  });

  it('con un destino pedido, solo ese grupo', async () => {
    const { reporte, pedidos } = armar([]);
    const resultado = await reporte.ejecutar(operador, {
      desde: '2026-01-01',
      hasta: '2026-06-30',
      destino: 'perdida',
    });
    expect(pedidos[0]).toEqual({ desde: '2026-01-01', hasta: '2026-06-30', destino: 'perdida' });
    expect(resultado.grupos.map((g) => g.destino)).toEqual(['perdida']);
  });

  it('rechaza un período invertido', async () => {
    const { reporte } = armar([]);
    await expect(reporte.ejecutar(operador, { desde: '2026-12-02', hasta: '2026-12-01' })).rejects.toMatchObject({
      codigo: 'periodo_invertido',
    });
  });
});
