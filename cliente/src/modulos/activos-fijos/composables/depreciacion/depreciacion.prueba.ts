import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Cierre, Hallazgo } from '../../servicios/depreciacion.api';
import type { TramoDeActivo } from '../../servicios/activos.api';
import {
  activosDelHallazgo,
  cierresRecientesPrimero,
  contarHallazgos,
  detallesDeCierre,
  hallazgosOrdenados,
  mesReabrible,
  nombreDelMes,
  resumenDeCierre,
} from './logica-de-cierre';
import { detallesDeTramo, nombreDeCausa, tramosDelLibro } from './tramos-de-activo';
import { textoDeReapertura } from './usar-reapertura-de-mes';

beforeEach(() => setActivePinia(createPinia()));

const cierre = (periodo: string, estado: Cierre['estado'] = 'cerrado'): Cierre => ({
  periodo,
  estado,
  cerradoEn: '2026-04-02T15:00:00.000Z',
  cerradoPor: 'Ana',
  reabiertoEn: null,
  reabiertoPor: null,
  motivoDeReapertura: null,
  regimenIsr: null,
  totalContable: '1500.00',
  totalFiscal: '2000.00',
  activosDepreciados: 3,
});

const hallazgo = (cambios: Partial<Hallazgo> = {}): Hallazgo => ({
  nivel: 'aviso',
  codigo: 'x',
  mensaje: 'Algo',
  cantidad: 1,
  detalle: [],
  ...cambios,
});

describe('meses y cierres', () => {
  it('lee el mes por su nombre', () => {
    expect(nombreDelMes('2026-03-01')).toBe('Marzo 2026');
    expect(nombreDelMes('2026-12-01')).toBe('Diciembre 2026');
    expect(nombreDelMes('raro')).toBe('raro');
  });

  it('ordena del más reciente al más antiguo sin tocar la lista original', () => {
    const lista = [cierre('2026-01-01'), cierre('2026-03-01'), cierre('2026-02-01')];
    expect(cierresRecientesPrimero(lista).map((c) => c.periodo)).toEqual(['2026-03-01', '2026-02-01', '2026-01-01']);
    expect(lista[0]?.periodo).toBe('2026-01-01');
  });

  it('solo ofrece reabrir el último cerrado, sin contar los reabiertos', () => {
    expect(mesReabrible([])).toBeNull();
    expect(mesReabrible([cierre('2026-01-01'), cierre('2026-02-01')])).toBe('2026-02-01');
    expect(mesReabrible([cierre('2026-01-01'), cierre('2026-02-01', 'reabierto')])).toBe('2026-01-01');
  });

  it('el texto de reapertura dice el mes y que se reabre de uno en uno', () => {
    expect(textoDeReapertura('2026-02-01')).toContain('Febrero 2026');
    expect(textoDeReapertura('2026-02-01')).toContain('reabrir primero este');
  });

  it('muestra la reapertura solo en los meses reabiertos', () => {
    expect(detallesDeCierre(cierre('2026-01-01')).map((d) => d.etiqueta)).not.toContain('Reabierto');
    const reabierto = { ...cierre('2026-01-01', 'reabierto'), reabiertoPor: 'Luis', motivoDeReapertura: 'Error' };
    expect(detallesDeCierre(reabierto).map((d) => d.etiqueta)).toContain('Motivo de la reapertura');
  });
});

describe('hallazgos de la revisión', () => {
  it('pone primero los que bloquean', () => {
    const orden = hallazgosOrdenados([hallazgo({ codigo: 'a' }), hallazgo({ codigo: 'b', nivel: 'bloquea' })]);
    expect(orden.map((h) => h.codigo)).toEqual(['b', 'a']);
  });

  it('cuenta bloqueos y avisos', () => {
    const lista = [hallazgo(), hallazgo({ nivel: 'bloquea' }), hallazgo()];
    expect(contarHallazgos(lista)).toEqual({ bloqueos: 1, avisos: 2 });
  });

  it('nombra los activos afectados y cuántos faltan', () => {
    expect(activosDelHallazgo(hallazgo())).toBe('');
    expect(activosDelHallazgo(hallazgo({ cantidad: 2, detalle: ['AF-1', 'AF-2'] }))).toBe('AF-1, AF-2');
    const muchos = Array.from({ length: 8 }, (_, i) => `AF-${i}`);
    expect(activosDelHallazgo(hallazgo({ cantidad: 12, detalle: muchos }))).toContain('y 4 más');
  });

  it('resume lo que va a pasar al cerrar', () => {
    const totales = { contable: '1500.00', fiscal: '2000.00', activosDepreciados: 3 };
    expect(resumenDeCierre({ periodo: '2026-03-01', totales })).toContain('3 activos en Marzo 2026');
    const uno = { ...totales, activosDepreciados: 1 };
    expect(resumenDeCierre({ periodo: '2026-03-01', totales: uno })).toContain('1 activo en');
    const ninguno = { ...totales, activosDepreciados: 0 };
    expect(resumenDeCierre({ periodo: '2026-03-01', totales: ninguno })).toContain('sin cuotas');
  });
});

describe('tramos de la ficha', () => {
  const tramo = (cambios: Partial<TramoDeActivo> = {}): TramoDeActivo => ({
    libro: 'contable',
    desdePeriodo: '2026-01-01',
    causa: 'inicio_de_uso',
    porDepreciar: '12000.00',
    valorResidual: '0.00',
    meses: 60,
    porcentaje: null,
    baseDelPorcentaje: null,
    cuotaMensual: '200.00',
    excesoDeNotaDeCredito: '0.00',
    ...cambios,
  });

  it('separa por libro y ordena por mes', () => {
    const tramos = [tramo({ desdePeriodo: '2026-06-01', causa: 'mejora' }), tramo({ libro: 'fiscal' }), tramo()];
    expect(tramosDelLibro(tramos, 'contable').map((t) => t.causa)).toEqual(['inicio_de_uso', 'mejora']);
    expect(tramosDelLibro(tramos, 'fiscal')).toHaveLength(1);
  });

  it('el contable muestra meses y el fiscal, porcentaje sobre su base', () => {
    expect(detallesDeTramo(tramo()).find((d) => d.etiqueta === 'Vida útil')?.valor).toBe('60 meses');
    const fiscal = tramo({ libro: 'fiscal', meses: null, porcentaje: '20.00', baseDelPorcentaje: '12000.00' });
    expect(detallesDeTramo(fiscal).find((d) => d.etiqueta === 'Porcentaje anual')?.valor).toContain('20.00 %');
  });

  it('el exceso de nota de crédito solo aparece si lo hay', () => {
    expect(detallesDeTramo(tramo()).map((d) => d.etiqueta)).not.toContain('Exceso por nota de crédito');
    const con = tramo({ excesoDeNotaDeCredito: '50.00' });
    expect(detallesDeTramo(con).map((d) => d.etiqueta)).toContain('Exceso por nota de crédito');
  });

  it('nombra la causa del tramo', () => {
    expect(nombreDeCausa('saldo_inicial')).toBe('Saldo inicial');
  });
});
