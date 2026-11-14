/**
 * Las reglas que suma CP4-2 a las bajas: un documento con pagos vigentes no se anula, elimina, desautoriza ni corrige (ni
 * aquí ni desde Libro de compras); una contraseña con pagos no se anula pero sí se edita (se quitan solo los documentos sin
 * pagos); quitar la aplicación de una nota de un cargo pagado se rechaza; una nota con reintegros no se anula. Los pagos y
 * reintegros se siembran en la base (los casos de uso llegan en CP4-3 y CP4-7).
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { anularPagoSembrado, sembrarPago, sembrarReintegro } from './soporte/cuentas-por-pagar-pagos.js';
import { notaConSaldoLibre, sembrarAplicacionManual } from './soporte/cuentas-por-pagar-notas.js';
import {
  cuerpoDeContrasena as cuerpoDe,
  EscenarioDeContrasenas,
  RUTA_DE_CONTRASENAS as RUTA,
} from './soporte/cuentas-por-pagar-contrasenas.js';
import type { ClienteApi } from './soporte/cliente-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';
import { consultar, haceDias, RUTA_DOCUMENTOS } from './soporte/escenario-de-documentos.js';

const RUTA_CXP = '/api/cuentas-por-pagar';
const entorno = usarEntornoApi();
let mundo: EscenarioDeContrasenas;
let completa: ClienteApi;
let autoriza: ClienteApi;

beforeAll(async () => {
  mundo = await EscenarioDeContrasenas.preparar(entorno, 'cxppagosreglas');
  const usuario = (nombres: string, permisos: string[]) =>
    crearUsuarioConPermisos(entorno, mundo.escenario.cuenta, { nombres, apellidos: 'Pagos', permisos });
  completa = await usuario('Completa', ['cuentas-por-pagar.documentos.ver', 'cuentas-por-pagar.documentos.registrar']);
  autoriza = await usuario('Autoriza', ['cuentas-por-pagar.documentos.ver', 'cuentas-por-pagar.documentos.autorizar']);
});

const propietario = () => mundo.propietario();
const cuerpoDeBaja = { causa: 'error_de_captura', motivo: 'Se registró por error' };
const anularAqui = (id: string) => propietario().post(`${RUTA_CXP}/documentos/${id}/anular`, cuerpoDeBaja);
const eliminarAqui = (id: string) => propietario().delete(`${RUTA_CXP}/documentos/${id}`);
const estadoDe = async (id: string) =>
  (await consultar<{ estado: string }>('select estado from cuentas_por_pagar.documentos where id = $1', [id]))[0]
    ?.estado;
const existe = async (id: string) =>
  (await consultar('select 1 from cuentas_por_pagar.documentos where id = $1', [id])).length === 1;
const libroDe = async (id: string) =>
  (
    await consultar<{ documento_id: string }>('select documento_id from cuentas_por_pagar.documentos where id = $1', [
      id,
    ])
  )[0]!.documento_id;
const pagar = (contrasenaId: string, cargoPropio: string, monto = '100.00') =>
  sembrarPago(mundo.escenario, { contrasenaId, lineas: [{ cargoPropio, monto }] });

/** Una contraseña vigente con dos cargos de un proveedor nuevo; el primero ya tiene un pago vigente. */
async function contrasenaConUnPago() {
  const proveedor = await mundo.unProveedor();
  const [pagado, libre] = [await mundo.unCargo(proveedor), await mundo.unCargo(proveedor)];
  const creada = await mundo.crear(cuerpoDe(proveedor.proveedorId, [pagado, libre]));
  expect(creada.estado, JSON.stringify(creada.cuerpo)).toBe(201);
  const pago = await pagar(creada.cuerpo.id, pagado);
  return { proveedor, pagado, libre, contrasena: creada.cuerpo, pago };
}

