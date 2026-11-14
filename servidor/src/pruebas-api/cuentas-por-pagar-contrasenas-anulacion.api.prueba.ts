/**
 * Anular una contraseña de pago y las reglas de baja con contraseñas (CP3-4): anular suelta los documentos y borra lo
 * aplicado dentro de ella, un documento en una contraseña vigente no se anula ni se elimina (ni aquí ni desde Libro de
 * compras) pero sí uno que solo estuvo en una anulada, un saldo inicial en una contraseña no se corrige, y una nota en
 * una contraseña no se aplica, ni se ajusta, ni se le quitan aplicaciones.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { notaConSaldoLibre, sembrarAplicacionManual } from './soporte/cuentas-por-pagar-notas.js';
import {
  cuerpoDeContrasena as cuerpoDe,
  EscenarioDeContrasenas,
  RUTA_DE_CONTRASENAS as RUTA,
  type ProveedorDePrueba,
} from './soporte/cuentas-por-pagar-contrasenas.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { consultar, haceDias, RUTA_DOCUMENTOS } from './soporte/escenario-de-documentos.js';

const RUTA_CXP = '/api/cuentas-por-pagar';
const entorno = usarEntornoApi();
let mundo: EscenarioDeContrasenas;

beforeAll(async () => {
  mundo = await EscenarioDeContrasenas.preparar(entorno, 'cxpcontrasenasanulacion');
});

const propietario = () => mundo.propietario();
const anular = (id: string, motivo = 'Se perdió el papel') => propietario().post(`${RUTA}/${id}/anular`, { motivo });
const cuerpoDeBaja = { causa: 'error_de_captura', motivo: 'Se registró por error' };
const anularAqui = (id: string) => propietario().post(`${RUTA_CXP}/documentos/${id}/anular`, cuerpoDeBaja);
const eliminarAqui = (id: string) => propietario().delete(`${RUTA_CXP}/documentos/${id}`);
const ficha = async (id: string) => (await propietario().get(`${RUTA_CXP}/documentos/${id}`)).cuerpo;
const estadoDe = async (id: string) =>
  (await consultar<{ estado: string }>('select estado from cuentas_por_pagar.documentos where id = $1', [id]))[0]
    ?.estado;
const existe = async (id: string) =>
  (await consultar('select 1 from cuentas_por_pagar.documentos where id = $1', [id])).length === 1;

/** Una contraseña vigente de un proveedor nuevo con una nota de crédito (saldo libre Q100.00) y un cargo. */
async function contrasenaConNota() {
  const proveedor = await mundo.unProveedor();
  const nota = await notaConSaldoLibre(mundo.documentos, proveedor);
  const cargo = await mundo.unCargo(proveedor);
  const creada = await mundo.crear(cuerpoDe(proveedor.proveedorId, [cargo, nota.notaPropia]));
  expect(creada.estado, JSON.stringify(creada.cuerpo)).toBe(201);
  return { proveedor, nota, cargo, contrasena: creada.cuerpo };
}

async function contrasenaDeUnCargo(proveedor?: ProveedorDePrueba) {
  const dueno = proveedor ?? (await mundo.unProveedor());
  const cargo = await mundo.unCargo(dueno);
  const creada = await mundo.crear(cuerpoDe(dueno.proveedorId, [cargo]));
  expect(creada.estado, JSON.stringify(creada.cuerpo)).toBe(201);
  return { proveedor: dueno, cargo, contrasena: creada.cuerpo };
}

