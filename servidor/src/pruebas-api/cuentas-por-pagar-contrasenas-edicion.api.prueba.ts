/**
 * Editar una contraseña de pago (CP3-3): la fecha prometida con motivo y auditoría, las observaciones sin ella, agregar
 * documentos (con la fecha de recepción de la nota) y quitarlos (con auditoría y el reparto rehecho), y los rechazos.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { consultar, haceDias, HOY } from './soporte/escenario-de-documentos.js';
import { notaConSaldoLibre } from './soporte/cuentas-por-pagar-notas.js';
import {
  cuerpoDeContrasena as cuerpoDe,
  EscenarioDeContrasenas,
  RUTA_DE_CONTRASENAS as RUTA,
  type ProveedorDePrueba,
} from './soporte/cuentas-por-pagar-contrasenas.js';
import { usarEntornoApi } from './soporte/entorno-api.js';

const entorno = usarEntornoApi();
let mundo: EscenarioDeContrasenas;

beforeAll(async () => {
  mundo = await EscenarioDeContrasenas.preparar(entorno, 'cxpcontrasenasedicion');
});

/** Una contraseña vigente de un proveedor nuevo con sus cargos. */
async function contrasenaCon(cargos: number, proveedor?: ProveedorDePrueba) {
  const dueno = proveedor ?? (await mundo.unProveedor());
  const ids = [];
  for (let n = 0; n < cargos; n++) ids.push(await mundo.unCargo(dueno));
  const creada = await mundo.crear(cuerpoDe(dueno.proveedorId, ids, { observaciones: 'Original' }));
  expect(creada.estado, JSON.stringify(creada.cuerpo)).toBe(201);
  return { proveedor: dueno, ids, contrasena: creada.cuerpo };
}

const auditoriasDe = (id: string, accion: string) =>
  consultar<{ anterior: Record<string, any>; motivo: string }>(
    `select anterior, motivo from core.auditoria where recurso = 'cuentas-por-pagar.contrasenas'
        and registro_id = $1 and accion = $2`,
    [id, accion],
  );

describe('cambiar la fecha prometida y las observaciones', () => {
  it('la fecha sin motivo se rechaza; con motivo se cambia y se audita con lo que había', async () => {
    const { contrasena } = await contrasenaCon(1);
    const nueva = haceDias(-20);

    const sinMotivo = await mundo.propietario().patch(`${RUTA}/${contrasena.id}`, { fechaDePago: nueva });
    expect(sinMotivo.estado).toBe(400);
    expect(await auditoriasDe(contrasena.id, 'corregir')).toEqual([]);

    const bien = await mundo
      .propietario()
      .patch(`${RUTA}/${contrasena.id}`, { fechaDePago: nueva, motivo: 'Lo pidió' });
    expect(bien.estado, JSON.stringify(bien.cuerpo)).toBe(200);
    expect(bien.cuerpo.fechaDePago).toBe(nueva);
    expect(await auditoriasDe(contrasena.id, 'corregir')).toEqual([
      { anterior: { fechaDePago: haceDias(-10), observaciones: 'Original' }, motivo: 'Lo pidió' },
    ]);
  });

  it('solo las observaciones se cambian sin motivo ni auditoría', async () => {
    const { contrasena } = await contrasenaCon(1);

    const respuesta = await mundo.propietario().patch(`${RUTA}/${contrasena.id}`, { observaciones: '  Nueva  ' });

    expect(respuesta.cuerpo).toMatchObject({ observaciones: 'Nueva', fechaDePago: contrasena.fechaDePago });
    expect(await auditoriasDe(contrasena.id, 'corregir')).toEqual([]);
  });

  it('rechaza una fecha anterior a la de la contraseña y una contraseña que no existe', async () => {
    const { contrasena } = await contrasenaCon(1);

    const antes = await mundo
      .propietario()
      .patch(`${RUTA}/${contrasena.id}`, { fechaDePago: haceDias(2), motivo: 'x' });
    expect(antes.cuerpo.error.codigo).toBe('fecha_de_pago_invalida');
    const nada = await mundo.propietario().patch(`${RUTA}/${crypto.randomUUID()}`, { observaciones: 'x' });
    expect(nada.estado).toBe(404);
  });
});