describe('un documento con pagos vigentes', () => {
  it('no se anula ni se elimina, aquí ni desde Libro de compras, y el mensaje nombra el pago', async () => {
    const { pagado, pago } = await contrasenaConUnPago();
    const libroId = await libroDe(pagado);

    const respuestas = [
      await anularAqui(pagado),
      await eliminarAqui(pagado),
      await propietario().post(`${RUTA_DOCUMENTOS}/${libroId}/anular`, cuerpoDeBaja),
      await propietario().delete(`${RUTA_DOCUMENTOS}/${libroId}`),
    ];

    for (const respuesta of respuestas) {
      expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(422);
      expect(respuesta.cuerpo.error.codigo).toBe('documento_con_pagos');
      expect(respuesta.cuerpo.error.mensaje).toContain(`el pago ${pago.numero}`);
    }
    expect(await estadoDe(pagado)).toBe('pendiente');
    expect(await existe(pagado)).toBe(true);
  });

  it('la ficha no ofrece anular, eliminar ni desautorizar', async () => {
    const { pagado, libre } = await contrasenaConUnPago();

    const conPago = (await propietario().get(`${RUTA_CXP}/documentos/${pagado}`)).cuerpo;
    const sinPago = (await propietario().get(`${RUTA_CXP}/documentos/${libre}`)).cuerpo;

    expect(conPago).toMatchObject({ puedeAnular: false, puedeEliminar: false, puedeDesautorizar: false });
    expect(sinPago).toMatchObject({ puedeAnular: false, puedeEliminar: false });
  });

  it('con el pago anulado la regla que sigue es la de la contraseña', async () => {
    const { pagado, pago, contrasena } = await contrasenaConUnPago();
    await anularPagoSembrado(mundo.escenario, pago.id);

    expect((await anularAqui(pagado)).cuerpo.error.codigo).toBe('documento_en_contrasena');

    const anulada = await propietario().post(`${RUTA}/${contrasena.id}/anular`, { motivo: 'Cambio de plan' });
    expect(anulada.estado, JSON.stringify(anulada.cuerpo)).toBe(200);
    expect((await anularAqui(pagado)).estado).toBe(200);
    expect(await estadoDe(pagado)).toBe('anulado');
  });

  it('un documento con solo pagos anulados se elimina y se lleva sus líneas', async () => {
    const { pagado, pago, contrasena } = await contrasenaConUnPago();
    await anularPagoSembrado(mundo.escenario, pago.id);
    await propietario().post(`${RUTA}/${contrasena.id}/anular`, { motivo: 'Cambio de plan' });

    const eliminado = await eliminarAqui(pagado);

    expect(eliminado.estado, JSON.stringify(eliminado.cuerpo)).toBe(204);
    expect(await existe(pagado)).toBe(false);
    expect(
      await consultar('select 1 from cuentas_por_pagar.aplicaciones_de_pagos where cargo_id = $1', [pagado]),
    ).toEqual([]);
  });

  it('un autorizado con pagos vigentes no se desautoriza; sin ellos sí', async () => {
    const proveedor = await mundo.unProveedor();
    const cargo = await mundo.unCargo(proveedor);
    expect((await completa.post(`${RUTA_CXP}/documentos/registrar`, { documentos: [{ id: cargo }] })).estado).toBe(200);
    expect((await autoriza.post(`${RUTA_CXP}/documentos/autorizar`, { ids: [cargo] })).estado).toBe(200);
    const creada = await mundo.crear(cuerpoDe(proveedor.proveedorId, [cargo]));
    const pago = await pagar(creada.cuerpo.id, cargo);

    const rechazada = await autoriza.post(`${RUTA_CXP}/documentos/${cargo}/desautorizar`, { motivo: 'Faltaba algo' });

    expect(rechazada.estado, JSON.stringify(rechazada.cuerpo)).toBe(422);
    expect(rechazada.cuerpo.error.codigo).toBe('documento_con_pagos');
    expect(await estadoDe(cargo)).toBe('autorizado');
    await anularPagoSembrado(mundo.escenario, pago.id);
    const permitida = await autoriza.post(`${RUTA_CXP}/documentos/${cargo}/desautorizar`, { motivo: 'Faltaba algo' });
    expect(permitida.estado, JSON.stringify(permitida.cuerpo)).toBe(200);
  });
});