describe('anular una contraseña', () => {
  it('la deja anulada con su motivo, borra lo aplicado dentro de ella y audita cómo estaba', async () => {
    const { contrasena, nota, cargo } = await contrasenaConNota();
    expect(contrasena.cargos[0].saldo).toBe('1020.00');

    const respuesta = await anular(contrasena.id, '  Se perdió el papel ');

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo).toMatchObject({
      estado: 'anulada',
      puedeAnular: false,
      puedeEditar: false,
      anulacion: expect.objectContaining({ motivo: 'Se perdió el papel' }),
    });
    const aplicaciones = await consultar(
      `select 1 from cuentas_por_pagar.aplicaciones_de_notas where nota_id = $1 and forma = 'contrasena'`,
      [nota.notaPropia],
    );
    expect(aplicaciones).toEqual([]);
    expect((await ficha(nota.notaPropia)).saldo).toBe('100.00');
    expect((await ficha(cargo)).saldo).toBe('1120.00');
    const [auditada] = await consultar<{ anterior: Record<string, any>; motivo: string }>(
      `select anterior, motivo from core.auditoria where recurso = 'cuentas-por-pagar.contrasenas'
        and registro_id = $1 and accion = 'anular'`,
      [contrasena.id],
    );
    expect(auditada?.motivo).toBe('Se perdió el papel');
    expect(auditada?.anterior).toMatchObject({ id: contrasena.id, estado: 'vigente' });
    expect(auditada?.anterior.cargos[0].saldo).toBe('1020.00');
  });

  it('suelta los documentos (otra contraseña los lleva) y el número no se reutiliza', async () => {
    const { contrasena, proveedor, cargo } = await contrasenaDeUnCargo();
    expect((await mundo.crear(cuerpoDe(proveedor.proveedorId, [cargo]))).cuerpo.error.codigo).toBe(
      'documento_ya_en_contrasena',
    );

    await anular(contrasena.id);
    const otra = await mundo.crear(cuerpoDe(proveedor.proveedorId, [cargo]));

    expect(otra.estado, JSON.stringify(otra.cuerpo)).toBe(201);
    expect(otra.cuerpo.numero).not.toBe(contrasena.numero);
    expect((await propietario().get(`${RUTA}/${contrasena.id}`)).cuerpo.estado).toBe('anulada');
  });

  it('rechaza anular dos veces, sin motivo y una que no existe, sin dejar más auditoría', async () => {
    const { contrasena } = await contrasenaDeUnCargo();
    await anular(contrasena.id);

    const otraVez = await anular(contrasena.id, 'Otra vez');
    const sinMotivo = await anular((await contrasenaDeUnCargo()).contrasena.id, ' ');
    const nada = await anular(crypto.randomUUID());

    expect(otraVez.cuerpo.error.codigo).toBe('contrasena_anulada');
    expect(sinMotivo.estado).toBe(400);
    expect(nada.estado).toBe(404);
    const auditadas = await consultar(
      `select 1 from core.auditoria where recurso = 'cuentas-por-pagar.contrasenas' and registro_id = $1
        and accion = 'anular'`,
      [contrasena.id],
    );
    expect(auditadas).toHaveLength(1);
  });

  it('quien solo ve no anula: pide su propio permiso', async () => {
    const { contrasena } = await contrasenaDeUnCargo();

    const respuesta = await mundo.usuarios.soloVer.post(`${RUTA}/${contrasena.id}/anular`, { motivo: 'x' });

    expect(respuesta.estado).toBe(403);
    expect((await propietario().get(`${RUTA}/${contrasena.id}`)).cuerpo.estado).toBe('vigente');
  });
});

describe('un documento en una contraseña vigente', () => {
  it('sale con su contraseña, sin anular ni eliminar, y el filtro sinContrasena lo deja fuera', async () => {
    const { cargo, contrasena, proveedor } = await contrasenaDeUnCargo();
    const libre = await mundo.unCargo(proveedor);

    const enContrasena = await ficha(cargo);
    const lista = await propietario().get(
      `${RUTA_CXP}/documentos?proveedorId=${proveedor.proveedorId}&sinContrasena=true`,
    );

    expect(enContrasena).toMatchObject({
      contrasena: { id: contrasena.id, numero: contrasena.numero },
      puedeAnular: false,
      puedeEliminar: false,
    });
    expect((await ficha(libre)).contrasena).toBeNull();
    expect(lista.cuerpo.elementos.map((e: { id: string }) => e.id)).toEqual([libre]);
  });

  it('no se anula ni se elimina, ni aquí ni desde Libro de compras, y nada cambia', async () => {
    const { cargo, contrasena, proveedor } = await contrasenaDeUnCargo();
    const libroId = (
      await consultar<{ documento_id: string }>('select documento_id from cuentas_por_pagar.documentos where id = $1', [
        cargo,
      ])
    )[0]!.documento_id;

    const respuestas = [
      await anularAqui(cargo),
      await eliminarAqui(cargo),
      await propietario().post(`${RUTA_DOCUMENTOS}/${libroId}/anular`, cuerpoDeBaja),
      await propietario().delete(`${RUTA_DOCUMENTOS}/${libroId}`),
    ];

    for (const respuesta of respuestas) {
      expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(422);
      expect(respuesta.cuerpo.error.codigo).toBe('documento_en_contrasena');
      expect(respuesta.cuerpo.error.mensaje).toContain(`contraseña ${contrasena.numero}`);
    }
    expect(await estadoDe(cargo)).toBe('pendiente');
    expect(proveedor).toBeDefined();
  });

  it('en una contraseña anulada sí se anula y se elimina, y la auditoría guarda sus contraseñas', async () => {
    const { cargo, contrasena } = await contrasenaDeUnCargo();
    const otra = await contrasenaDeUnCargo();
    await anular(contrasena.id);
    await anular(otra.contrasena.id);

    const anulado = await anularAqui(cargo);
    const eliminado = await eliminarAqui(otra.cargo);

    expect(anulado.estado, JSON.stringify(anulado.cuerpo)).toBe(200);
    expect(await estadoDe(cargo)).toBe('anulado');
    expect(eliminado.estado, JSON.stringify(eliminado.cuerpo)).toBe(204);
    expect(await existe(otra.cargo)).toBe(false);
    const [auditado] = await consultar<{ anterior: { contrasenas: unknown[] } }>(
      `select anterior from core.auditoria where recurso = 'cuentas-por-pagar.documentos' and accion = 'eliminar'
          and registro_id = $1`,
      [otra.cargo],
    );
    expect(auditado?.anterior.contrasenas).toEqual([
      { id: otra.contrasena.id, numero: otra.contrasena.numero, estado: 'anulada' },
    ]);
  });

  it('quitado de la contraseña, se da de baja con normalidad', async () => {
    const proveedor = await mundo.unProveedor();
    const [a, b] = [await mundo.unCargo(proveedor), await mundo.unCargo(proveedor)];
    const creada = await mundo.crear(cuerpoDe(proveedor.proveedorId, [a, b]));
    await propietario().delete(`${RUTA}/${creada.cuerpo.id}/documentos/${b}`, { motivo: 'Se paga aparte' });

    expect((await anularAqui(b)).estado).toBe(200);
    expect((await anularAqui(a)).cuerpo.error.codigo).toBe('documento_en_contrasena');
  });
});

