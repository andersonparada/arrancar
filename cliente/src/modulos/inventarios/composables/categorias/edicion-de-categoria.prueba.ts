import { describe, expect, it } from 'vitest';
import type { DatosCategoria, Categoria } from '../../servicios/categorias.api';
import { datosDeCategoria, edicionDe } from './edicion-de-categoria';

const datos: DatosCategoria = {
  nombre: 'Registro de prueba',
  tipoDeInventarioPorOmision: 'mercaderia',
  activo: true,
};
const categoria: Categoria = { id: 'registro-1', ...datos };

describe('ventana de categorías', () => {
  it('lo que se abre para editar se manda igual si no se cambia nada', () => {
    expect(datosDeCategoria(edicionDe(categoria))).toEqual(datos);
    expect(edicionDe(categoria).id).toBe(categoria.id);
  });

  it('un registro nuevo empieza sin id', () => {
    expect(edicionDe()).toMatchObject({ abierta: true, id: null });
  });
});