describe('una contraseña con pagos', () => {
  it('no se anula mientras tenga pagos vigentes; con los pagos anulados sí', async () => {
    const { contrasena, pago } = await contrasenaConUnPago();

    const rechazada = await propietario().post(`${RUTA}/${contrasena.id}/anular`, { motivo: 'Error' });

    expect(rechazada.estado, JSON.stringify(rechazada.cuerpo)).toBe(422);
    expect(rechazada.cuerpo.error.codigo).toBe('contrasena_con_pagos');
    expect(rechazada.cuerpo.error.mensaje).toContain(`La contraseña ${contrasena.numero}`);
    expect((await propietario().get(`${RUTA}/${contrasena.id}`)).cuerpo.estado).toBe('vigente');
    const auditadas = await consultar(
      `select 1 from core.auditoria where recurso = 'cuentas-por-pagar.contrasenas' and registro_id = $1
        and accion = 'anular'`,
      [contrasena.id],
    );
    expect(auditadas).toEqual([]);

    await anularPagoSembrado(mundo.escenario, pago.id);
    expect((await propietario().post(`${RUTA}/${contrasena.id}/anular`, { motivo: 'Error' })).estado).toBe(200);
  });

  it('se sigue editando: cambia la fecha prometida y agrega documentos', async () => {
    const { contrasena, proveedor } = await contrasenaConUnPago();
    const otro = await mundo.unCargo(proveedor);

    const fecha = await propietario().patch(`${RUTA}/${contrasena.id}`, {
      fechaDePago: haceDias(-20),
      motivo: 'El proveedor lo pidió',
    });
    const agregado = await propietario().post(`${RUTA}/${contrasena.id}/documentos`, { documentos: [otro] });

    expect(fecha.estado, JSON.stringify(fecha.cuerpo)).toBe(200);
    expect(fecha.cuerpo).toMatchObject({ puedeEditar: true, puedeAnular: false });
    expect(agregado.estado, JSON.stringify(agregado.cuerpo)).toBe(200);
    expect(agregado.cuerpo.cargos).toHaveLength(3);
  });

  it('quita el documento sin pagos y rechaza el que tiene pagos, vigentes o anulados', async () => {
    const { contrasena, pagado, libre, pago } = await contrasenaConUnPago();
    const url = (id: string) => `${RUTA}/${contrasena.id}/documentos/${id}`;

    const vigente = await propietario().delete(url(pagado), { motivo: 'No va' });
    expect(vigente.cuerpo.error.codigo).toBe('documento_con_pagos_en_la_contrasena');
    await anularPagoSembrado(mundo.escenario, pago.id);
    const anulado = await propietario().delete(url(pagado), { motivo: 'No va' });
    expect(anulado.cuerpo.error.codigo).toBe('documento_con_pagos_en_la_contrasena');

    const quitado = await propietario().delete(url(libre), { motivo: 'Se paga aparte' });
    expect(quitado.estado, JSON.stringify(quitado.cuerpo)).toBe(200);
    expect(quitado.cuerpo.cargos.map((c: { documentoId: string }) => c.documentoId)).toEqual([pagado]);
    const auditadas = await consultar(
      `select 1 from core.auditoria where recurso = 'cuentas-por-pagar.contrasenas' and registro_id = $1 and accion = 'quitar'`,
      [contrasena.id],
    );
    expect(auditadas).toHaveLength(1);
  });
});

