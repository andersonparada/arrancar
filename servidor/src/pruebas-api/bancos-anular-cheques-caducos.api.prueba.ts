import { beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { conceptoGeneral, crearCuentaBancaria, inversosDe, saldoDe } from './soporte/escenarios-de-bancos.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA_LOTE = '/api/bancos/cheques/anular-en-lote';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let cuentaBancariaId: string;
let conceptoId = '';

const hoy = (): string => new Date().toISOString().slice(0, 10);

async function emitir(fecha: string, beneficiario: string): Promise<string> {
  const siguiente = await cuenta.propietario.get(`/api/bancos/cuentas-bancarias/${cuentaBancariaId}/siguiente-cheque`);
  const emitido = await cuenta.propietario.post(`/api/bancos/cheques/${siguiente.cuerpo.id}/emitir`, {
    fecha,
    monto: '10.00',
    beneficiario,
    noNegociable: true,
    conceptoId,
    referencia: null,
    observaciones: null,
  });
  expect(emitido.estado).toBe(200);
  return siguiente.cuerpo.id as string;
}

const estadoDe = async (chequeId: string) =>
  (await cuenta.propietario.get(`/api/bancos/cheques?cuentaBancariaId=${cuentaBancariaId}`)).cuerpo.find(
    (c: { id: string }) => c.id === chequeId,
  );

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Anular caducos',
    usuario: 'propietarioanularcaducos',
    modulos: ['bancos'],
  });
  conceptoId = await conceptoGeneral(cuenta.propietario);
  cuentaBancariaId = await crearCuentaBancaria(cuenta.propietario, 'Anular caducos');
  await cuenta.propietario.post(`/api/bancos/cuentas-bancarias/${cuentaBancariaId}/chequeras`, {
    serie: null,
    desde: 1,
    hasta: 30,
  });
});

describe('anulación en lote de cheques caducos por API', () => {
  it('con un cheque que no es caduco no se anula ninguno y se dice cuál', async () => {
    const viejo = await emitir('2026-01-10', 'Viejo');
    const reciente = await emitir(hoy(), 'Reciente');

    const respuesta = await cuenta.propietario.post(RUTA_LOTE, { chequeIds: [viejo, reciente], motivo: 'Caducos' });

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('anulacion_en_lote_con_problemas');
    expect(respuesta.cuerpo.error.detalles).toEqual([
      expect.objectContaining({ chequeId: reciente, codigo: 'cheque_no_es_caduco' }),
    ]);
    expect((await estadoDe(viejo)).estado).toBe('emitido');
    expect(await saldoDe(cuenta.propietario, cuentaBancariaId)).toBe('980.00');
  });

  it('anula todos con nota inversa a la fecha común, aunque su mes esté abierto, y deja auditoría por cheque', async () => {
    const otro = await emitir('2026-01-20', 'Otro viejo');
    const ids = (await cuenta.propietario.get(`/api/bancos/cheques-caducos`)).cuerpo.cheques.map(
      (c: { chequeId: string }) => c.chequeId,
    );
    expect(ids).toContain(otro);

    const respuesta = await cuenta.propietario.post(RUTA_LOTE, {
      chequeIds: ids,
      motivo: 'Cheque caduco: más de 7 meses sin cobrar',
      fecha: '2026-09-01',
    });

    expect(respuesta.estado).toBe(200);
    expect(respuesta.cuerpo).toMatchObject({ totalDeCheques: ids.length, fecha: '2026-09-01' });
    expect(await estadoDe(otro)).toMatchObject({ estado: 'anulado', causaDeAnulacion: 'caducidad' });
    const inversos = await inversosDe(cuenta.propietario, cuentaBancariaId);
    expect(inversos).toHaveLength(ids.length);
    expect(inversos.every((m) => m.fecha === '2026-09-01' && m.tipo === 'credito')).toBe(true);
    expect((await cuenta.propietario.get('/api/bancos/cheques-caducos')).cuerpo.cheques).toEqual([]);
    const auditadas = await comoPropietario<{ registro_id: string }>(
      "select registro_id from core.auditoria where cuenta_id = $1 and recurso = 'bancos.cheques' and accion = 'anular'",
      [cuenta.cuentaId],
    );
    expect(auditadas.map((a) => a.registro_id).sort()).toEqual([...ids].sort());
  });

  it('valida el cuerpo: sin cheques, sin motivo o con fecha posterior a hoy', async () => {
    const posterior = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
    const cheque = await emitir('2026-01-15', 'Para validar');

    const sinCheques = await cuenta.propietario.post(RUTA_LOTE, { chequeIds: [], motivo: 'x' });
    const sinMotivo = await cuenta.propietario.post(RUTA_LOTE, { chequeIds: [cheque], motivo: ' ' });
    const futura = await cuenta.propietario.post(RUTA_LOTE, { chequeIds: [cheque], motivo: 'x', fecha: posterior });

    expect(sinCheques.estado).toBe(400);
    expect(sinMotivo.estado).toBe(400);
    expect(futura.estado).toBe(400);
    expect(futura.cuerpo.error.codigo).toBe('fecha_de_anulacion_futura');
  });

  it('pide su propio permiso: anular cheques sueltos no basta', async () => {
    const soloCheques = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Sueltos',
      apellidos: 'Sinlote',
      permisos: ['bancos.cheques.anular', 'bancos.cheques-caducos.ver'],
    });
    const autorizado = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Lotes',
      apellidos: 'Caducos',
      permisos: ['bancos.cheques-caducos.anular'],
    });
    const cuerpo = { chequeIds: ['00000000-0000-4000-8000-000000000001'], motivo: 'x' };

    expect((await soloCheques.post(RUTA_LOTE, cuerpo)).estado).toBe(403);
    expect((await autorizado.post(RUTA_LOTE, cuerpo)).estado).toBe(422);
  });
});
