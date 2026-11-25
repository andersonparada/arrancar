import { describe, expect, it } from 'vitest';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { Cuenta, type DatosDeCuenta } from './cuenta.js';
import { CodigoFueraDeLaMascara, CuentaInvalida, CuentaNoEsDeDetalle } from './errores.js';
import { MascaraDeCuentas } from './mascara-de-cuentas.js';
import { RUBROS, tipoDelRubro, admiteCorriente } from './rubros.js';

const empresa = Identificador.nuevo<'Empresa'>();
const mascara = MascaraDeCuentas.desde('9.9.99.99.999');

const datos = (cambios: Partial<DatosDeCuenta> = {}): DatosDeCuenta => ({
  codigo: '1',
  nombre: 'Activo',
  esDeDetalle: false,
  naturaleza: 'deudora',
  tipo: 'balance',
  rubro: null,
  corriente: false,
  claseDeFlujo: null,
  esMonetaria: false,
  pideTercero: false,
  pideCentroDeCosto: false,
  esDeControl: false,
  tratamientoFiscal: 'no_aplica',
  activo: true,
  ...cambios,
});

const raiz = () => Cuenta.crear(empresa, datos(), { mascara, padre: null });
const detalle = (cambios: Partial<DatosDeCuenta> = {}): DatosDeCuenta =>
  datos({ codigo: '1.1', nombre: 'Caja', esDeDetalle: true, rubro: 'efectivo', claseDeFlujo: 'efectivo', ...cambios });

describe('Cuenta: ubicación', () => {
  it('una cuenta de primer nivel no lleva cuenta superior', () => {
    const cuenta = raiz();

    expect(cuenta.instantanea()).toMatchObject({ nivel: 1, padreId: null, codigo: '1' });
  });

  it('una de segundo nivel cuelga de la que lleva su código sin el último grupo', () => {
    const padre = raiz();

    const hija = Cuenta.crear(empresa, detalle(), { mascara, padre });

    expect(hija.instantanea()).toMatchObject({ nivel: 2, padreId: padre.id });
  });

  it('rechaza un código fuera de la máscara', () => {
    const fuera = () => Cuenta.crear(empresa, datos({ codigo: '1.1.1' }), { mascara, padre: null });

    expect(fuera).toThrow(CodigoFueraDeLaMascara);
  });

  it('exige la cuenta superior cuando el código la pide', () => {
    expect(() => Cuenta.crear(empresa, detalle(), { mascara, padre: null })).toThrow(CuentaInvalida);
  });

  it('rechaza una cuenta superior que no corresponde al código', () => {
    const otra = Cuenta.crear(empresa, datos({ codigo: '2', nombre: 'Pasivo' }), { mascara, padre: null });

    expect(() => Cuenta.crear(empresa, detalle(), { mascara, padre: otra })).toThrow(CuentaInvalida);
  });

  it('una cuenta de detalle no tiene cuentas inferiores', () => {
    const padre = Cuenta.crear(empresa, detalle(), { mascara, padre: raiz() });
    const hija = datos({ codigo: '1.1.01', nombre: 'Hija' });

    expect(() => Cuenta.crear(empresa, hija, { mascara, padre })).toThrow(CuentaNoEsDeDetalle);
  });

  it('la hija es del mismo tipo que su cuenta superior', () => {
    const resultados = datos({ tipo: 'resultados', rubro: 'otros_ingresos' });

    expect(() => Cuenta.crear(empresa, resultados, { mascara, padre: raiz() })).toThrow(CuentaInvalida);
  });
});

describe('Cuenta: clasificación', () => {
  const crear = (cambios: Partial<DatosDeCuenta>) => () =>
    Cuenta.crear(empresa, detalle(cambios), { mascara, padre: raiz() });

  it('una de detalle lleva su rubro', () => {
    expect(crear({ rubro: null })).toThrow(CuentaInvalida);
  });

  it('una de detalle del balance lleva su clase de flujo; una de resultados no', () => {
    expect(crear({ claseDeFlujo: null })).toThrow(CuentaInvalida);
    expect(
      Cuenta.crear(empresa, datos({ tipo: 'resultados', rubro: 'gastos_de_venta', esDeDetalle: true }), {
        mascara,
        padre: null,
      }),
    ).toBeInstanceOf(Cuenta);
  });

  it('el rubro es del tipo de la cuenta', () => {
    expect(crear({ rubro: 'costo_de_ventas' })).toThrow(CuentaInvalida);
  });

  it('«corriente» solo cabe en activo y pasivo', () => {
    expect(crear({ corriente: true })).not.toThrow();
    expect(crear({ corriente: true, rubro: 'capital' })).toThrow(CuentaInvalida);
  });

  it('el tratamiento fiscal es de resultados', () => {
    expect(crear({ tratamientoFiscal: 'deducible' })).toThrow(CuentaInvalida);
  });

  it('el nombre y el código se recortan y no quedan vacíos', () => {
    const cuenta = Cuenta.crear(empresa, datos({ nombre: '  Activo  ' }), { mascara, padre: null });

    expect(cuenta.instantanea().nombre).toBe('Activo');
    expect(() => Cuenta.crear(empresa, datos({ nombre: '   ' }), { mascara, padre: null })).toThrow(CuentaInvalida);
  });
});

describe('Cuenta: cambios', () => {
  it('cambia sus datos pero no su código', () => {
    const cuenta = raiz();

    cuenta.cambiarDatos(datos({ nombre: 'Activos' }), { mascara, padre: null });

    expect(cuenta.instantanea().nombre).toBe('Activos');
    expect(() => cuenta.cambiarDatos(datos({ codigo: '2' }), { mascara, padre: null })).toThrow(CuentaInvalida);
  });
});

describe('rubros', () => {
  it('cada rubro es de balance o de resultados', () => {
    const tipos = new Set(RUBROS.map(tipoDelRubro));

    expect([...tipos].sort()).toEqual(['balance', 'resultados']);
    expect(RUBROS).toHaveLength(new Set(RUBROS).size);
  });

  it('solo activo y pasivo admiten corriente', () => {
    expect(admiteCorriente('inventarios')).toBe(true);
    expect(admiteCorriente('proveedores')).toBe(true);
    expect(admiteCorriente('capital')).toBe(false);
    expect(admiteCorriente('gastos_de_venta')).toBe(false);
  });
});
