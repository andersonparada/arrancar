import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { CuentaConEnlaces, CuentaInactiva, CuentaNoEsDeDetalle, EnlaceInvalido } from '../../../dominio/errores.js';
import { armarEscenarioDeEnlaces, operador } from '../../../pruebas/escenario-de-enlaces.soporte.js';

let e: Awaited<ReturnType<typeof armarEscenarioDeEnlaces>>;

beforeEach(async () => {
  e = await armarEscenarioDeEnlaces();
});

describe('enlazar un rol', () => {
  it('enlaza un rol sin llave a una cuenta de detalle y lo deja en la lista', async () => {
    const iva = await e.crearDetalle({ codigo: '1.2', nombre: 'IVA crédito' });

    const enlace = await e.guardar.ejecutar(operador, {
      rol: 'iva_credito_fiscal',
      solicitud: { llave: null, cuentaId: iva.id },
    });

    expect(enlace).toMatchObject({ rol: 'iva_credito_fiscal', llave: null, cuentaCodigo: '1.2' });
    expect(await e.paraExcel.ejecutar(operador)).toEqual([enlace]);
    expect(e.auditoria.entradas).toEqual([]);
  });

  it('enlaza con la llave que ofrece un módulo y guarda su nombre', async () => {
    const banco = await e.crearDetalle();

    const enlace = await e.guardar.ejecutar(operador, {
      rol: 'cuenta_bancaria',
      solicitud: { llave: 'banco-1', cuentaId: banco.id },
    });

    expect(enlace).toMatchObject({ llave: 'banco-1', llaveNombre: 'Cuenta monetaria' });
  });

  it('rechaza una llave que ningún módulo activo ofrece', async () => {
    const banco = await e.crearDetalle();

    await expect(
      e.guardar.ejecutar(operador, {
        rol: 'cuenta_bancaria',
        solicitud: { llave: 'otro', cuentaId: banco.id },
      }),
    ).rejects.toBeInstanceOf(EnlaceInvalido);
  });

  it('rechaza una llave en un rol que no la lleva', async () => {
    const iva = await e.crearDetalle();

    await expect(
      e.guardar.ejecutar(operador, {
        rol: 'iva_credito_fiscal',
        solicitud: { llave: 'x', cuentaId: iva.id },
      }),
    ).rejects.toBeInstanceOf(EnlaceInvalido);
  });

  it('solo se enlazan cuentas de detalle y activas', async () => {
    const [raiz] = await e.cuentas.listar();
    const inactiva = await e.crearDetalle({ activo: false });

    await expect(
      e.guardar.ejecutar(operador, { rol: 'puente_de_apertura', solicitud: { llave: null, cuentaId: raiz!.id } }),
    ).rejects.toBeInstanceOf(CuentaNoEsDeDetalle);
    await expect(
      e.guardar.ejecutar(operador, {
        rol: 'puente_de_apertura',
        solicitud: { llave: null, cuentaId: inactiva.id },
      }),
    ).rejects.toBeInstanceOf(CuentaInactiva);
  });

  it('la cuenta tiene que existir', async () => {
    await expect(
      e.guardar.ejecutar(operador, {
        rol: 'puente_de_apertura',
        solicitud: { llave: null, cuentaId: crypto.randomUUID() },
      }),
    ).rejects.toBeInstanceOf(RecursoNoEncontrado);
  });

  it('el rol de un auxiliar deja la cuenta marcada como de control; uno que no lo es, no', async () => {
    const banco = await e.crearDetalle();
    const puente = await e.crearDetalle({ codigo: '1.2', nombre: 'Puente' });

    await e.guardar.ejecutar(operador, {
      rol: 'efectivo_para_pagos',
      solicitud: { llave: null, cuentaId: banco.id },
    });
    await e.guardar.ejecutar(operador, {
      rol: 'puente_de_apertura',
      solicitud: { llave: null, cuentaId: puente.id },
    });

    expect((await e.cuentas.obtener(banco.id)).esDeControl).toBe(true);
    expect((await e.cuentas.obtener(puente.id)).esDeControl).toBe(false);
  });
});

describe('cambiar y quitar un enlace', () => {
  it('enlazar otra vez el mismo rol cambia la cuenta y deja la anterior en la auditoría', async () => {
    const primera = await e.crearDetalle();
    const segunda = await e.crearDetalle({ codigo: '1.2', nombre: 'Otra' });
    const enlace = await e.guardar.ejecutar(operador, {
      rol: 'iva_credito_fiscal',
      solicitud: { llave: null, cuentaId: primera.id },
    });

    const cambiado = await e.guardar.ejecutar(operador, {
      rol: 'iva_credito_fiscal',
      solicitud: { llave: null, cuentaId: segunda.id },
    });

    expect(cambiado).toMatchObject({ id: enlace.id, cuentaId: segunda.id });
    expect(await e.paraExcel.ejecutar(operador)).toHaveLength(1);
    expect(e.auditoria.entradas).toEqual([
      { recurso: 'contabilidad.enlaces', registroId: enlace.id, accion: 'corregir', anterior: enlace },
    ]);
  });

  it('guardar lo mismo no audita nada', async () => {
    const banco = await e.crearDetalle();
    const solicitud = { llave: null, cuentaId: banco.id };
    await e.guardar.ejecutar(operador, { rol: 'iva_credito_fiscal', solicitud });

    await e.guardar.ejecutar(operador, { rol: 'iva_credito_fiscal', solicitud });

    expect(e.auditoria.entradas).toEqual([]);
  });

  it('quitar deja el enlace anterior en la auditoría', async () => {
    const banco = await e.crearDetalle();
    const enlace = await e.guardar.ejecutar(operador, {
      rol: 'iva_credito_fiscal',
      solicitud: { llave: null, cuentaId: banco.id },
    });

    await e.quitar.ejecutar(operador, enlace.id);

    expect(await e.paraExcel.ejecutar(operador)).toEqual([]);
    expect(e.auditoria.entradas).toEqual([
      { recurso: 'contabilidad.enlaces', registroId: enlace.id, accion: 'quitar', anterior: enlace },
    ]);
    await expect(e.quitar.ejecutar(operador, enlace.id)).rejects.toBeInstanceOf(RecursoNoEncontrado);
  });

  it('una cuenta enlazada no se inactiva ni se vuelve de mayor hasta quitar su enlace', async () => {
    const banco = await e.crearDetalle();
    const enlace = await e.guardar.ejecutar(operador, {
      rol: 'iva_credito_fiscal',
      solicitud: { llave: null, cuentaId: banco.id },
    });
    const { id, padreId, padreCodigo, nivel, monedaCodigo, ...datos } = banco;

    await expect(
      e.actualizarCuenta.ejecutar(operador, { cuentaId: id, solicitud: { ...datos, activo: false } }),
    ).rejects.toBeInstanceOf(CuentaConEnlaces);
    await e.quitar.ejecutar(operador, enlace.id);
    const inactiva = await e.actualizarCuenta.ejecutar(operador, {
      cuentaId: id,
      solicitud: { ...datos, activo: false },
    });

    expect(inactiva.activo).toBe(false);
  });
});
