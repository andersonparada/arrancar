import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import type { ConstanciaPendiente, ConstanciasPendientes } from '../../servicios/constancias-pendientes.api';
import {
  bloquesDePendientes,
  cantidadDeFiltrosDePendientes,
  cifrasDePendientes,
  consultaDePendientes,
  estadoDelEnteroDeLaFila,
  filtrosDePendientesIniciales,
  lineasDeImpresionDePendientes,
  retenidoDeAnuladas,
  textoDeDias,
  textoDelPlazoDeLaConstancia,
  tonoDelPlazoDeLaConstancia,
} from './datos-de-constancias-pendientes';
import { retencion } from './retenciones.soporte';

function pendiente(cambios: Partial<ConstanciaPendiente> = {}): ConstanciaPendiente {
  return {
    mes: '2026-09-01',
    grupo: 'iva_agentes',
    nombreDelGrupo: 'IVA retenido como agente',
    plazoDelGrupo: '2026-10-15',
    diasParaElPlazo: -3,
    plazoVencido: true,
    enterado: false,
    plazoDeLaConstancia: null,
    diasParaLaConstancia: null,
    constanciaVencida: false,
    notaDelPlazo: 'Sin plazo propio confirmado',
    retencion: retencion(),
    ...cambios,
  };
}

const reporte = (cambios: Partial<ConstanciasPendientes> = {}): ConstanciasPendientes => ({
  hasta: '2026-11-01',
  hoy: '2026-11-15',
  filtros: { grupo: null, proveedorId: null },
  pendientes: [],
  anuladas: [],
  totales: [],
  total: { cantidad: 0, retenido: '0.00' },
  ...cambios,
});

describe('filtros de las constancias pendientes', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('no manda lo vacío y cuenta lo que se sale de lo normal', () => {
    const filtros = filtrosDePendientesIniciales('2026-11');
    expect(consultaDePendientes(filtros)).toEqual({ hasta: '2026-11', grupo: undefined, proveedorId: undefined });
    expect(cantidadDeFiltrosDePendientes(filtros, '2026-11')).toBe(0);
    const cambiados = { hasta: '2026-09', grupo: 'isr_opcional' as const, proveedorId: 'p1' };
    expect(cantidadDeFiltrosDePendientes(cambiados, '2026-11')).toBe(3);
    expect(consultaDePendientes(cambiados).grupo).toBe('isr_opcional');
  });

  it('describe los filtros para el papel', () => {
    const filtros = { hasta: '2026-10', grupo: 'isr_opcional' as const, proveedorId: 'p1' };
    expect(lineasDeImpresionDePendientes(filtros, 'Ferretería La Paz')).toEqual([
      'Retenciones sin constancia hasta Octubre de 2026',
      'Grupo: ISR opcional simplificado',
      'Proveedor: Ferretería La Paz',
    ]);
    expect(lineasDeImpresionDePendientes(filtrosDePendientesIniciales('2026-10'), null)).toHaveLength(1);
  });
});

describe('textos de plazos', () => {
  it('dice los días con singular y plural', () => {
    expect(textoDeDias(-1, true)).toBe('Vencido hace 1 día');
    expect(textoDeDias(-5, true, 'Vencida')).toBe('Vencida hace 5 días');
    expect(textoDeDias(0, false)).toBe('Vence hoy');
    expect(textoDeDias(1, false)).toBe('Falta 1 día');
    expect(textoDeDias(4, false)).toBe('Faltan 4 días');
  });

  it('el ISR trae fecha y estado; el IVA, la nota de que no tiene plazo propio', () => {
    const isr = pendiente({ plazoDeLaConstancia: '2026-11-06', diasParaLaConstancia: 2, retencion: retencion() });
    expect(textoDelPlazoDeLaConstancia(isr).estado).toBe('Faltan 2 días');
    expect(textoDelPlazoDeLaConstancia(isr).fecha).not.toBe('');
    const iva = textoDelPlazoDeLaConstancia(pendiente());
    expect(iva).toEqual({ fecha: '', estado: 'Sin plazo propio confirmado' });
    expect(textoDelPlazoDeLaConstancia(pendiente({ notaDelPlazo: null })).estado).toBe('Sin plazo propio confirmado');
  });

  it('el tono avisa del vencimiento y de lo que está por vencer', () => {
    expect(tonoDelPlazoDeLaConstancia(pendiente({ constanciaVencida: true, diasParaLaConstancia: -2 }))).toBe('rojo');
    expect(tonoDelPlazoDeLaConstancia(pendiente({ diasParaLaConstancia: 3 }))).toBe('trigo');
    expect(tonoDelPlazoDeLaConstancia(pendiente({ diasParaLaConstancia: 10 }))).toBe('tierra');
    expect(tonoDelPlazoDeLaConstancia(pendiente())).toBe('tierra');
  });

  it('el entero se lee como enterado, vencido o pendiente', () => {
    expect(estadoDelEnteroDeLaFila({ enterado: true, plazoVencido: true }).texto).toBe('Enterado');
    expect(estadoDelEnteroDeLaFila({ enterado: false, plazoVencido: true }).tono).toBe('rojo');
    expect(estadoDelEnteroDeLaFila({ enterado: false, plazoVencido: false }).texto).toBe('Entero pendiente');
  });
});

describe('bloques y cifras', () => {
  const filas = [
    pendiente({ retencion: retencion({ id: 'a' }) }),
    pendiente({ retencion: retencion({ id: 'b' }) }),
    pendiente({ mes: '2026-10-01', grupo: 'isr_opcional', plazoVencido: false, enterado: true }),
  ];
  const totales = [
    {
      mes: '2026-09-01',
      grupo: 'iva_agentes' as const,
      nombreDelGrupo: 'x',
      plazoDelGrupo: '',
      cantidad: 2,
      retenido: '100.00',
    },
    {
      mes: '2026-10-01',
      grupo: 'isr_opcional' as const,
      nombreDelGrupo: 'y',
      plazoDelGrupo: '',
      cantidad: 1,
      retenido: '40.00',
    },
  ];

  it('junta por mes y grupo con los totales del servidor', () => {
    const bloques = bloquesDePendientes(filas, totales);
    expect(bloques).toHaveLength(2);
    expect(bloques[0]).toMatchObject({ titulo: 'Septiembre de 2026', cantidad: 2, retenido: '100.00' });
    expect(bloques[0]?.filas).toHaveLength(2);
    expect(bloques[1]?.entero.texto).toBe('Enterado');
    expect(bloquesDePendientes([], totales)).toEqual([]);
  });

  it('cuenta constancias vencidas y enteros vencidos sin pagar', () => {
    const cifras = cifrasDePendientes(
      reporte({
        pendientes: [...filas, pendiente({ constanciaVencida: true, grupo: 'isr_opcional' })],
        anuladas: [pendiente()],
        total: { cantidad: 4, retenido: '140.00' },
      }),
    );
    const valor = (etiqueta: string) => cifras.find((c) => c.etiqueta === etiqueta)?.valor;
    expect(valor('Constancias vencidas')).toBe('1');
    expect(valor('Enteros vencidos sin pagar')).toBe('2');
    expect(valor('Anuladas aparte')).toBe('1');
    expect(valor('Retenciones')).toBe('4');
  });

  it('suma lo retenido de las anuladas', () => {
    const anuladas = [pendiente({ retencion: retencion({ retenido: '10.50' }) }), pendiente()];
    expect(retenidoDeAnuladas(anuladas)).toBe('60.50');
    expect(retenidoDeAnuladas([])).toBe('0.00');
  });
});
