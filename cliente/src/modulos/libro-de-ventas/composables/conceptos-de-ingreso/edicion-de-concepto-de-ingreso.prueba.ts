import { describe, expect, it } from 'vitest';
import type { DatosConceptoDeIngreso, ConceptoDeIngreso } from '../../servicios/conceptos-de-ingreso.api';
import { datosDeConceptoDeIngreso, edicionDe } from './edicion-de-concepto-de-ingreso';

const datos: DatosConceptoDeIngreso = {
  nombre: 'Registro de prueba',
  tipo: 'bien',
  activo: true,
};
const conceptoDeIngreso: ConceptoDeIngreso = { id: 'registro-1', claveDeSistema: null, ...datos };

describe('ventana de conceptos de ingreso', () => {
  it('lo que se abre para editar se manda igual si no se cambia nada', () => {
    expect(datosDeConceptoDeIngreso(edicionDe(conceptoDeIngreso))).toEqual(datos);
    expect(edicionDe(conceptoDeIngreso).id).toBe(conceptoDeIngreso.id);
  });

  it('un registro nuevo empieza sin id', () => {
    expect(edicionDe()).toMatchObject({ abierta: true, id: null });
  });
});
