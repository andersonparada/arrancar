import { describe, expect, it } from 'vitest';
import type { DatosBodega, Bodega } from '../../servicios/bodegas.api';
import { datosDeBodega, edicionDe, mensajeDeEliminacion } from './edicion-de-bodega';

const datos: DatosBodega = {
  codigo: 'BOD-1',
  nombre: 'Bodega principal',
  localidadId: 'loc-1',
  responsable: 'Doña Marta',
  responsableUsuarioId: 'usr-1',
  activo: true,
};
const bodega: Bodega = { id: 'bodega-1', localidadNombre: 'Finca Norte', ...datos };

describe('edición de bodegas', () => {
  it('lo que se abre para editar se manda igual si no se cambia nada', () => {
    expect(datosDeBodega(edicionDe(bodega))).toEqual(datos);
    expect(edicionDe(bodega).id).toBe(bodega.id);
  });

  it('una bodega nueva empieza sin id, activa y sin localidad', () => {
    expect(edicionDe()).toMatchObject({ abierta: true, id: null, activo: true, localidadId: null });
  });

  it('lo que no se llena se manda como null', () => {
    expect(datosDeBodega(edicionDe())).toMatchObject({ responsable: null, localidadId: null });
  });

  it('el mensaje de eliminar nombra la bodega y manda a inactivar si ya se usó', () => {
    const mensaje = mensajeDeEliminacion('Bodega principal');
    expect(mensaje).toContain('«Bodega principal»');
    expect(mensaje).toContain('inactívela');
  });
});
