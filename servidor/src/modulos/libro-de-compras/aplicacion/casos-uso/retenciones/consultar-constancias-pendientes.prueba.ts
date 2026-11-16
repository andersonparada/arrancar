import { describe, expect, it } from 'vitest';
import {
  RelojFijo,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { FuenteDeLunesAViernes } from '../../../dominio/calendario-laboral.js';
import type { RetencionDelReporte } from '../../../dominio/retenciones/retencion-del-reporte.js';
import { ConsultasDeEnterosEnMemoria } from '../../../pruebas/dobles-de-retenciones.js';
import type { ConsultasDeRetenciones } from '../../puertos/puertos-de-retenciones.js';
import { ConsultarConstanciasPendientes } from './consultar-constancias-pendientes.js';

const HOY = '2026-11-10';
const operador = operadorDePrueba();

function retencion(cambios: Partial<RetencionDelReporte> & { anulado?: boolean } = {}): RetencionDelReporte {
  const { anulado, ...resto } = cambios;
  return {
    id: crypto.randomUUID(),
    impuesto: 'iva',
    regla: 'iva_contribuyente_especial',
    base: 10000,
    porcentaje: 1500,
    montoPropuesto: 1500,
    monto: 1500,
    motivoDelAjuste: null,
    fecha: '2026-09-10',
    constancia: null,
    resolucion: null,
    notaDeResolucion: null,
    resueltaEn: null,
    resueltaPor: null,
    documento: {
      id: crypto.randomUUID(),
      estado: anulado ? 'anulado' : 'vigente',
      tipoDte: 'FACT',
      serie: 'A',
      numero: '1',
      autorizacionFel: null,
      fechaEmision: '2026-09-09',
      motivoDeAnulacion: null,
    },
    proveedor: { id: 'p1', nit: '1234567', nombre: 'Proveedor' },
    ...resto,
  };
}

const isr = (fecha: string, cambios: Partial<RetencionDelReporte> = {}) =>
  retencion({ impuesto: 'isr', regla: 'isr_opcional_simplificado', porcentaje: null, monto: 25000, fecha, ...cambios });

function armar(retenciones: RetencionDelReporte[], pagos = new ConsultasDeEnterosEnMemoria()) {
  const consultas = {
    pendientesDeConstancia: async ({ hasta }: { hasta: string }) =>
      retenciones.filter((r) => r.fecha.slice(0, 7) <= hasta.slice(0, 7)),
  } as unknown as ConsultasDeRetenciones;
  return new ConsultarConstanciasPendientes({
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    reloj: new RelojFijo(HOY),
    configuracion: { paraEmpresa: async () => ({ diasHabilesIva: 15, diasHabilesIsr: 10 }) } as never,
    calendario: new FuenteDeLunesAViernes(),
    consultas,
    enteros: pagos as never,
  });
}

describe('constancias pendientes', () => {
  it('junta varios meses y grupos con sus plazos y su total, sin las de documentos anulados', async () => {
    const caso = armar([
      retencion({ fecha: '2026-09-10' }),
      isr('2026-10-15'),
      isr('2026-11-02'),
      retencion({ fecha: '2026-10-05', anulado: true, resolucion: 'pendiente' }),
    ]);

    const reporte = await caso.ejecutar(operador, {});

    expect(reporte.hasta).toBe('2026-11-01');
    expect(reporte.pendientes.map((p) => [p.mes, p.grupo])).toEqual([
      ['2026-09-01', 'iva_agentes'],
      ['2026-10-01', 'isr_opcional'],
      ['2026-11-01', 'isr_opcional'],
    ]);
    expect(reporte.anuladas).toHaveLength(1);
    expect(reporte.totales.map((t) => [t.mes, t.grupo, t.cantidad, t.retenido])).toEqual([
      ['2026-09-01', 'iva_agentes', 1, '15.00'],
      ['2026-10-01', 'isr_opcional', 1, '250.00'],
      ['2026-11-01', 'isr_opcional', 1, '250.00'],
    ]);
    expect(reporte.total).toEqual({ cantidad: 3, retenido: '515.00' });
  });

  it('marca vencido el plazo del entero y calcula los días que faltan', async () => {
    const reporte = await armar([retencion({ fecha: '2026-09-10' }), isr('2026-10-15')]).ejecutar(operador, {});

    const [iva, isrDeOctubre] = reporte.pendientes;
    // IVA de septiembre: el día hábil 15 de octubre es el 21.
    expect(iva).toMatchObject({ plazoDelGrupo: '2026-10-21', plazoVencido: true, enterado: false });
    expect(iva!.diasParaElPlazo).toBeLessThan(0);
    // ISR de octubre: el día hábil 10 de noviembre es el 13.
    expect(isrDeOctubre).toMatchObject({ plazoDelGrupo: '2026-11-13', plazoVencido: false, diasParaElPlazo: 3 });
  });

  it('el plazo de la constancia del ISR son cinco días hábiles y el del IVA no tiene plazo propio', async () => {
    const reporte = await armar([retencion(), isr('2026-10-15'), isr('2026-11-02')]).ejecutar(operador, {});

    const [iva, vencida, vigente] = reporte.pendientes;
    expect(vencida).toMatchObject({ plazoDeLaConstancia: '2026-11-06', constanciaVencida: true });
    expect(vencida!.diasParaLaConstancia).toBe(-4);
    expect(vigente).toMatchObject({ plazoDeLaConstancia: '2026-12-07', constanciaVencida: false });
    expect(iva).toMatchObject({
      plazoDeLaConstancia: null,
      diasParaLaConstancia: null,
      constanciaVencida: false,
      notaDelPlazo: 'Sin plazo propio confirmado',
    });
  });

  it('dice si el mes y grupo ya tiene un entero vigente', async () => {
    const pagos = new ConsultasDeEnterosEnMemoria();
    pagos.agregarVigente('2026-09-01', 'iva_agentes');

    const reporte = await armar([retencion(), isr('2026-10-15')], pagos).ejecutar(operador, {});

    expect(reporte.pendientes.map((p) => p.enterado)).toEqual([true, false]);
  });

  it('filtra por grupo y por el último mes', async () => {
    const caso = armar([retencion(), isr('2026-10-15'), isr('2026-11-02')]);

    const delGrupo = await caso.ejecutar(operador, { grupo: 'isr_opcional' });
    const hastaOctubre = await caso.ejecutar(operador, { hasta: '2026-10' });

    expect(delGrupo.pendientes).toHaveLength(2);
    expect(delGrupo.filtros.grupo).toBe('isr_opcional');
    expect(hastaOctubre.pendientes).toHaveLength(2);
    expect(hastaOctubre.hasta).toBe('2026-10-01');
  });

  it('sin retenciones pendientes devuelve todo vacío', async () => {
    const reporte = await armar([]).ejecutar(operador, {});

    expect(reporte).toMatchObject({
      pendientes: [],
      anuladas: [],
      totales: [],
      total: { cantidad: 0, retenido: '0.00' },
    });
  });
});
