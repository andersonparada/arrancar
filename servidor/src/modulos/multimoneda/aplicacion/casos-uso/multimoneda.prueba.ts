import { describe, expect, it } from 'vitest';
import type { CatalogoDeMonedasDelNucleo, MonedaDelCatalogo } from '../puertos/catalogo-de-monedas.js';
import type { SerieDeTiposDelNucleo, TipoDeLaSerieDto } from '../puertos/serie-de-tipos.js';
import { MonedasDisponibles } from './monedas-disponibles.js';
import { ReporteDeTiposDeCambio } from './reporte-de-tipos-de-cambio.js';

const moneda = (codigo: string, activa: boolean, decimales = 2): MonedaDelCatalogo => ({
  codigo,
  nombre: `Moneda ${codigo}`,
  simbolo: codigo,
  decimales,
  activa,
});

const catalogo = (...monedas: MonedaDelCatalogo[]): CatalogoDeMonedasDelNucleo => ({ listar: async () => monedas });

describe('MonedasDisponibles', () => {
  it('da las activas y deja fuera el quetzal y las apagadas', async () => {
    const caso = new MonedasDisponibles({
      catalogo: catalogo(moneda('GTQ', true), moneda('USD', true), moneda('EUR', false), moneda('GBP', true)),
    });

    const { monedas } = await caso.ejecutar();

    expect(monedas.map((m) => m.codigo)).toEqual(['USD', 'GBP']);
  });

  it('solo lleva código, nombre, símbolo y decimales', async () => {
    const caso = new MonedasDisponibles({ catalogo: catalogo(moneda('USD', true)) });

    expect((await caso.ejecutar()).monedas[0]).toEqual({
      codigo: 'USD',
      nombre: 'Moneda USD',
      simbolo: 'USD',
      decimales: 2,
    });
  });

  it('sin monedas activas da una lista vacía', async () => {
    const caso = new MonedasDisponibles({ catalogo: catalogo(moneda('GTQ', true)) });

    expect(await caso.ejecutar()).toEqual({ monedas: [] });
  });
});

describe('ReporteDeTiposDeCambio', () => {
  const tipo = (fecha: string, origen: 'banguat' | 'manual' = 'banguat'): TipoDeLaSerieDto => ({
    fecha,
    moneda: 'EUR',
    referencia: '9.1',
    compra: '1.18',
    venta: '1.18',
    convencion: origen === 'banguat' ? 'usd_por_unidad' : null,
    dolarUsado: origen === 'banguat' ? '7.7' : null,
    origen,
  });

  it('devuelve la serie pedida con la leyenda de la fuente', async () => {
    const pedidos: string[][] = [];
    const serie: SerieDeTiposDelNucleo = {
      serie: async (moneda, desde, hasta) => {
        pedidos.push([moneda, desde, hasta]);
        return [tipo('2026-11-16'), tipo('2026-11-17', 'manual')];
      },
    };

    const reporte = await new ReporteDeTiposDeCambio({ serie }).ejecutar({
      moneda: 'EUR',
      desde: '2026-11-01',
      hasta: '2026-11-30',
    });

    expect(pedidos).toEqual([['EUR', '2026-11-01', '2026-11-30']]);
    expect(reporte).toMatchObject({ moneda: 'EUR', fuente: 'Banco de Guatemala' });
    expect(reporte.filas.map((f) => f.origen)).toEqual(['banguat', 'manual']);
  });

  it('una moneda sin serie da el reporte vacío, no un error', async () => {
    const reporte = await new ReporteDeTiposDeCambio({ serie: { serie: async () => [] } }).ejecutar({
      moneda: 'JPY',
      desde: '2026-11-01',
      hasta: '2026-11-30',
    });

    expect(reporte.filas).toEqual([]);
  });
});
