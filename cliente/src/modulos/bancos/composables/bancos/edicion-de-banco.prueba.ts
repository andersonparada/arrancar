import { describe, expect, it } from 'vitest';
import type { DatosBanco, Banco } from '../../servicios/bancos.api';
import { datosDeBanco, edicionDe } from './edicion-de-banco';

const datos: DatosBanco = {
  nombre: 'Registro de prueba',
  observaciones: 'Una nota de prueba.',
  activo: true,
};
const banco: Banco = { id: 'registro-1', ...datos };

describe('ventana de bancos', () => {
  it('lo que se abre para editar se manda igual si no se cambia nada', () => {
    expect(datosDeBanco(edicionDe(banco))).toEqual(datos);
    expect(edicionDe(banco).id).toBe(banco.id);
  });

  it('un registro nuevo empieza sin id', () => {
    expect(edicionDe()).toMatchObject({ abierta: true, id: null });
  });

  it('lo que no se llena se manda como null', () => {
    expect(datosDeBanco(edicionDe())).toMatchObject({ observaciones: null });
  });
});