describe('agregar documentos', () => {
  it('suma un cargo y una nota recibida después, y la nota se aplica con su fecha de recepción', async () => {
    const { proveedor, contrasena } = await contrasenaCon(1);
    const otro = await mundo.unCargo(proveedor);
    const nota = await notaConSaldoLibre(mundo.documentos, proveedor);

    const respuesta = await mundo
      .propietario()
      .post(`${RUTA}/${contrasena.id}/documentos`, { documentos: [otro, nota.notaPropia] });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo.cargos).toHaveLength(2);
    expect(respuesta.cuerpo.notas).toEqual([
      expect.objectContaining({ documentoId: nota.notaPropia, aplicadoEnLaContrasena: '100.00' }),
    ]);
    const aplicaciones = await consultar<{ fecha: string; contrasena_id: string }>(
      `select fecha::text, contrasena_id from cuentas_por_pagar.aplicaciones_de_notas
        where nota_id = $1 and forma = 'contrasena'`,
      [nota.notaPropia],
    );
    expect(aplicaciones).toEqual([{ fecha: HOY, contrasena_id: contrasena.id }]);
  });

  it('rechaza un documento de otro proveedor y uno ya en otra contraseña, sin cambiar nada', async () => {
    const { contrasena, proveedor } = await contrasenaCon(1);
    const { ids } = await contrasenaCon(1, proveedor);
    const ajeno = await mundo.unCargo(await mundo.unProveedor());

    const deOtro = await mundo.propietario().post(`${RUTA}/${contrasena.id}/documentos`, { documentos: [ajeno] });
    const repetido = await mundo.propietario().post(`${RUTA}/${contrasena.id}/documentos`, { documentos: ids });

    expect(deOtro.cuerpo.error.codigo).toBe('documento_de_otro_proveedor');
    expect(repetido.cuerpo.error.codigo).toBe('documento_ya_en_contrasena');
    expect((await mundo.propietario().get(`${RUTA}/${contrasena.id}`)).cuerpo.cargos).toHaveLength(1);
  });
});

describe('quitar un documento', () => {
  it('quita un cargo con motivo, audita con la contraseña como estaba y borra su fila', async () => {
    const { contrasena, ids } = await contrasenaCon(2);

    const respuesta = await mundo
      .propietario()
      .delete(`${RUTA}/${contrasena.id}/documentos/${ids[0]}`, { motivo: 'Se paga aparte' });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo.cargos).toHaveLength(1);
    const [auditada] = await auditoriasDe(contrasena.id, 'quitar');
    expect(auditada?.motivo).toBe('Se paga aparte');
    expect(auditada?.anterior.cargos).toHaveLength(2);
    expect(auditada?.anterior.id).toBe(contrasena.id);
  });

  it('quitar una nota devuelve su saldo libre y el cargo vuelve a su saldo', async () => {
    const proveedor = await mundo.unProveedor();
    const nota = await notaConSaldoLibre(mundo.documentos, proveedor);
    const cargo = await mundo.unCargo(proveedor);
    const creada = await mundo.crear(cuerpoDe(proveedor.proveedorId, [cargo, nota.notaPropia]));
    expect(creada.cuerpo.cargos[0].saldo).toBe('1020.00');

    const respuesta = await mundo
      .propietario()
      .delete(`${RUTA}/${creada.cuerpo.id}/documentos/${nota.notaPropia}`, { motivo: 'No va' });

    expect(respuesta.cuerpo.cargos[0]).toMatchObject({ rebajado: '0.00', saldo: '1120.00' });
    const quedan = await consultar<{ n: string }>(
      `select count(*)::text as n from cuentas_por_pagar.aplicaciones_de_notas
        where nota_id = $1 and forma = 'contrasena'`,
      [nota.notaPropia],
    );
    expect(quedan[0]!.n).toBe('0');
  });

  it('rechaza quitar el último cargo, quitar sin motivo y quitar un documento que no está', async () => {
    const { contrasena, ids } = await contrasenaCon(1);
    const otro = await mundo.unCargo(await mundo.unProveedor());
    const url = (documento: string) => `${RUTA}/${contrasena.id}/documentos/${documento}`;

    const ultimo = await mundo.propietario().delete(url(ids[0]!), { motivo: 'x' });
    const sinMotivo = await mundo.propietario().delete(url(ids[0]!), { motivo: ' ' });
    const ajeno = await mundo.propietario().delete(url(otro), { motivo: 'x' });

    expect(ultimo.cuerpo.error.codigo).toBe('contrasena_sin_cargos');
    expect(sinMotivo.estado).toBe(400);
    expect(ajeno.estado).toBe(404);
    expect(await auditoriasDe(contrasena.id, 'quitar')).toEqual([]);
  });
});

describe('contraseña anulada y permisos', () => {
  it('una contraseña anulada no se edita', async () => {
    const { contrasena, ids } = await contrasenaCon(2);
    await consultar(
      `update cuentas_por_pagar.contrasenas set estado = 'anulada', anulada_en = now(),
         anulada_por = creado_por, motivo_de_anulacion = 'Prueba' where id = $1`,
      [contrasena.id],
    );

    const editar = await mundo.propietario().patch(`${RUTA}/${contrasena.id}`, { observaciones: 'x' });
    const quitar = await mundo.propietario().delete(`${RUTA}/${contrasena.id}/documentos/${ids[0]}`, { motivo: 'x' });

    expect(editar.cuerpo.error.codigo).toBe('contrasena_anulada');
    expect(quitar.cuerpo.error.codigo).toBe('contrasena_anulada');
  });

  it('quien solo ve no edita, ni agrega ni quita', async () => {
    const { contrasena, ids } = await contrasenaCon(2);
    const cliente = mundo.usuarios.soloVer;

    expect((await cliente.patch(`${RUTA}/${contrasena.id}`, { observaciones: 'x' })).estado).toBe(403);
    expect((await cliente.post(`${RUTA}/${contrasena.id}/documentos`, { documentos: ids })).estado).toBe(403);
    expect((await cliente.delete(`${RUTA}/${contrasena.id}/documentos/${ids[0]}`, { motivo: 'x' })).estado).toBe(403);
  });
});
