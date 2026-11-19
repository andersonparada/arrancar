import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { CargaInicial, EntradaDelHistorial } from '../servicios/cierre-de-carga.tipos';
import {
  lineaDelHistorial,
  textoDeAvisosDelCierre,
  textoDelUltimoCierre,
  ultimoCierreDelHistorial,
} from './resumen-de-cierre';

// Las fechas y los montos dan formato con la sesión (Pinia).
beforeEach(() => setActivePinia(createPinia()));

const cerrada = (ultimoCierre: CargaInicial['ultimoCierre'], cambios: Partial<CargaInicial> = {}): CargaInicial => ({
  empresaId: 'e1',
  fechaDeInicio: '2026-01-01',
  cerrada: true,
  cerradaEn: '2026-11-18T15:00:00Z',
  cerradaPor: 'Ana Pérez',
  ultimoCierre,
  balanceDeApertura: null,
  ...cambios,
});
const cierre = (cambios: Partial<NonNullable<CargaInicial['ultimoCierre']>> = {}) => ({
  diferencias: 0,
  avisos: 0,
  motivo: null,
  revisionGuardada: true,
  ...cambios,
});

describe('textoDelUltimoCierre', () => {
  it('con varias diferencias y motivo', () => {
    expect(textoDelUltimoCierre(cerrada(cierre({ diferencias: 3, motivo: 'Falta el estado de cuenta' })))).toBe(
      'Cerrada el 18/11/2026 por Ana Pérez, con 3 diferencias: Falta el estado de cuenta',
    );
  });

  it('con una diferencia, en singular', () => {
    expect(textoDelUltimoCierre(cerrada(cierre({ diferencias: 1, motivo: 'x' })))).toContain('con 1 diferencia: x');
  });

  it('sin diferencias y sin motivo termina en punto', () => {
    expect(textoDelUltimoCierre(cerrada(cierre()))).toBe('Cerrada el 18/11/2026 por Ana Pérez, sin diferencias.');
  });

  it('sin diferencias pero con motivo lo muestra', () => {
    expect(textoDelUltimoCierre(cerrada(cierre({ motivo: 'Todo conciliado' })))).toBe(
      'Cerrada el 18/11/2026 por Ana Pérez, sin diferencias: Todo conciliado',
    );
  });

  it('antes de que se guardara la revisión lo dice y no inventa cifras', () => {
    const texto = textoDelUltimoCierre(cerrada(cierre({ revisionGuardada: false })));
    expect(texto).toBe('Cerrada el 18/11/2026 por Ana Pérez (antes de que se guardara la revisión).');
    expect(textoDelUltimoCierre(cerrada(null))).toContain('antes de que se guardara la revisión');
  });

  it('sin nombre de quien cerró no dice «por»', () => {
    expect(textoDelUltimoCierre(cerrada(cierre(), { cerradaPor: null }))).toBe(
      'Cerrada el 18/11/2026, sin diferencias.',
    );
  });

  it('abierta no hay línea', () => {
    expect(textoDelUltimoCierre(cerrada(null, { cerrada: false, cerradaEn: null }))).toBeNull();
  });
});

describe('sin permiso para ver los cierres (el servidor no manda el motivo ni los avisos)', () => {
  const sinDetalle = cerrada(cierre({ diferencias: 2, avisos: null, motivo: null }));

  it('la línea queda con las diferencias y sin motivo', () => {
    expect(textoDelUltimoCierre(sinDetalle)).toBe('Cerrada el 18/11/2026 por Ana Pérez, con 2 diferencias.');
  });

  it('no dice nada de los avisos', () => {
    expect(textoDeAvisosDelCierre(sinDetalle)).toBe('');
  });
});

describe('textoDeAvisosDelCierre', () => {
  it('dice cuántos avisos quedaron', () => {
    expect(textoDeAvisosDelCierre(cerrada(cierre({ avisos: 1 })))).toBe('Además quedó 1 aviso.');
    expect(textoDeAvisosDelCierre(cerrada(cierre({ avisos: 4 })))).toBe('Además quedaron 4 avisos.');
    expect(textoDeAvisosDelCierre(cerrada(cierre()))).toBe('');
    expect(textoDeAvisosDelCierre(cerrada(null))).toBe('');
  });
});

describe('lineaDelHistorial', () => {
  const entrada = (cambios: Partial<EntradaDelHistorial>): EntradaDelHistorial => ({
    id: 'a1',
    accion: 'cerrar',
    fecha: '2026-11-18T15:00:00Z',
    porNombre: 'Ana Pérez',
    motivo: null,
    diferencias: 0,
    avisos: 0,
    ...cambios,
  });

  it('un cierre cuenta diferencias y avisos y se puede abrir', () => {
    const linea = lineaDelHistorial(entrada({ diferencias: 2, avisos: 1, motivo: 'Pendiente' }));
    expect(linea).toMatchObject({
      titulo: 'Cierre',
      detalle: '2 diferencias, 1 aviso',
      motivo: 'Pendiente',
      conRevision: true,
    });
    expect(linea.cuando).toContain('Ana Pérez');
  });

  it('un cierre limpio dice sin diferencias', () => {
    expect(lineaDelHistorial(entrada({})).detalle).toBe('sin diferencias');
  });

  it('reapertura y balance quitado no tienen revisión que abrir', () => {
    expect(
      lineaDelHistorial(entrada({ accion: 'reabrir', motivo: 'Error', diferencias: null, avisos: null })),
    ).toMatchObject({
      titulo: 'Reapertura',
      detalle: null,
      conRevision: false,
    });
    expect(lineaDelHistorial(entrada({ accion: 'quitar', porNombre: null })).titulo).toBe(
      'Balance de apertura quitado',
    );
    expect(lineaDelHistorial(entrada({ accion: 'adjuntar' }))).toMatchObject({
      titulo: 'Balance de apertura adjuntado',
      detalle: null,
      conRevision: false,
    });
  });
});

describe('ultimoCierreDelHistorial', () => {
  const de = (id: string, accion: EntradaDelHistorial['accion']): EntradaDelHistorial => ({
    id,
    accion,
    fecha: '2026-11-18T15:00:00Z',
    porNombre: null,
    motivo: null,
    diferencias: null,
    avisos: null,
  });

  it('toma el primer cierre, que es el más nuevo, saltando reaperturas', () => {
    expect(ultimoCierreDelHistorial([de('r', 'reabrir'), de('c2', 'cerrar'), de('c1', 'cerrar')])?.id).toBe('c2');
  });

  it('sin cierres no hay nada', () => {
    expect(ultimoCierreDelHistorial([de('r', 'reabrir')])).toBeNull();
    expect(ultimoCierreDelHistorial([])).toBeNull();
  });
});
