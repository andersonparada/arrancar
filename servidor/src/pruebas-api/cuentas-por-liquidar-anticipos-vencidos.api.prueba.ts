/**
 * Entregar un anticipo a quien tiene anticipos vencidos sin liquidar (CL-r): aviso con el bloqueo apagado; con el bloqueo
 * encendido (`cuentas-por-liquidar.anticipos.bloquear_con_vencidos`), rechazo salvo con el permiso `anticipos.con-vencidos` y
 * un motivo, que queda en el anticipo. Un anticipo anulado, o aún dentro de su plazo, no cuenta como vencido.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import {
  anticipoEnBase,
  cuantosAnticipos,
  EscenarioDeAnticipos,
  ponerFechasAlAnticipo,
  RUTA_DE_ANTICIPOS,
} from './soporte/cuentas-por-liquidar-anticipos.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { consultar, haceDias } from './soporte/escenario-de-documentos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const BLOQUEO = 'cuentas-por-liquidar.anticipos.bloquear_con_vencidos';
const entorno = usarEntornoApi();
let e: EscenarioDeAnticipos;
let conExcepcion: ClienteApi;
let sinExcepcion: ClienteApi;

const bloquear = async (valor: boolean) => {
  const respuesta = await entorno.soporte.put(`/api/configuracion/${BLOQUEO}`, { nivel: 'empresa', valor });
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(204);
};

/** Un beneficiario nuevo con un anticipo abierto que venció hace 10 días. */
async function beneficiarioConVencido(nombres: string) {
  const terceroId = await e.tercero(nombres, 'Vencidos');
  const vencido = await e.entregar(e.conCheque(terceroId, '100.00'));
  await ponerFechasAlAnticipo(vencido.id, haceDias(30), haceDias(10));
  return { terceroId, vencido };
}

beforeAll(async () => {
  e = await EscenarioDeAnticipos.preparar(entorno, 'cxlvencidos');
  await entorno.soporte.put('/api/sesion/empresa-activa', { empresaId: e.cuenta.empresaId });
  conExcepcion = await crearUsuarioConPermisos(entorno, e.cuenta, {
    nombres: 'Con excepción',
    apellidos: 'Anticipos',
    permisos: ['cuentas-por-liquidar.anticipos.crear', 'cuentas-por-liquidar.anticipos.con-vencidos'],
  });
  sinExcepcion = await crearUsuarioConPermisos(entorno, e.cuenta, {
    nombres: 'Sin excepción',
    apellidos: 'Anticipos',
    permisos: ['cuentas-por-liquidar.anticipos.crear'],
  });
});

afterAll(async () => {
  await entorno.soporte.delete(`/api/configuracion/${BLOQUEO}?nivel=empresa`);
});

describe('con el bloqueo apagado (por omisión)', () => {
  it('entrega y solo avisa de los anticipos vencidos', async () => {
    const { terceroId, vencido } = await beneficiarioConVencido('Sinbloqueo');

    const nuevo = await e.entregar(e.conCheque(terceroId, '50.00'));

    expect(nuevo.avisos).toContain(`Sinbloqueo Vencidos tiene vencido el anticipo ${vencido.numero} sin liquidar.`);
    expect(nuevo.motivoConVencidos).toBeNull();
  });

  it('el aviso no sale si el otro anticipo aún está en plazo', async () => {
    const terceroId = await e.tercero('Enplazo', 'Vencidos');
    await e.entregar(e.conCheque(terceroId, '100.00'));

    const nuevo = await e.entregar(e.conCheque(terceroId, '50.00'));

    expect(nuevo.avisos.filter((aviso: string) => aviso.includes('vencido'))).toEqual([]);
  });

  it('el aviso fijo del vencido sale en su ficha', async () => {
    const { vencido } = await beneficiarioConVencido('Fichavencida');

    const ficha = (await e.propietario().get(`${RUTA_DE_ANTICIPOS}/${vencido.id}`)).cuerpo;

    expect(ficha).toMatchObject({ vencido: true, diasVencido: 10, diasDesdeLaEntrega: 30 });
    expect(ficha.aviso).toContain(`El anticipo ${vencido.numero} venció el`);
    expect(ficha.avisos).toContain(ficha.aviso);
  });
});

describe('con el bloqueo encendido', () => {
  it('rechaza sin el permiso de excepción y no deja nada', async () => {
    await bloquear(true);
    const { terceroId, vencido } = await beneficiarioConVencido('Bloqueado');
    const antes = await cuantosAnticipos();

    const respuesta = await sinExcepcion.post(RUTA_DE_ANTICIPOS, e.conCheque(terceroId, '50.00'));

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('beneficiario_con_vencidos');
    expect(respuesta.cuerpo.error.mensaje).toContain(`(${vencido.numero})`);
    expect(await cuantosAnticipos()).toBe(antes);
  });

  it('con el permiso exige el motivo y lo guarda en el anticipo', async () => {
    await bloquear(true);
    const { terceroId } = await beneficiarioConVencido('Conexcepcion');

    const sinMotivo = await conExcepcion.post(RUTA_DE_ANTICIPOS, e.conCheque(terceroId, '50.00'));
    const conMotivo = await conExcepcion.post(
      RUTA_DE_ANTICIPOS,
      e.conCheque(terceroId, '50.00', { motivoConVencidos: ' Viaje urgente a la finca ' }),
    );

    expect(sinMotivo.cuerpo.error.codigo).toBe('motivo_con_vencidos_obligatorio');
    expect(conMotivo.estado, JSON.stringify(conMotivo.cuerpo)).toBe(201);
    expect(conMotivo.cuerpo.motivoConVencidos).toBe('Viaje urgente a la finca');
    expect((await anticipoEnBase(conMotivo.cuerpo.id)).motivo_con_vencidos).toBe('Viaje urgente a la finca');
  });

  it('a quien no tiene vencidos se le entrega sin pedir nada', async () => {
    await bloquear(true);
    const terceroId = await e.tercero('Alcorriente', 'Vencidos');
    await e.entregar(e.conCheque(terceroId, '100.00'));

    const nuevo = await e.entregar(e.conCheque(terceroId, '50.00'));

    expect(nuevo.motivoConVencidos).toBeNull();
  });

  it('un anticipo anulado no cuenta como vencido', async () => {
    await bloquear(true);
    const { terceroId, vencido } = await beneficiarioConVencido('Yaanulado');
    await consultar(
      `update cuentas_por_liquidar.anticipos set estado = 'anulado', fecha_de_anulacion = fecha, anulado_en = now(),
              anulado_por = creado_por, motivo_de_anulacion = 'Prueba' where id = $1`,
      [vencido.id],
    );

    const nuevo = await e.entregar(e.conCheque(terceroId, '50.00'));

    expect(nuevo.estado).toBe('abierto');
  });
});
