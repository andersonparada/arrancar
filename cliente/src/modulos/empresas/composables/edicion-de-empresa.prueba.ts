import { describe, expect, it } from 'vitest';
import { datosDeLaEmpresa, edicionDe } from './edicion-de-empresa';

describe('edición de empresa con secciones de otros módulos', () => {
  it('una edición nueva empieza sin secciones', () => {
    expect(edicionDe().secciones).toEqual({});
  });

  it('envía solo las secciones que ya tienen valor', () => {
    const edicion = edicionDe();
    edicion.secciones = { 'libro-de-compras': { regimenIva: 'general' }, otro: undefined };
    expect(datosDeLaEmpresa(edicion).secciones).toEqual({ 'libro-de-compras': { regimenIva: 'general' } });
  });
});
