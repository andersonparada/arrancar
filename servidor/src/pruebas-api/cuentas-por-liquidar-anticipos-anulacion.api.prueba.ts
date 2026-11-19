/**
 * Anular un anticipo (CL-2), desde Cuentas por liquidar y desde Bancos: la fecha contable de la anulación sin y con inverso,
 * la auditoría, el evento, lo que se rechaza (gastos vigentes, cheque cobrado, liquidado o ya anulado), lo que Bancos no puede
 * corregir ni eliminar y el aviso idempotente.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import '../modulos/core/contratos/cuentas-por-liquidar.contratos.js';
import { busEventos } from '../modulos/core/eventos/bus-eventos.js';
import type { ClienteApi } from './soporte/cliente-api.js';
import {
  anticipoEnBase,
  chequeDelAnticipo,
  EscenarioDeAnticipos,
  movimientoDelAnticipo,
  ponerFechasAlAnticipo,
  RUTA_DE_ANTICIPOS,
} from './soporte/cuentas-por-liquidar-anticipos.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { consultar, haceDias, HOY } from './soporte/escenario-de-documentos.js';
import { saldoDe } from './soporte/escenarios-de-bancos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';
import { auditoriaDe } from './soporte/ordenes-de-bancos.js';
import { cuentaConFondos, iniciarEnero, MES_CONCILIADO } from './soporte/cuentas-por-pagar-pagos-cambios.js';

const entorno = usarEntornoApi();
let e: EscenarioDeAnticipos;
let ana: string;
let soloCrear: ClienteApi;

beforeAll(async () => {
  e = await EscenarioDeAnticipos.preparar(entorno, 'cxlanulacion');
  ana = await e.tercero('Ana', 'Anulada');
  soloCrear = await crearUsuarioConPermisos(entorno, e.cuenta, {
    nombres: 'Solo crea',
    apellidos: 'Anticipos',
    permisos: ['cuentas-por-liquidar.anticipos.ver', 'cuentas-por-liquidar.anticipos.crear'],
  });
});

const anular = (id: string, cuerpo: Record<string, unknown> = { motivo: 'Se entregó por error' }) =>
  e.propietario().post(`${RUTA_DE_ANTICIPOS}/${id}/anular`, cuerpo);

const anularElCheque = async (anticipoId: string) =>
  e.propietario().post(`/api/bancos/cheques/${await chequeDelAnticipo(anticipoId)}/anular`, { motivo: 'Desde Bancos' });

describe('anular desde Cuentas por liquidar', () => {
  it('con cheque, sin inverso: queda anulado con la fecha del anticipo, devuelve el saldo, se audita y se publica', async () => {
    const saldoAntes = await saldoDe(e.propietario(), e.cuentaBancariaId);
    const anticipo = await e.entregar(e.conCheque(ana, '100.00', { fecha: haceDias(5) }));
    const eventos: Array<{ anulacionEnBancos: string; fecha: string }> = [];
    const baja = busEventos.suscribir('cuentas-por-liquidar.anticipo_anulado', (datos) => {
      eventos.push(datos);
    });

    const anulado = await anular(anticipo.id);
    baja();

    expect(anulado.estado, JSON.stringify(anulado.cuerpo)).toBe(200);
    expect(anulado.cuerpo).toMatchObject({
      estado: 'anulado',
      anulacion: { fecha: haceDias(5), motivo: 'Se entregó por error' },
      porJustificar: '0.00',
      puedeAnular: false,
      puedeLiquidar: false,
    });
    expect(await anticipoEnBase(anticipo.id)).toMatchObject({ estado: 'anulado', fecha_de_anulacion: haceDias(5) });
    expect(await saldoDe(e.propietario(), e.cuentaBancariaId)).toBe(saldoAntes);
    expect(await auditoriaDe(anticipo.id)).toEqual([
      { accion: 'anular', motivo: 'Se entregó por error', recurso: 'cuentas-por-liquidar.anticipos' },
    ]);
    expect(eventos).toMatchObject([{ anulacionEnBancos: 'sin_inverso', fecha: haceDias(5) }]);
  });

  it('con nota de débito se anula con inverso y su fecha contable es la del inverso', async () => {
    const anticipo = await e.entregar(e.conNota(ana, '100.00', { fecha: haceDias(5) }));

    const anulado = await anular(anticipo.id, { motivo: 'Transferencia equivocada', fecha: HOY });

    expect(anulado.estado, JSON.stringify(anulado.cuerpo)).toBe(200);
    expect((await movimientoDelAnticipo(anticipo.movimiento.id)).inverso_fecha).toBe(HOY);
    expect(await anticipoEnBase(anticipo.id)).toMatchObject({
      estado: 'anulado',
      fecha: haceDias(5),
      fecha_de_anulacion: HOY,
    });
  });

  it('pide el motivo y uno ya anulado no se anula otra vez', async () => {
    const anticipo = await e.entregar(e.conCheque(ana, '10.00'));

    const sinMotivo = await anular(anticipo.id, { motivo: '   ' });
    await anular(anticipo.id);
    const otra = await anular(anticipo.id);

    expect(sinMotivo.estado).toBe(400);
    expect(otra.cuerpo.error.codigo).toBe('anticipo_ya_anulado');
  });

  it('exige anticipos.anular y un anticipo de otra empresa es 404', async () => {
    const anticipo = await e.entregar(e.conCheque(ana, '10.00'));

    expect((await soloCrear.post(`${RUTA_DE_ANTICIPOS}/${anticipo.id}/anular`, { motivo: 'x' })).estado).toBe(403);
    expect((await anular(crypto.randomUUID())).estado).toBe(404);
    expect((await anticipoEnBase(anticipo.id)).estado).toBe('abierto');
  });
});

describe('lo que impide anular', () => {
  it('con gastos vigentes se rechaza aquí y en Bancos, y el cheque sigue emitido', async () => {
    const anticipo = await e.entregar(e.conCheque(ana, '1000.00'));
    await e.sembrarGasto(anticipo.id, '400.00');

    const desdeAqui = await anular(anticipo.id);
    const desdeBancos = await anularElCheque(anticipo.id);

    for (const respuesta of [desdeAqui, desdeBancos]) {
      expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(422);
      expect(respuesta.cuerpo.error.codigo).toBe('anticipo_con_gastos');
    }
    const ficha = (await e.propietario().get(`${RUTA_DE_ANTICIPOS}/${anticipo.id}`)).cuerpo;
    expect(ficha).toMatchObject({ estado: 'abierto', gastado: '400.00', porJustificar: '600.00', puedeAnular: false });
    const [cheque] = await consultar<{ estado: string }>('select estado from bancos.cheques where id = $1', [
      await chequeDelAnticipo(anticipo.id),
    ]);
    expect(cheque!.estado).toBe('emitido');
  });

  it('con el cheque ya cobrado (conciliado) se rechaza aquí y en Bancos', async () => {
    const cuenta = await cuentaConFondos(e.propietario(), 'Cuenta de anticipos cobrados');
    const anticipo = await e.entregar(e.conCheque(ana, '500.00', { chequeraId: cuenta.chequeraId }));
    await ponerFechasAlAnticipo(anticipo.id, MES_CONCILIADO, '2026-02-10');
    await iniciarEnero(e.propietario(), cuenta.cuentaBancariaId, [anticipo.movimiento.id]);

    for (const respuesta of [await anular(anticipo.id), await anularElCheque(anticipo.id)]) {
      expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(422);
      expect(respuesta.cuerpo.error.codigo).toBe('anticipo_cobrado');
    }
    expect((await anticipoEnBase(anticipo.id)).estado).toBe('abierto');
  });

  it('liquidado se rechaza aquí y en Bancos', async () => {
    const anticipo = await e.entregar(e.conCheque(ana, '100.00'));
    await consultar(
      `update cuentas_por_liquidar.anticipos
          set estado = 'liquidado', fecha_de_liquidacion = fecha, liquidado_en = now(), liquidado_por = creado_por,
              no_liquidado = 100, destino_de_no_liquidado = 'perdida', motivo_de_no_liquidado = 'Se perdió'
        where id = $1`,
      [anticipo.id],
    );

    for (const respuesta of [await anular(anticipo.id), await anularElCheque(anticipo.id)]) {
      expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(422);
      expect(respuesta.cuerpo.error.codigo).toBe('anticipo_liquidado');
    }
  });
});

describe('desde Bancos', () => {
  it('anular el cheque de un anticipo abierto sin gastos lo anula con la fecha del cheque, lo audita y lo publica', async () => {
    const saldoAntes = await saldoDe(e.propietario(), e.cuentaBancariaId);
    const anticipo = await e.entregar(e.conCheque(ana, '100.00', { fecha: haceDias(4) }));

    const respuesta = await anularElCheque(anticipo.id);

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(await anticipoEnBase(anticipo.id)).toMatchObject({ estado: 'anulado', fecha_de_anulacion: haceDias(4) });
    expect(await saldoDe(e.propietario(), e.cuentaBancariaId)).toBe(saldoAntes);
    expect(await auditoriaDe(anticipo.id)).toMatchObject([
      { accion: 'anular', motivo: 'Desde Bancos', recurso: 'cuentas-por-liquidar.anticipos' },
    ]);
  });

  it('Bancos no puede corregir ni eliminar lo que registró Cuentas por liquidar', async () => {
    const anticipo = await e.entregar(e.conNota(ana, '100.00'));

    const eliminar = await e
      .propietario()
      .delete(`/api/bancos/notas/${anticipo.movimiento.id}`, { motivo: 'Corrección' });

    expect(eliminar.estado, JSON.stringify(eliminar.cuerpo)).toBe(422);
    expect(eliminar.cuerpo.error.codigo).toBe('movimiento_de_cuentas_por_liquidar');
    expect((await anticipoEnBase(anticipo.id)).estado).toBe('abierto');
  });
});
