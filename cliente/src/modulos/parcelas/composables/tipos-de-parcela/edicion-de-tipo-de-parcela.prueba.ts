import { describe, expect, it } from 'vitest';
import type { DatosTipoDeParcela, TipoDeParcela } from '../../servicios/tipos-de-parcela.api';
import { datosDeTipoDeParcela, edicionDe } from './edicion-de-tipo-de-parcela';

const datos: DatosTipoDeParcela = {
  nombre: 'Registro de prueba',
  activo: true,
};
const tipoDeParcela: TipoDeParcela = { id: 'registro-1', ...datos };

describe('ventana de tipos de parcela', () => {
  it('lo que se abre para editar se manda igual si no se cambia nada', () => {
    expect(datosDeTipoDeParcela(edicionDe(tipoDeParcela))).toEqual(datos);
    expect(edicionDe(tipoDeParcela).id).toBe(tipoDeParcela.id);
  });

  it('un registro nuevo empieza sin id', () => {
    expect(edicionDe()).toMatchObject({ abierta: true, id: null });
  });
});
