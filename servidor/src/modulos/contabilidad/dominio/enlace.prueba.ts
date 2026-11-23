import { describe, expect, it } from 'vitest';
import { ROLES_DE_CUENTA } from '../../core/contratos/contabilidad.contratos.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { Cuenta, type DatosDeCuenta } from './cuenta.js';
import { Enlace } from './enlace.js';
import { CuentaInactiva, CuentaNoEsDeDetalle, EnlaceInvalido } from './errores.js';
import { MascaraDeCuentas } from './mascara-de-cuentas.js';
import { DEFINICIONES_DE_ROLES, rolesDeLosModulos } from './roles-de-enlace.js';

const empresa = Identificador.nuevo<'Empresa'>();
const mascara = MascaraDeCuentas.desde('9.9.99.99.999');

const datos = (cambios: Partial<DatosDeCuenta> = {}): DatosDeCuenta => ({
  codigo: '1',
  nombre: 'Caja',
  esDeDetalle: true,
  naturaleza: 'deudora',
  tipo: 'balance',
  rubro: 'efectivo',
  corriente: false,
  claseDeFlujo: 'efectivo',
  esMonetaria: false,
  pideTercero: false,
  pideCentroDeCosto: false,
  esDeControl: false,
  tratamientoFiscal: 'no_aplica',
  activo: true,
  ...cambios,
});

const cuenta = (cambios: Partial<DatosDeCuenta> = {}) =>
  Cuenta.crear(empresa, datos(cambios), { mascara, padre: null });

describe('Enlace', () => {
  it('une un rol con una cuenta de detalle activa', () => {
    const caja = cuenta();

    const enlace = Enlace.crear(empresa, { rol: 'puente_de_apertura', llave: null, cuenta: caja });

    expect(enlace.instantanea()).toMatchObject({ rol: 'puente_de_apertura', llave: null, llaveNombre: null });
    expect(enlace.cuentaId).toBe(caja.id);
  });

  it('guarda la llave con su nombre cuando el rol la lleva', () => {
    const enlace = Enlace.crear(empresa, {
      rol: 'cuenta_bancaria',
      llave: { id: 'b-1', nombre: 'Monetaria' },
      cuenta: cuenta(),
    });

    expect(enlace.instantanea()).toMatchObject({ llave: 'b-1', llaveNombre: 'Monetaria' });
  });

  it('rechaza una llave en un rol que no la lleva o una llave vacía', () => {
    const conLlave = (rol: 'iva_credito_fiscal' | 'cuenta_bancaria', id: string) =>
      Enlace.crear(empresa, { rol, llave: { id, nombre: 'X' }, cuenta: cuenta() });

    expect(() => conLlave('iva_credito_fiscal', 'x')).toThrow(EnlaceInvalido);
    expect(() => conLlave('cuenta_bancaria', ' ')).toThrow(EnlaceInvalido);
  });

  it('rechaza una cuenta de mayor o inactiva', () => {
    const mayor = cuenta({ esDeDetalle: false, rubro: null, claseDeFlujo: null });
    const inactiva = cuenta({ activo: false });

    expect(() => Enlace.crear(empresa, { rol: 'puente_de_apertura', llave: null, cuenta: mayor })).toThrow(
      CuentaNoEsDeDetalle,
    );
    expect(() => Enlace.crear(empresa, { rol: 'puente_de_apertura', llave: null, cuenta: inactiva })).toThrow(
      CuentaInactiva,
    );
  });

  it('cambiar la cuenta conserva el rol y la llave y actualiza el nombre de la llave', () => {
    const enlace = Enlace.crear(empresa, {
      rol: 'cuenta_bancaria',
      llave: { id: 'b-1', nombre: 'Vieja' },
      cuenta: cuenta(),
    });
    const otra = cuenta({ codigo: '2', nombre: 'Otra' });

    enlace.cambiarCuenta({ rol: 'cuenta_bancaria', llave: { id: 'b-1', nombre: 'Nueva' }, cuenta: otra });

    expect(enlace.instantanea()).toMatchObject({ rol: 'cuenta_bancaria', llave: 'b-1', llaveNombre: 'Nueva' });
    expect(enlace.cuentaId).toBe(otra.id);
  });
});

describe('catálogo de roles', () => {
  it('describe todos los roles del contrato, cada uno con al menos un módulo y un nombre', () => {
    for (const rol of ROLES_DE_CUENTA) {
      const definicion = DEFINICIONES_DE_ROLES[rol];
      expect(definicion.nombre.length, rol).toBeGreaterThan(0);
      expect(definicion.modulos.length, rol).toBeGreaterThan(0);
      expect(definicion.admiteLlave, rol).toBe(definicion.nombreDeLlave !== null);
    }
  });

  it('los roles con llave son los que el diseño nombra (§3.9)', () => {
    const conLlave = ROLES_DE_CUENTA.filter((rol) => DEFINICIONES_DE_ROLES[rol].admiteLlave);

    expect(conLlave).toEqual([
      'proveedores',
      'retencion_por_pagar',
      'gasto_por_concepto',
      'cuenta_bancaria',
      'concepto_bancario',
      'caja_chica',
      'activo_fijo',
      'depreciacion_acumulada',
      'gasto_de_depreciacion',
    ]);
  });

  it('solo se enseñan los roles de los módulos activos; los de Contabilidad, siempre', () => {
    const roles = rolesDeLosModulos(new Set(['contabilidad', 'multimoneda']));

    expect(roles).toContain('puente_de_apertura');
    expect(roles).toContain('diferencial_realizado_ganancia');
    expect(roles).not.toContain('cuenta_bancaria');
  });
});
