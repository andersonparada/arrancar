import { describe, expect, it } from 'vitest';
import type { DatosClase, Clase } from '../../servicios/clases.api';
import { datosDeClase, edicionDe } from './edicion-de-clase';

const datos: DatosClase = {
  nombre: 'Registro de prueba',
  incisoFiscal: 'edificios',
  porcentajeFiscal: '12.50',
  vidaUtilContableMeses: 7,
  valorResidualPorcentaje: '12.50',
  activo: true,
};
const clase: Clase = { id: 'registro-1', ...datos };

describe('ventana de clases de activos', () => {
  it('lo que se abre para editar se manda igual si no se cambia nada', () => {
    expect(datosDeClase(edicionDe(clase))).toEqual(datos);
    expect(edicionDe(clase).id).toBe(clase.id);
  });

  it('un registro nuevo empieza sin id', () => {
    expect(edicionDe()).toMatchObject({ abierta: true, id: null });
  });

  it('lo que no se llena se manda como null', () => {
    expect(datosDeClase(edicionDe())).toMatchObject({ vidaUtilContableMeses: null });
  });
});
