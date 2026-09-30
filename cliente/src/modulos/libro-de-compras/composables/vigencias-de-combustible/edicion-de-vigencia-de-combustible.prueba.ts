import { describe, expect, it } from 'vitest';
import type { DatosVigenciaDeCombustible, VigenciaDeCombustible } from '../../servicios/vigencias-de-combustible.api';
import { datosDeVigenciaDeCombustible, edicionDe } from './edicion-de-vigencia-de-combustible';

const datos: DatosVigenciaDeCombustible = {
  combustibleId: '00000000-0000-4000-8000-000000000001',
  idpPorGalon: '12.50',
  porcentajeDeEtanol: '12.50',
  vigenteDesde: '2026-01-15',
  vigenteHasta: '2026-01-15',
};
const vigenciaDeCombustible: VigenciaDeCombustible = { id: 'registro-1', ...datos, combustibleNombre: null };

describe('ventana de vigencias de combustible', () => {
  it('lo que se abre para editar se manda igual si no se cambia nada', () => {
    expect(datosDeVigenciaDeCombustible(edicionDe(vigenciaDeCombustible))).toEqual(datos);
    expect(edicionDe(vigenciaDeCombustible).id).toBe(vigenciaDeCombustible.id);
  });

  it('un registro nuevo empieza sin id', () => {
    expect(edicionDe()).toMatchObject({ abierta: true, id: null });
  });

  it('lo que no se llena se manda como null', () => {
    expect(datosDeVigenciaDeCombustible(edicionDe())).toMatchObject({ vigenteHasta: null });
  });
});
