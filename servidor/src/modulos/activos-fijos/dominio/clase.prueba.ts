import { describe, expect, it } from 'vitest';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { Clase, ClaseInvalido, type DatosDeClase } from './clase.js';
import { CLASES_SUGERIDAS } from './clases-iniciales.js';
import { ClaseConPorcentajeSobreElMaximo } from './errores.js';
import { INCISOS_FISCALES, esTerreno } from './incisos-fiscales.js';

const empresaId = Identificador.nuevo<'Empresa'>();
const tope = { porcentajeMaximo: 20 };

const datos = (cambios: Partial<DatosDeClase> = {}): DatosDeClase => ({
  nombre: 'Vehículos',
  incisoFiscal: 'maquinaria_y_vehiculos',
  porcentajeFiscal: '20.00',
  vidaUtilContableMeses: null,
  valorResidualPorcentaje: '0.00',
  activo: true,
  ...cambios,
});

describe('Clase', () => {
  it('recorta el nombre y exige que no quede vacío ni pase de 80 caracteres', () => {
    expect(Clase.crear(empresaId, datos({ nombre: '  Vehículos  ' }), tope).instantanea().nombre).toBe('Vehículos');
    expect(() => Clase.crear(empresaId, datos({ nombre: '   ' }), tope)).toThrow(ClaseInvalido);
    expect(() => Clase.crear(empresaId, datos({ nombre: 'x'.repeat(81) }), tope)).toThrow(ClaseInvalido);
  });

  it('acepta el porcentaje igual al máximo de ley y rechaza el que lo pasa, con el máximo en los detalles', () => {
    expect(() => Clase.crear(empresaId, datos({ porcentajeFiscal: '20.00' }), tope)).not.toThrow();
    const error = (() => {
      try {
        Clase.crear(empresaId, datos({ porcentajeFiscal: '20.01' }), tope);
      } catch (e) {
        return e as ClaseConPorcentajeSobreElMaximo;
      }
    })();
    expect(error).toBeInstanceOf(ClaseConPorcentajeSobreElMaximo);
    expect(error?.codigo).toBe('clase_con_porcentaje_sobre_el_maximo');
    expect(error?.detalles).toEqual({ maximo: 20 });
  });

  it('un inciso que se deprecia no puede llevar porcentaje 0 ni pasar de 100', () => {
    expect(() => Clase.crear(empresaId, datos({ porcentajeFiscal: '0.00' }), tope)).toThrow(ClaseInvalido);
    expect(() => Clase.crear(empresaId, datos({ porcentajeFiscal: '100.01' }), { porcentajeMaximo: 100 })).toThrow(
      ClaseInvalido,
    );
  });

  it('los terrenos llevan porcentaje 0 y sin vida útil', () => {
    const terreno = datos({ nombre: 'Terrenos', incisoFiscal: 'terrenos', porcentajeFiscal: '0.00' });
    expect(() => Clase.crear(empresaId, terreno, { porcentajeMaximo: 0 })).not.toThrow();
    expect(() => Clase.crear(empresaId, { ...terreno, porcentajeFiscal: '5.00' }, { porcentajeMaximo: 100 })).toThrow(
      ClaseInvalido,
    );
    expect(() => Clase.crear(empresaId, { ...terreno, vidaUtilContableMeses: 12 }, { porcentajeMaximo: 0 })).toThrow(
      ClaseInvalido,
    );
  });

  it('la vida útil va de 1 a 1200 meses y el valor residual de 0 a 99.99', () => {
    expect(() => Clase.crear(empresaId, datos({ vidaUtilContableMeses: 1200 }), tope)).not.toThrow();
    expect(() => Clase.crear(empresaId, datos({ vidaUtilContableMeses: 0 }), tope)).toThrow(ClaseInvalido);
    expect(() => Clase.crear(empresaId, datos({ vidaUtilContableMeses: 1201 }), tope)).toThrow(ClaseInvalido);
    expect(() => Clase.crear(empresaId, datos({ valorResidualPorcentaje: '99.99' }), tope)).not.toThrow();
    expect(() => Clase.crear(empresaId, datos({ valorResidualPorcentaje: '100.00' }), tope)).toThrow(ClaseInvalido);
  });

  it('al editar vuelve a revisar el máximo de ley', () => {
    const clase = Clase.crear(empresaId, datos(), tope);

    expect(() => clase.cambiarDatos(datos({ porcentajeFiscal: '25.00' }), tope)).toThrow(
      ClaseConPorcentajeSobreElMaximo,
    );
    clase.cambiarDatos(datos({ porcentajeFiscal: '15.00' }), tope);
    expect(clase.instantanea().porcentajeFiscal).toBe('15.00');
  });
});

describe('lista sugerida de clases', () => {
  it('cubre cada inciso, con terrenos en 0 y los demás con porcentaje', () => {
    const incisos = new Set(CLASES_SUGERIDAS.map((clase) => clase.incisoFiscal));

    expect(incisos).toEqual(new Set(INCISOS_FISCALES));
    for (const clase of CLASES_SUGERIDAS)
      expect(Number(clase.porcentajeFiscal) === 0).toBe(esTerreno(clase.incisoFiscal));
  });

  it('tiene las 14 clases del diseño, sin nombres repetidos', () => {
    expect(CLASES_SUGERIDAS).toHaveLength(14);
    expect(new Set(CLASES_SUGERIDAS.map((clase) => clase.nombre)).size).toBe(14);
  });
});
