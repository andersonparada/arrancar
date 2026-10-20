import { describe, expect, it } from 'vitest';
import type { ControlDePeriodos, PeriodoDelLibro } from '../../servicios/periodos.api';
import {
  accionesDelPeriodo,
  cuerpoDeDeclaracion,
  declaracionVacia,
  estadoVisible,
  mesDelPeriodo,
  nombreDelPeriodo,
  opcionesDeFormulario,
  resumenDeDeclarar,
  resumenDeReabrir,
  textoDelEstado,
} from './datos-de-periodos';

const periodo = (cambios: Partial<PeriodoDelLibro> = {}): PeriodoDelLibro => ({
  periodo: '2026-09-01',
  estado: 'abierto',
  terminado: true,
  declaradoEn: null,
  declaradoPor: null,
  ultimaDeclaracion: null,
  ...cambios,
});
const declaracion = {
  id: 'd1',
  secuencia: 1,
  evento: 'declaracion' as const,
  formulario: 'SAT-2237' as const,
  numeroDeFormulario: '123',
  fechaDePresentacion: '2026-10-05',
  tipoDeLibro: 'completo' as const,
  motivo: null,
  registradaEn: '2026-10-05T10:00:00.000Z',
  registradaPor: { id: 'u1', nombre: 'Ana' },
};
const control = (encendido: boolean): ControlDePeriodos => ({ encendido, actualizadoEn: null, actualizadoPor: null });

describe('estado del período', () => {
  it('distingue declarado, abierto y sin terminar', () => {
    expect(estadoVisible(periodo({ estado: 'declarado' }))).toBe('declarado');
    expect(estadoVisible(periodo())).toBe('abierto');
    expect(estadoVisible(periodo({ terminado: false }))).toBe('sin_terminar');
    expect(textoDelEstado(periodo({ terminado: false }))).toBe('Sin terminar');
  });

  it('un mes declarado se muestra declarado aunque el servidor lo marque sin terminar', () => {
    expect(estadoVisible(periodo({ estado: 'declarado', terminado: false }))).toBe('declarado');
  });

  it('da el mes para la ruta y el nombre para mostrar', () => {
    expect(mesDelPeriodo('2026-09-01')).toBe('2026-09');
    expect(nombreDelPeriodo('2026-09-01')).toBe('Septiembre de 2026');
  });
});

describe('accionesDelPeriodo', () => {
  it('un mes abierto y terminado se puede declarar, no reabrir', () => {
    const acciones = accionesDelPeriodo(periodo(), control(true));
    expect(acciones).toMatchObject({ puedeDeclarar: true, puedeReabrir: false, esRectificacion: false });
  });

  it('un mes sin terminar no se declara y dice por qué', () => {
    const acciones = accionesDelPeriodo(periodo({ terminado: false }), control(true));
    expect(acciones.puedeDeclarar).toBe(false);
    expect(acciones.porQueNoDeclarar).toContain('todavía no termina');
  });

  it('declarado con el bloqueo encendido pide reabrir antes de declarar', () => {
    const declarado = periodo({ estado: 'declarado', ultimaDeclaracion: declaracion });
    const acciones = accionesDelPeriodo(declarado, control(true));
    expect(acciones).toMatchObject({ puedeDeclarar: false, puedeReabrir: true, esRectificacion: true });
    expect(acciones.porQueNoDeclarar).toContain('reábralo');
  });

  it('declarado con el bloqueo apagado se rectifica sin reabrir', () => {
    const declarado = periodo({ estado: 'declarado', ultimaDeclaracion: declaracion });
    expect(accionesDelPeriodo(declarado, control(false))).toMatchObject({
      puedeDeclarar: true,
      puedeReabrir: true,
      esRectificacion: true,
    });
  });

  it('un mes reabierto que ya se declaró antes se declara como rectificación', () => {
    const reabierto = periodo({ ultimaDeclaracion: declaracion });
    expect(accionesDelPeriodo(reabierto, control(true))).toMatchObject({ puedeDeclarar: true, esRectificacion: true });
  });
});

describe('cuerpoDeDeclaracion', () => {
  it('no envía lo que se dejó vacío', () => {
    expect(cuerpoDeDeclaracion(declaracionVacia())).toEqual({});
  });

  it('envía lo escrito sin espacios sobrantes', () => {
    expect(cuerpoDeDeclaracion({ formulario: 'SAT-2046', numero: ' AB12 ', fecha: '2026-10-05' })).toEqual({
      formulario: 'SAT-2046',
      numeroDeFormulario: 'AB12',
      fechaDePresentacion: '2026-10-05',
    });
  });

  it('ofrece primero el formulario del régimen', () => {
    const opciones = opcionesDeFormulario();
    expect(opciones[0]?.valor).toBe('');
    expect(opciones.map((opcion) => opcion.valor)).toContain('sin_formulario');
  });
});

describe('resúmenes', () => {
  it('declarar con el bloqueo encendido avisa que se bloquea', () => {
    const lineas = resumenDeDeclarar(periodo(), control(true), 0);
    expect(lineas[0]).toContain('Septiembre de 2026');
    expect(lineas.join(' ')).toContain('Queda bloqueado');
  });

  it('una rectificación dice cuántas cifras cambian', () => {
    const lineas = resumenDeDeclarar(periodo({ ultimaDeclaracion: declaracion }), control(false), 3);
    expect(lineas[0]).toContain('rectificación');
    expect(lineas.join(' ')).toContain('Cambian 3 cifras');
    expect(lineas.join(' ')).toContain('bloqueo está apagado');
  });

  it('reabrir explica que luego se rectifica', () => {
    expect(resumenDeReabrir(periodo({ estado: 'declarado' }), control(true)).join(' ')).toContain('rectificación');
  });
});
