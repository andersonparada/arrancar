import { beforeEach, describe, expect, it } from 'vitest';
import { EnlaceInvalido } from '../../../dominio/errores.js';
import { armarEscenarioDeEnlaces, operador } from '../../../pruebas/escenario-de-enlaces.soporte.js';

let e: Awaited<ReturnType<typeof armarEscenarioDeEnlaces>>;

beforeEach(async () => {
  e = await armarEscenarioDeEnlaces();
});

describe('listar roles y llaves', () => {
  it('lista solo los roles de los módulos activos, con sus enlaces', async () => {
    const banco = await e.crearDetalle();
    await e.guardar.ejecutar(operador, {
      rol: 'cuenta_bancaria',
      solicitud: { llave: 'banco-1', cuentaId: banco.id },
    });

    const roles = await e.listar.ejecutar(operador);

    const claves = roles.map(({ rol }) => rol);
    expect(claves).toContain('cuenta_bancaria');
    expect(claves).toContain('puente_de_apertura');
    expect(claves).not.toContain('iva_credito_fiscal');
    expect(roles.find(({ rol }) => rol === 'cuenta_bancaria')).toMatchObject({
      admiteLlave: true,
      nombreDeLlave: 'Cuenta bancaria',
      enlaces: [{ llave: 'banco-1' }],
    });
  });

  it('las llaves salen ordenadas por nombre y un rol sin llave no ofrece ninguna', async () => {
    const llaves = await e.llaves.ejecutar(operador, 'cuenta_bancaria');

    expect(llaves.map(({ nombre }) => nombre)).toEqual(['Cuenta de ahorro', 'Cuenta monetaria']);
    expect(await e.llaves.ejecutar(operador, 'iva_credito_fiscal')).toEqual([]);
  });
});

describe('importar una fila de Excel', () => {
  it('busca la llave por su nombre, sin importar mayúsculas ni tildes', async () => {
    const banco = await e.crearDetalle();

    const enlace = await e.desdeExcel.ejecutar(operador, {
      rol: 'cuenta_bancaria',
      llaveNombre: ' CUENTA de AHORRO ',
      cuentaId: banco.id,
    });

    expect(enlace).toMatchObject({ llave: 'banco-2', llaveNombre: 'Cuenta de ahorro' });
  });

  it('una fila sin llave enlaza el rol para todo; un nombre desconocido se rechaza en su columna', async () => {
    const banco = await e.crearDetalle();

    const general = await e.desdeExcel.ejecutar(operador, {
      rol: 'cuenta_bancaria',
      llaveNombre: null,
      cuentaId: banco.id,
    });
    const error = await e.desdeExcel
      .ejecutar(operador, { rol: 'cuenta_bancaria', llaveNombre: 'No existe', cuentaId: banco.id })
      .catch((e: EnlaceInvalido) => e);

    expect(general.llave).toBeNull();
    expect(error).toBeInstanceOf(EnlaceInvalido);
    expect((error as EnlaceInvalido).detalles).toEqual({ campo: 'llaveNombre' });
  });
});
