import { describe, expect, it } from 'vitest';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import {
  ConceptoDeIngreso,
  ConceptoDeIngresoDeSistema,
  ConceptoDeIngresoInvalido,
  type DatosDeConceptoDeIngreso,
} from './concepto-de-ingreso.js';
import { CONCEPTOS_DE_INGRESO_SUGERIDOS } from './conceptos-de-ingreso-iniciales.js';

const empresaId = Identificador.nuevo<'Empresa'>();

const datos = (cambios: Partial<DatosDeConceptoDeIngreso> = {}): DatosDeConceptoDeIngreso => ({
  nombre: 'Venta de bienes',
  tipo: 'bien',
  activo: true,
  ...cambios,
});

describe('ConceptoDeIngreso', () => {
  it('recorta el nombre y exige que no quede vacío', () => {
    expect(ConceptoDeIngreso.crear(empresaId, datos({ nombre: '  Servicios  ' })).instantanea().nombre).toBe(
      'Servicios',
    );
    expect(() => ConceptoDeIngreso.crear(empresaId, datos({ nombre: '   ' }))).toThrow(ConceptoDeIngresoInvalido);
  });

  it('un concepto común se edita y se inactiva', () => {
    const concepto = ConceptoDeIngreso.crear(empresaId, datos());

    concepto.cambiarDatos(datos({ nombre: 'Otro nombre', activo: false }));

    expect(concepto.instantanea()).toMatchObject({ nombre: 'Otro nombre', activo: false, claveDeSistema: null });
  });

  it('el concepto de sistema no se edita, no se inactiva y no se elimina', () => {
    const sistema = ConceptoDeIngreso.crear(
      empresaId,
      datos({ nombre: 'Venta de activo fijo' }),
      'venta_de_activo_fijo',
    );

    expect(() => sistema.cambiarDatos(datos({ activo: false }))).toThrow(ConceptoDeIngresoDeSistema);
    expect(() => sistema.exigirQueNoSeaDeSistema()).toThrow(ConceptoDeIngresoDeSistema);
  });
});

describe('lista sugerida', () => {
  it('trae los cuatro conceptos del diseño, sin rubro, con solo uno de sistema', () => {
    const nombres = CONCEPTOS_DE_INGRESO_SUGERIDOS.map(({ datos: d }) => d.nombre);

    expect(nombres).toEqual(['Venta de bienes', 'Prestación de servicios', 'Venta de activo fijo', 'Otros ingresos']);
    expect(CONCEPTOS_DE_INGRESO_SUGERIDOS.filter((c) => c.claveDeSistema !== null)).toHaveLength(1);
  });
});