describe('un saldo inicial en una contraseña', () => {
  const saldo = (cambios: Record<string, unknown> = {}) => ({
    proveedorId: mundo.escenario.proveedorId,
    tipo: 'factura',
    serie: 'a',
    numero: `CP3-${Math.random().toString(36).slice(2, 8)}`,
    fechaEmision: haceDias(60),
    vencimiento: haceDias(40),
    total: '1120.00',
    retenciones: '120.00',
    retencionesPorPracticar: '20.00',
    saldoPendiente: '700.00',
    referencia: 'CXP-0045',
    tieneActivoFijo: false,
    ...cambios,
  });

  it('no se corrige ni se elimina mientras la contraseña esté vigente, y sí cuando se anula', async () => {
    const cuerpo = saldo();
    const creado = await propietario().post(`${RUTA_CXP}/saldos-iniciales`, cuerpo);
    expect(creado.estado, JSON.stringify(creado.cuerpo)).toBe(201);
    const id = creado.cuerpo.id as string;
    const contrasena = await mundo.crear(cuerpoDe(mundo.escenario.proveedorId, [id]));
    expect(contrasena.estado, JSON.stringify(contrasena.cuerpo)).toBe(201);

    const corregir = await propietario().put(`${RUTA_CXP}/saldos-iniciales/${id}`, {
      ...cuerpo,
      saldoPendiente: '650.00',
    });
    const eliminar = await propietario().delete(`${RUTA_CXP}/saldos-iniciales/${id}`, { motivo: 'Error' });

    expect(corregir.cuerpo.error.codigo).toBe('documento_en_contrasena');
    expect(eliminar.cuerpo.error.codigo).toBe('documento_en_contrasena');
    expect(await existe(id)).toBe(true);

    await anular(contrasena.cuerpo.id);
    const corregido = await propietario().put(`${RUTA_CXP}/saldos-iniciales/${id}`, {
      ...cuerpo,
      saldoPendiente: '650.00',
    });
    expect(corregido.estado, JSON.stringify(corregido.cuerpo)).toBe(200);
    expect((await propietario().delete(`${RUTA_CXP}/saldos-iniciales/${id}`, { motivo: 'Error' })).estado).toBe(204);
  });
});

describe('una nota de crédito en una contraseña vigente', () => {
  it('no se aplica, ni se ajusta, ni se le quita una aplicación manual', async () => {
    const proveedor = await mundo.unProveedor();
    const nota = await notaConSaldoLibre(mundo.documentos, proveedor);
    const otroCargo = await mundo.unCargo(proveedor);
    const manual = await sembrarAplicacionManual({
      notaPropia: nota.notaPropia,
      cargoPropio: otroCargo,
      monto: '10.00',
    });
    const cargo = await mundo.unCargo(proveedor);
    const completada = await propietario().post(`${RUTA_CXP}/documentos/registrar`, {
      documentos: [{ id: nota.notaPropia }],
    });
    expect(completada.estado, JSON.stringify(completada.cuerpo)).toBe(200);
    const creada = await mundo.crear(cuerpoDe(proveedor.proveedorId, [cargo, nota.notaPropia]));
    expect(creada.estado, JSON.stringify(creada.cuerpo)).toBe(201);
    expect(await ficha(nota.notaPropia)).toMatchObject({ puedeAplicar: false, puedeAjustar: false });

    const aplicar = await propietario().post(`${RUTA_CXP}/documentos/${nota.notaPropia}/aplicaciones`, {
      aplicaciones: [{ cargoId: otroCargo, monto: '5.00' }],
    });
    const ajustar = await propietario().post(`${RUTA_CXP}/documentos/${nota.notaPropia}/ajustes`, {
      monto: '5.00',
      causa: 'no_recuperable',
      motivo: 'No lo devolverá',
    });
    const quitar = await propietario().delete(`${RUTA_CXP}/aplicaciones/${manual}`, { motivo: 'Error' });

    for (const respuesta of [aplicar, ajustar, quitar]) {
      expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(422);
      expect(respuesta.cuerpo.error.codigo).toBe('nota_en_contrasena');
    }
    const ajustes = await consultar('select 1 from cuentas_por_pagar.ajustes_de_saldo where documento_id = $1', [
      nota.notaPropia,
    ]);
    expect(ajustes).toEqual([]);

    await anular(creada.cuerpo.id);
    const ahora = await propietario().delete(`${RUTA_CXP}/aplicaciones/${manual}`, { motivo: 'Error' });
    expect(ahora.estado, JSON.stringify(ahora.cuerpo)).toBe(204);
  });
});
