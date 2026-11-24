import { describe, expect, it } from 'vitest';
import type { Enlace, LlaveDeEnlace, RolDeEnlace } from '../servicios/enlaces.api';
import { cuentaDePrueba } from './cuentas-de-prueba';
import {
  agruparPorModulo,
  consecuenciaDeQuitar,
  cuentasEnlazables,
  faltantesDelRol,
  filasDeRol,
  rolesDeAuxiliarDeLaCuenta,
  totalDeFaltantes,
  totalSegunOperacionSinElegir,
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
  opcional: false,
  generalObligatoria: false,
  segunOperacion: false,
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

  it('sin cuenta general ni registros conocidos falta la cuenta general', () => {
    const caja = rol('caja_chica', { admiteLlave: true });
    expect(faltantesDelRol(caja, [])).toBe(1);
    expect(filasDeRol(caja, [])[0]).toMatchObject({ llave: null, falta: true });
    expect(totalDeFaltantes([caja], { caja_chica: [] })).toBe(1);
    expect(faltantesDelRol({ ...caja, enlaces: [enlace('caja_chica', null)] }, [])).toBe(0);
  });

  it('con todos sus registros cubiertos ya no falta la general', () => {
    const cubierto = { ...conLlave, enlaces: [enlace('cuenta_bancaria', 'a'), enlace('cuenta_bancaria', 'b')] };
    expect(faltantesDelRol(cubierto, llaves)).toBe(0);
  });

  it('si no se pudieron traer los registros, no marca huérfanos y avisa lo que falta', () => {
    const conEnlace = { ...conLlave, enlaces: [enlace('cuenta_bancaria', 'a')] };
    expect(filasDeRol(conEnlace, null).some((f) => f.huerfana)).toBe(false);
    expect(faltantesDelRol(conLlave, null)).toBe(1);
    expect(faltantesDelRol(conEnlace, null)).toBe(1);
    expect(faltantesDelRol({ ...conLlave, enlaces: [enlace('cuenta_bancaria', null)] }, null)).toBe(0);
    expect(totalDeFaltantes([conLlave], {})).toBe(1);
  });

  it('un enlace huérfano no cubre el rol', () => {
    const soloHuerfano = { ...conLlave, enlaces: [enlace('cuenta_bancaria', 'borrada')] };
    expect(faltantesDelRol(soloHuerfano, [])).toBe(1);
  });

  it('un enlace en un solo registro sin conocer los demás sigue faltando', () => {
    const conUno = { ...conLlave, enlaces: [enlace('cuenta_bancaria', 'a')] };
    expect(faltantesDelRol(conUno, null)).toBe(1);
    expect(faltantesDelRol(conUno, llaves)).toBe(1);
  });

  it('un rol opcional no cuenta como faltante ni se marca', () => {
    const iva = rol('iva_no_acreditable', { opcional: true });
    expect(faltantesDelRol(iva, [])).toBe(0);
    expect(filasDeRol(iva, [])[0]?.falta).toBe(false);
    expect(totalDeFaltantes([iva], {})).toBe(0);
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

describe('consecuenciaDeQuitar', () => {
  const conLlave = rol('cuenta_bancaria', { admiteLlave: true });
  const fila = (llave: string | null) => ({ llave, nombre: 'x', enlace: null, huerfana: false, falta: false });

  it('en un rol opcional el importe va al costo de cada línea', () => {
    expect(consecuenciaDeQuitar(rol('iva_no_acreditable', { opcional: true }), fila(null))).toContain(
      'costo o gasto de cada línea',
    );
  });

  it('con cuenta general, el registro pasa a usarla', () => {
    const conGeneral = { ...conLlave, enlaces: [enlace('cuenta_bancaria', null), enlace('cuenta_bancaria', 'a')] };
    expect(consecuenciaDeQuitar(conGeneral, fila('a'))).toContain('cuenta general 1.1');
  });

  it('sin respaldo queda por contabilizar con error', () => {
    expect(consecuenciaDeQuitar(conLlave, fila('a'))).toContain('con un error');
    expect(consecuenciaDeQuitar(rol('x'), fila(null))).toContain('con un error');
  });
});

describe('cuenta general obligatoria y roles según la operación', () => {
  const proveedores = rol('proveedores', { admiteLlave: true, generalObligatoria: true });
  const conCategorias = { ...proveedores, enlaces: [enlace('proveedores', 'a'), enlace('proveedores', 'b')] };

  it('proveedores con todas las categorías y sin cuenta general sigue faltando', () => {
    expect(faltantesDelRol(conCategorias, llaves)).toBe(1);
    expect(totalDeFaltantes([conCategorias], { proveedores: llaves })).toBe(1);
  });

  it('con la cuenta general ya no falta y las categorías no son obligatorias', () => {
    const completo = { ...proveedores, enlaces: [enlace('proveedores', null)] };
    expect(faltantesDelRol(completo, llaves)).toBe(0);
    expect(filasDeRol(proveedores, llaves).some((fila) => fila.falta && fila.llave !== null)).toBe(false);
  });

  it('un rol según la operación no cuenta como faltante', () => {
    expect(faltantesDelRol(rol('reserva_legal', { segunOperacion: true }), [])).toBe(0);
  });
});

describe('roles según la operación sin cuenta', () => {
  it('no son faltantes, pero se cuentan aparte para no decir que todo está listo', () => {
    const roles = [
      rol('iva_credito_fiscal', { segunOperacion: true }),
      rol('retencion_por_pagar', { segunOperacion: true }),
    ];
    expect(totalDeFaltantes(roles, {})).toBe(0);
    expect(totalSegunOperacionSinElegir(roles)).toBe(2);
  });

  it('uno con enlace ya no cuenta', () => {
    const roles = [rol('reserva_legal', { segunOperacion: true, enlaces: [enlace('reserva_legal', null)] })];
    expect(totalSegunOperacionSinElegir(roles)).toBe(0);
  });
});

describe('mensaje al quitar según el caso', () => {
  const general = enlace('r', null);
  const fila = (llave: string | null) => ({ llave, nombre: 'x', enlace: null, huerfana: false, falta: false });

  it('quitar la general con enlaces propios no dice que todo queda con error', () => {
    const r = rol('r', { admiteLlave: true, enlaces: [general, enlace('r', 'a')] });
    const texto = consecuenciaDeQuitar(r, fila(null));
    expect(texto).toContain('siguen igual');
    expect(texto).toContain('Lo ya contabilizado no cambia.');
  });

  it('el opcional no detiene nada', () => {
    expect(consecuenciaDeQuitar(rol('r', { opcional: true }), fila(null))).toContain('No se detiene nada.');
  });
});