describe('un saldo inicial con pagos', () => {
  it('no se corrige ni se elimina con pagos vigentes; con ellos anulados y la contraseña anulada sí', async () => {
    const cuerpo = {
      proveedorId: mundo.escenario.proveedorId,
      tipo: 'factura',
      serie: 'a',
      numero: `CP4-${Math.random().toString(36).slice(2, 8)}`,
      fechaEmision: haceDias(60),
      vencimiento: haceDias(40),
      total: '1120.00',
      retenciones: '120.00',
      retencionesPorPracticar: '20.00',
      saldoPendiente: '700.00',
      referencia: 'CXP-0045',
      tieneActivoFijo: false,
    };
    const creado = await propietario().post(`${RUTA_CXP}/saldos-iniciales`, cuerpo);
    expect(creado.estado, JSON.stringify(creado.cuerpo)).toBe(201);
    const id = creado.cuerpo.id as string;
    const contrasena = await mundo.crear(cuerpoDe(mundo.escenario.proveedorId, [id]));
    const pago = await pagar(contrasena.cuerpo.id, id, '100.00');

    const corregir = await propietario().put(`${RUTA_CXP}/saldos-iniciales/${id}`, {
      ...cuerpo,
      saldoPendiente: '650.00',
    });
    const eliminar = await propietario().delete(`${RUTA_CXP}/saldos-iniciales/${id}`, { motivo: 'Error' });

    expect(corregir.cuerpo.error.codigo).toBe('documento_con_pagos');
    expect(eliminar.cuerpo.error.codigo).toBe('documento_con_pagos');
    expect(await existe(id)).toBe(true);

    await anularPagoSembrado(mundo.escenario, pago.id);
    await propietario().post(`${RUTA}/${contrasena.cuerpo.id}/anular`, { motivo: 'Error' });
    const corregido = await propietario().put(`${RUTA_CXP}/saldos-iniciales/${id}`, {
      ...cuerpo,
      saldoPendiente: '650.00',
    });
    expect(corregido.estado, JSON.stringify(corregido.cuerpo)).toBe(200);
    expect((await propietario().delete(`${RUTA_CXP}/saldos-iniciales/${id}`, { motivo: 'Error' })).estado).toBe(204);
  });
});

describe('quitar la aplicación de una nota de un cargo con pagos', () => {
  it('se rechaza con el pago vigente y se permite con el pago anulado', async () => {
    const proveedor = await mundo.unProveedor();
    const nota = await notaConSaldoLibre(mundo.documentos, proveedor);
    const cargo = await mundo.unCargo(proveedor);
    const manual = await sembrarAplicacionManual({ notaPropia: nota.notaPropia, cargoPropio: cargo, monto: '5.00' });
    const creada = await mundo.crear(cuerpoDe(proveedor.proveedorId, [cargo]));
    const pago = await pagar(creada.cuerpo.id, cargo);

    const rechazada = await propietario().delete(`${RUTA_CXP}/aplicaciones/${manual}`, { motivo: 'Error' });

    expect(rechazada.estado, JSON.stringify(rechazada.cuerpo)).toBe(422);
    expect(rechazada.cuerpo.error.codigo).toBe('documento_con_pagos');
    await anularPagoSembrado(mundo.escenario, pago.id);
    expect((await propietario().delete(`${RUTA_CXP}/aplicaciones/${manual}`, { motivo: 'Error' })).estado).toBe(204);
  });
});

describe('una nota con reintegros', () => {
  it('no se anula ni se elimina con un reintegro vigente; con el reintegro anulado sí', async () => {
    const proveedor = await mundo.unProveedor();
    const nota = await notaConSaldoLibre(mundo.documentos, proveedor);
    const reintegroId = await sembrarReintegro(mundo.escenario, { notaPropia: nota.notaPropia, monto: '30.00' });

    const anular = await anularAqui(nota.notaPropia);
    const eliminar = await eliminarAqui(nota.notaPropia);
    const desdeElLibro = await propietario().post(`${RUTA_DOCUMENTOS}/${nota.notaId}/anular`, cuerpoDeBaja);

    for (const respuesta of [anular, eliminar, desdeElLibro]) {
      expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(422);
      expect(respuesta.cuerpo.error.codigo).toBe('nota_con_reintegros');
    }
    await consultar(
      `update cuentas_por_pagar.reintegros set estado = 'anulado', anulado_en = now(),
              anulado_por = (select id from core.usuarios where usuario = $2), motivo_de_anulacion = 'Error' where id = $1`,
      [reintegroId, mundo.escenario.cuenta.usuario],
    );
    await consultar('update cuentas_por_pagar.aplicaciones_de_reintegros set vigente = false where reintegro_id = $1', [
      reintegroId,
    ]);
    expect((await anularAqui(nota.notaPropia)).estado).toBe(200);
  });
});
