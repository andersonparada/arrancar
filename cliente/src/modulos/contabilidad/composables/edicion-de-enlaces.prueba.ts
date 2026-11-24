import { describe, expect, it } from 'vitest';
import type { Enlace, LlaveDeEnlace, RolDeEnlace } from '../servicios/enlaces.api';
import { cuentaDePrueba } from './cuentas-de-prueba';
import {
  agruparPorModulo,
  cuentasEnlazables,
  faltantesDelRol,
  filasDeRol,
  rolesDeAuxiliarDeLaCuenta,
  totalDeFaltantes,
} from './edicion-de-enlaces';

const enlace = (rol: string, llave: string | null, cuentaId = 'c1'): Enlace => ({
  id: `${rol}-${llave}`,
  rol,
  llave,
  llaveNombre: llave ? `Nombre ${llave}` : null,
  cuentaId,
  cuentaCodigo: '1.1',
  cuentaNombre: 'Caja',
});

const rol = (clave: string, propios: Partial<RolDeEnlace> = {}): RolDeEnlace => ({
  rol: clave,
  nombre: clave,
  modulos: ['bancos'],
  admiteLlave: false,
  nombreDeLlave: null,
  esDeAuxiliar: false,
  enlaces: [],
  ...propios,
});

const llaves: LlaveDeEnlace[] = [
  { llave: 'b', nombre: 'Banrural', activo: true },
  { llave: 'a', nombre: 'BAC', activo: true },
  { llave: 'z', nombre: 'Cerrada', activo: false },
];

describe('roles sin llave', () => {
  it('falta la cuenta mientras no haya enlace', () => {
    const sin = rol('iva_credito_fiscal');
    expect(faltantesDelRol(sin, [])).toBe(1);
    expect(faltantesDelRol({ ...sin, enlaces: [enlace('iva_credito_fiscal', null)] }, [])).toBe(0);
    expect(filasDeRol(sin, [])).toMatchObject([{ llave: null, falta: true }]);
  });
});

describe('roles con llave', () => {
  const conLlave = rol('cuenta_bancaria', { admiteLlave: true, nombreDeLlave: 'Cuenta bancaria' });

  it('lista la fila general y cada registro activo por nombre, marcando los que faltan', () => {
    const filas = filasDeRol(conLlave, llaves);
    expect(filas.map((f) => f.nombre.slice(0, 5))).toEqual(['Todos', 'BAC', 'Banru']);
    expect(filas.map((f) => f.falta)).toEqual([true, true, true]);
    expect(faltantesDelRol(conLlave, llaves)).toBe(2);
  });

  it('con la cuenta general ya no falta ninguna', () => {
    const conGeneral = { ...conLlave, enlaces: [enlace('cuenta_bancaria', null)] };
    expect(faltantesDelRol(conGeneral, llaves)).toBe(0);
    expect(filasDeRol(conGeneral, llaves).some((f) => f.falta)).toBe(false);
  });

  it('un enlace cuyo registro ya no existe se muestra aparte, sin pedir cuenta', () => {
    const conHuerfano = { ...conLlave, enlaces: [enlace('cuenta_bancaria', 'borrada')] };
    const huerfana = filasDeRol(conHuerfano, llaves).find((f) => f.huerfana);
    expect(huerfana).toMatchObject({ nombre: 'Nombre borrada', falta: false });
  });

  it('un registro inactivo con enlace se sigue viendo', () => {
    const conInactivo = { ...conLlave, enlaces: [enlace('cuenta_bancaria', 'z')] };
    expect(filasDeRol(conInactivo, llaves).map((f) => f.llave)).toContain('z');
  });

  it('suma los faltantes de todos los roles', () => {
    const roles = [rol('x'), conLlave];
    expect(totalDeFaltantes(roles, { cuenta_bancaria: llaves })).toBe(3);
  });
});

describe('agrupar y elegir cuentas', () => {
  it('agrupa por el primer módulo del rol en el orden conocido y por nombre', () => {
    const grupos = agruparPorModulo([
      rol('b', { nombre: 'Banco', modulos: ['bancos'] }),
      rol('a', { nombre: 'Activo', modulos: ['bancos', 'cuentas-por-pagar'] }),
      rol('c', { nombre: 'Compras', modulos: ['libro-de-compras'] }),
    ]);
    expect(grupos.map((g) => g.nombre)).toEqual(['Libro de compras', 'Bancos']);
    expect(grupos[1]?.roles.map((r) => r.nombre)).toEqual(['Activo', 'Banco']);
  });

  it('solo ofrece cuentas de detalle y activas, por nombre', () => {
    const lista = cuentasEnlazables([
      cuentaDePrueba('1.2', { esDeDetalle: true, nombre: 'Zeta' }),
      cuentaDePrueba('1.1', { esDeDetalle: true, nombre: 'Alfa' }),
      cuentaDePrueba('1.3', { esDeDetalle: true, activo: false }),
      cuentaDePrueba('1'),
    ]);
    expect(lista.map((c) => c.nombre)).toEqual(['Alfa', 'Zeta']);
  });

  it('dice qué auxiliares usan una cuenta', () => {
    const roles = [
      rol('proveedores', { nombre: 'Proveedores', esDeAuxiliar: true, enlaces: [enlace('proveedores', null, 'c9')] }),
      rol('iva', { nombre: 'IVA', enlaces: [enlace('iva', null, 'c9')] }),
    ];
    expect(rolesDeAuxiliarDeLaCuenta(roles, 'c9')).toEqual(['Proveedores']);
    expect(rolesDeAuxiliarDeLaCuenta(roles, 'otra')).toEqual([]);
  });
});
