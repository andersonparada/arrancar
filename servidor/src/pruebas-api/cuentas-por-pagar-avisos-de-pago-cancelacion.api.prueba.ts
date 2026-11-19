/**
 * El aviso de pago por correo, segunda parte: cancelarlo (a mano y al anular el pago), el envío automático al
 * registrar el pago y la validación de la plantilla.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { anularPago } from './soporte/cuentas-por-pagar-pagos-cambios.js';
import { AvisosDePrueba, RUTA_DE_PAGOS as RUTA } from './soporte/cuentas-por-pagar-avisos.js';
import { usarEntornoApi } from './soporte/entorno-api.js';

const entorno = usarEntornoApi();
const CLAVE_ENVIO = 'cuentas-por-pagar.avisos_de_pago.envio';
let a: AvisosDePrueba;

beforeAll(async () => {
  a = await AvisosDePrueba.preparar(entorno, 'cxpavisosb');
});

describe('cancelar el aviso', () => {
  it('cancela un pendiente con su motivo, lo audita y no deja cancelar el de otro pago', async () => {
    const { pagoId, contactos } = await a.pagoConProveedor({
      contactos: [{ nombre: 'Ana', correo: 'ana@proveedor.com' }],
    });
    const otro = await a.pagoConProveedor({ contactos: [{ nombre: 'Luis', correo: 'luis@proveedor.com' }] });
    const enviado = await a.enviar(pagoId, {
      destinatarios: [{ origen: 'contacto', origenId: contactos[0]! }],
      copiaALaEmpresa: false,
    });

    const ajeno = await a.e
      .propietario()
      .post(`${RUTA}/${otro.pagoId}/aviso/${enviado.cuerpo.id}/cancelar`, { motivo: 'x' });
    const cancelado = await a.e
      .propietario()
      .post(`${RUTA}/${pagoId}/aviso/${enviado.cuerpo.id}/cancelar`, { motivo: 'Se paga mañana' });
    const otraVez = await a.e
      .propietario()
      .post(`${RUTA}/${pagoId}/aviso/${enviado.cuerpo.id}/cancelar`, { motivo: 'Otra vez' });

    expect(ajeno.estado).toBe(404);
    expect(cancelado.estado).toBe(200);
    expect(cancelado.cuerpo).toMatchObject({ estado: 'cancelado', motivoDeCancelacion: 'Se paga mañana' });
    expect(otraVez.estado).toBe(409);
    const auditado = await comoPropietario<{ accion: string; motivo: string }>(
      `select accion, motivo from core.auditoria where recurso = 'core.correos_salientes' and registro_id = $1`,
      [enviado.cuerpo.id],
    );
    expect(auditado).toEqual([{ accion: 'anular', motivo: 'Se paga mañana' }]);
  });

  it('exige el permiso de enviar avisos', async () => {
    const { pagoId, contactos } = await a.pagoConProveedor({
      contactos: [{ nombre: 'Ana', correo: 'ana@proveedor.com' }],
    });
    const enviado = await a.enviar(pagoId, {
      destinatarios: [{ origen: 'contacto', origenId: contactos[0]! }],
      copiaALaEmpresa: false,
    });

    const respuesta = await a.soloVer.post(`${RUTA}/${pagoId}/aviso/${enviado.cuerpo.id}/cancelar`, { motivo: 'x' });

    expect(respuesta.estado).toBe(403);
  });

  it('al anular el pago se cancelan sus avisos pendientes («Pago anulado») y lo ya enviado queda', async () => {
    const { pagoId, contactos } = await a.pagoConProveedor({
      contactos: [{ nombre: 'Ana', correo: 'ana@proveedor.com' }],
    });
    const cuerpo = { destinatarios: [{ origen: 'contacto', origenId: contactos[0]! }], copiaALaEmpresa: false };
    await a.enviar(pagoId, cuerpo);
    await a.enviar(pagoId, cuerpo);
    const [primero] = await a.correosDe(pagoId);
    await comoPropietario(`update core.correos_salientes set estado = 'enviado', enviado_en = now() where id = $1`, [
      primero!.id,
    ]);

    expect((await anularPago(a.e.propietario(), pagoId)).estado).toBe(200);

    const correos = await a.correosDe(pagoId);
    expect(correos.map((c) => [c.estado, c.motivo_de_cancelacion])).toEqual([
      ['enviado', null],
      ['cancelado', 'Pago anulado'],
    ]);
    const auditados = await comoPropietario<{ registro_id: string }>(
      `select registro_id from core.auditoria where recurso = 'core.correos_salientes' and accion = 'anular' and registro_id = any($1)`,
      [correos.map((c) => c.id)],
    );
    expect(auditados).toEqual([{ registro_id: correos[1]!.id }]);
  });

  it('al anular el pago también se cancela el aviso fallido y ya no se puede reintentar', async () => {
    const { pagoId, contactos } = await a.pagoConProveedor({
      contactos: [{ nombre: 'Ana', correo: 'ana@proveedor.com' }],
    });
    const enviado = await a.enviar(pagoId, {
      destinatarios: [{ origen: 'contacto', origenId: contactos[0]! }],
      copiaALaEmpresa: false,
    });
    await comoPropietario(`update core.correos_salientes set estado = 'fallido' where id = $1`, [enviado.cuerpo.id]);

    expect((await anularPago(a.e.propietario(), pagoId)).estado).toBe(200);
    const reintento = await a.e.propietario().post(`/api/correos/${enviado.cuerpo.id}/reintentar`, {});

    const [correo] = await a.correosDe(pagoId);
    expect([correo!.estado, correo!.motivo_de_cancelacion]).toEqual(['cancelado', 'Pago anulado']);
    expect(reintento.estado).toBe(409);
  });

  it('si el aviso se estaba enviando al anular, queda cancelado y el resultado del envío no lo reabre', async () => {
    const { pagoId, contactos } = await a.pagoConProveedor({
      contactos: [{ nombre: 'Ana', correo: 'ana@proveedor.com' }],
    });
    const enviado = await a.enviar(pagoId, {
      destinatarios: [{ origen: 'contacto', origenId: contactos[0]! }],
      copiaALaEmpresa: false,
    });
    await comoPropietario(
      `update core.correos_salientes set estado = 'enviando', intentos = 1,
         bloqueado_hasta = now() + interval '10 minutes' where id = $1`,
      [enviado.cuerpo.id],
    );

    expect((await anularPago(a.e.propietario(), pagoId)).estado).toBe(200);
    const [resuelto] = await comoPropietario<{ estado: string }>(
      `select core.resolver_correo($1::uuid, 'temporal', 'ETIMEDOUT', array[]::text[], 10) as estado`,
      [enviado.cuerpo.id],
    );

    const [correo] = await a.correosDe(pagoId);
    expect(correo!.estado).toBe('cancelado');
    expect(resuelto?.estado).toBe('cancelado');
  });
});

describe('envío automático', () => {
  const configurar = (valor: string) =>
    entorno.soporte.put(`/api/configuracion/${CLAVE_ENVIO}`, { nivel: 'empresa', valor });

  it('con el envío manual (por omisión), registrar el pago no manda nada', async () => {
    const { pagoId } = await a.pagoConProveedor({
      contactos: [{ nombre: 'Ana', correo: 'ana@proveedor.com', recibeAvisosDePago: true }],
    });

    expect(await a.correosDe(pagoId)).toHaveLength(0);
  });

  it('automático: al registrar el pago encola el aviso a los marcados, con la copia a la empresa', async () => {
    expect((await configurar('automatico')).estado).toBe(204);
    try {
      const { pagoId, numero } = await a.pagoConProveedor({
        principal: 'ventas@proveedor.com',
        contactos: [{ nombre: 'Ana', correo: 'ana@proveedor.com', recibeAvisosDePago: true }],
      });

      const [correo, ...otros] = await a.correosDe(pagoId);

      expect(otros).toHaveLength(0);
      expect(correo).toMatchObject({ estado: 'pendiente', asunto: `Aviso de pago ${numero} – Rancho fiscal` });
      expect(await a.destinatariosDe(correo!.id)).toEqual([
        { direccion: 'ana@proveedor.com', clase: 'para', origen: 'contacto' },
        { direccion: 'pagos@rancho.com', clase: 'copia', origen: 'empresa' },
      ]);
      expect((await a.aviso(pagoId)).cuerpo.envio).toBe('automatico');
    } finally {
      await entorno.soporte.delete(`/api/configuracion/${CLAVE_ENVIO}?nivel=empresa`);
    }
  });

  it('automático sin correo para avisos: el pago se registra igual y no hay aviso', async () => {
    expect((await configurar('automatico')).estado).toBe(204);
    try {
      const { pagoId } = await a.pagoConProveedor();

      expect(await a.correosDe(pagoId)).toHaveLength(0);
    } finally {
      await entorno.soporte.delete(`/api/configuracion/${CLAVE_ENVIO}?nivel=empresa`);
    }
  });
});

describe('plantilla del aviso', () => {
  it('el asunto no admite el monto ni los documentos, y un marcador que no existe se rechaza al guardar', async () => {
    const clave = 'cuentas-por-pagar.avisos_de_pago.asunto';

    const conMonto = await entorno.soporte.put(`/api/configuracion/${clave}`, {
      nivel: 'empresa',
      valor: 'Pago por {monto}',
    });
    const inventado = await entorno.soporte.put(`/api/configuracion/${clave}`, {
      nivel: 'empresa',
      valor: 'Hola {nit}',
    });
    const bueno = await entorno.soporte.put(`/api/configuracion/${clave}`, {
      nivel: 'empresa',
      valor: 'Pago {numero} de {empresa}',
    });

    expect(conMonto.estado).toBe(400);
    expect(inventado.estado).toBe(400);
    expect(bueno.estado).toBe(204);
    await entorno.soporte.delete(`/api/configuracion/${clave}?nivel=empresa`);
  });
});
