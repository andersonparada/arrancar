import { describe, expect, it } from 'vitest';
import type { ConceptoDeIngreso } from '../../servicios/conceptos-de-ingreso.api';
import { datosParaCambiarEstado, esDeSistema } from './reglas-de-concepto-de-ingreso';

const concepto: ConceptoDeIngreso = {
  id: 'c1',
  nombre: 'Venta de bienes',
  tipo: 'bien',
  claveDeSistema: null,
  activo: true,
};

describe('reglas de los conceptos de ingreso', () => {
  it('inactivar manda el mismo concepto con activo invertido y sin id ni clave', () => {
    expect(datosParaCambiarEstado(concepto)).toEqual({ nombre: 'Venta de bienes', tipo: 'bien', activo: false });
    expect(datosParaCambiarEstado({ ...concepto, activo: false }).activo).toBe(true);
  });

  it('el concepto de sistema se reconoce por su clave', () => {
    expect(esDeSistema(concepto)).toBe(false);
    expect(esDeSistema({ ...concepto, claveDeSistema: 'venta_de_activo_fijo' })).toBe(true);
  });
});
