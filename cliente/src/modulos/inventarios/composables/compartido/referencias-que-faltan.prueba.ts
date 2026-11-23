import { describe, expect, it } from 'vitest';
import { avisoDeReferencias } from './referencias-que-faltan';

const puedeCon =
  (...permisos: string[]) =>
  (permiso: string) =>
    permisos.includes(permiso);

describe('avisoDeReferencias', () => {
  it('sin faltantes no avisa nada', () => {
    const puede = puedeCon('inventarios.articulos.ver', 'inventarios.bodegas.ver');
    expect(avisoDeReferencias(puede, ['articulos', 'bodegas'])).toBeNull();
  });

  it('dice qué permiso falta y cómo corregirlo', () => {
    const aviso = avisoDeReferencias(puedeCon('inventarios.articulos.ver'), ['articulos', 'bodegas']);
    expect(aviso).toMatch(/ver las bodegas/);
    expect(aviso).not.toMatch(/ver los artículos/);
    expect(aviso).toMatch(/administra los accesos/);
  });

  it('nombra todos los que faltan', () => {
    expect(avisoDeReferencias(puedeCon(), ['articulos', 'bodegas'])).toMatch(/ver los artículos y ver las bodegas/);
  });
});
