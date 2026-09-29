import { readFileSync } from 'node:fs';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../configuracion.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { conceptoDeSistema, conceptoGeneral, crearCuentaBancaria } from './soporte/escenarios-de-bancos.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const MIGRACION = new URL(
  '../modulos/bancos/migraciones/0022_h3_conceptos_nuevos_y_sin_cheque_caduco.sql',
  import.meta.url,
);
const RUTA_NOTAS = '/api/bancos/notas';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let ajena: CuentaDePrueba;
let cuentaBancariaId: string;
let conceptoId = '';
let conexion: pg.Client;

const NUEVOS = [
  'Anticipo a proveedores',
  'Fondo de caja chica',
  'Reintegro de caja chica',
  'IGSS, IRTRA e INTECAP',
  'Dividendos pagados',
  'Venta de activo',
  'Préstamo a empresa relacionada',
  'Préstamo de empresa relacionada',
];

const nota = () => ({
  cuentaBancariaId,
  tipo: 'debito',
  fecha: '2026-02-01',
  monto: '10.00',
  referencia: null,
  beneficiario: null,
  observaciones: null,
  conceptoId,
});

async function conceptosDe(empresaId: string): Promise<Array<Record<string, any>>> {
  const { rows } = await conexion.query('select * from bancos.conceptos where empresa_id = $1', [empresaId]);
  return rows;
}

async function emitirCheque(concepto: string, fecha = '2026-02-05') {
  const siguiente = await cuenta.propietario.get(`/api/bancos/cuentas-bancarias/${cuentaBancariaId}/siguiente-cheque`);
  const emision = { fecha, monto: '5.00', beneficiario: 'Proveedor', noNegociable: true, referencia: null };
  return {
    chequeId: siguiente.cuerpo.id as string,
    respuesta: await cuenta.propietario.post(`/api/bancos/cheques/${siguiente.cuerpo.id}/emitir`, {
      ...emision,
      observaciones: null,
      conceptoId: concepto,
    }),
  };
}

/** Lo que había antes de 0022: catálogo con cheque_caduco, «Cheque rechazado» en su grupo viejo y sin los nuevos. */
async function volverAlEstadoAnterior(empresaId: string, cuentaId: string): Promise<void> {
  await conexion.query('delete from bancos.conceptos where empresa_id = $1 and nombre = any($2)', [empresaId, NUEVOS]);
  await conexion.query(
    `insert into bancos.conceptos (empresa_id, clave_de_sistema, nombre, aplica_a, actividad_de_flujo, grupo_de_flujo,
       es_cargo_bancario, pide_datos_de_intereses, admite_factura, activo)
     values ($1, 'cheque_caduco', 'Cheque caduco', 'credito', 'ninguna', null, false, false, false, true)`,
    [empresaId],
  );
  await conexion.query(
    `update bancos.conceptos set grupo_de_flujo = 'Cheques rechazados' where empresa_id = $1 and nombre = 'Cheque rechazado'`,
    [empresaId],
  );
  void cuentaId;
}

async function migrar(): Promise<void> {
  for (const instruccion of readFileSync(MIGRACION, 'utf8').split('--> statement-breakpoint')) {
    await conexion.query(instruccion);
  }
}

beforeAll(async () => {
  conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Ajustes', usuario: 'propietarioajustes', modulos: ['bancos'] });
  ajena = await darDeAltaCuenta(entorno, {
    nombre: 'Ajustes ajena',
    usuario: 'propietarioajustesb',
    modulos: ['bancos'],
  });
  cuentaBancariaId = await crearCuentaBancaria(cuenta.propietario, 'Cuenta de ajustes');
  await cuenta.propietario.post(`/api/bancos/cuentas-bancarias/${cuentaBancariaId}/chequeras`, {
    serie: null,
    desde: 1,
    hasta: 10,
  });
  conceptoId = await conceptoGeneral(cuenta.propietario);
  await conceptoGeneral(ajena.propietario);
});

afterAll(async () => {
  await conexion.end();
});

describe('migración 0022: conceptos nuevos y sin cheque_caduco', () => {
  it('quita cheque_caduco si nadie lo usa, agrega los nuevos y mueve «Cheque rechazado» sin pisar lo editado', async () => {
    await volverAlEstadoAnterior(cuenta.empresaId, cuentaBancariaId);
    await volverAlEstadoAnterior(ajena.empresaId, cuentaBancariaId);
    await conexion.query(
      `update bancos.conceptos set grupo_de_flujo = 'Mi grupo propio' where empresa_id = $1 and nombre = 'Cheque rechazado'`,
      [ajena.empresaId],
    );
    await conexion.query(
      `update bancos.conceptos set aplica_a = 'ambos' where empresa_id = $1 and nombre = 'Fondo de caja chica'`,
      [cuenta.empresaId],
    );

    await migrar();

    const propios = await conceptosDe(cuenta.empresaId);
    expect(propios.some((c) => c.clave_de_sistema === 'cheque_caduco')).toBe(false);
    expect(NUEVOS.every((nombre) => propios.some((c) => c.nombre === nombre && c.activo))).toBe(true);
    expect(propios.find((c) => c.nombre === 'Cheque rechazado')!.grupo_de_flujo).toBe('Cobros a clientes');
    expect(propios.find((c) => c.nombre === 'Dividendos pagados')).toMatchObject({
      actividad_de_flujo: 'financiamiento',
      aplica_a: 'debito',
      clave_de_sistema: null,
    });
    const editado = await conceptosDe(ajena.empresaId);
    expect(editado.find((c) => c.nombre === 'Cheque rechazado')!.grupo_de_flujo).toBe('Mi grupo propio');
  });

  it('es repetible y no duplica ni pisa nada', async () => {
    const antes = (await conceptosDe(cuenta.empresaId)).length;

    await migrar();

    expect(await conceptosDe(cuenta.empresaId)).toHaveLength(antes);
  });

  it('si algún movimiento usara cheque_caduco, lo conserva inactivo en vez de borrarlo', async () => {
    await volverAlEstadoAnterior(cuenta.empresaId, cuentaBancariaId);
    const creada = await cuenta.propietario.post(RUTA_NOTAS, nota());
    await conexion.query(
      `update bancos.movimientos set concepto_id = (select id from bancos.conceptos
         where empresa_id = $1 and clave_de_sistema = 'cheque_caduco') where id = $2`,
      [cuenta.empresaId, creada.cuerpo.id],
    );

    await migrar();

    const caduco = (await conceptosDe(cuenta.empresaId)).find((c) => c.clave_de_sistema === 'cheque_caduco');
    expect(caduco).toMatchObject({ activo: false, nombre: 'Cheque caduco' });
    await conexion.query('update bancos.movimientos set concepto_id = $1 where id = $2', [
      conceptoId,
      creada.cuerpo.id,
    ]);
  });
});

describe('«Pago a proveedores» en un cheque manual por API (P3)', () => {
  it('sin Cuentas por pagar activo, se elige; en una nota sigue sin poder elegirse', async () => {
    const pago = await conceptoDeSistema(cuenta.propietario, 'pago_a_proveedor');

    const cheque = await emitirCheque(pago.id);
    const enNota = await cuenta.propietario.post(RUTA_NOTAS, { ...nota(), conceptoId: pago.id });

    expect(cheque.respuesta.estado).toBe(200);
    expect(cheque.respuesta.cuerpo).toMatchObject({ conceptoId: pago.id, conceptoNombre: 'Pago a proveedores' });
    expect(enNota.estado).toBe(422);
    expect(enNota.cuerpo.error.codigo).toBe('concepto_de_sistema_no_se_elige');
  });

  it('otro concepto de sistema no se elige en un cheque', async () => {
    const sinClasificar = await conceptoDeSistema(cuenta.propietario, 'sin_clasificar');

    const { respuesta } = await emitirCheque(sinClasificar.id);

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('concepto_de_sistema_no_se_elige');
  });
});

describe('causa de anulación del cheque (P1)', () => {
  it('anular a mano la deja como manual; un cheque disponible no tiene', async () => {
    const { chequeId } = await emitirCheque(conceptoId, '2026-02-06');

    const anulado = await cuenta.propietario.post(`/api/bancos/cheques/${chequeId}/anular`, { motivo: 'Error' });
    const lista = await cuenta.propietario.get('/api/bancos/cheques');

    expect(anulado.cuerpo).toMatchObject({ estado: 'anulado', causaDeAnulacion: 'manual' });
    expect(lista.cuerpo.find((c: { id: string }) => c.id === chequeId)).toMatchObject({ causaDeAnulacion: 'manual' });
  });

  it('la base rechaza una causa inventada', async () => {
    await expect(
      conexion.query(`update bancos.cheques set causa_de_anulacion = 'otra' where empresa_id = $1`, [cuenta.empresaId]),
    ).rejects.toThrow(/cheques_causa_de_anulacion_valida/);
  });
});

describe('origen del movimiento (P6)', () => {
  it('las notas de Bancos nacen sin origen', async () => {
    const creada = await cuenta.propietario.post(RUTA_NOTAS, nota());

    expect(creada.cuerpo).toMatchObject({ moduloDeOrigen: null, documentoDeOrigenId: null, puedeReclasificar: true });
  });

  it('el módulo y el documento van juntos o ninguno', async () => {
    const creada = await cuenta.propietario.post(RUTA_NOTAS, nota());

    await expect(
      conexion.query(`update bancos.movimientos set modulo_de_origen = 'cuentas-por-pagar' where id = $1`, [
        creada.cuerpo.id,
      ]),
    ).rejects.toThrow(/movimientos_origen_completo/);
    await expect(
      conexion.query(`update bancos.movimientos set documento_de_origen_id = gen_random_uuid() where id = $1`, [
        creada.cuerpo.id,
      ]),
    ).rejects.toThrow(/movimientos_origen_completo/);
  });

  it('lo que generó otro módulo se ve con su origen y no se reclasifica en Bancos', async () => {
    const creada = await cuenta.propietario.post(RUTA_NOTAS, nota());
    await conexion.query(
      `update bancos.movimientos set modulo_de_origen = 'cuentas-por-pagar', documento_de_origen_id = gen_random_uuid()
       where id = $1`,
      [creada.cuerpo.id],
    );

    const vista = await cuenta.propietario.get(`${RUTA_NOTAS}/${creada.cuerpo.id}`);
    const otro = await cuenta.propietario.post('/api/bancos/conceptos', {
      nombre: 'Otro concepto de prueba',
      aplicaA: 'ambos',
      actividadDeFlujo: 'operacion',
      grupoDeFlujo: null,
      esCargoBancario: false,
      pideDatosDeIntereses: false,
      admiteFactura: false,
      activo: true,
    });
    const reclasificar = await cuenta.propietario.post(`${RUTA_NOTAS}/reclasificar`, {
      movimientoIds: [creada.cuerpo.id],
      conceptoId: otro.cuerpo.id,
    });

    expect(vista.cuerpo).toMatchObject({ moduloDeOrigen: 'cuentas-por-pagar', puedeReclasificar: false });
    expect(vista.cuerpo.documentoDeOrigenId).toMatch(/^[0-9a-f-]{36}$/);
    expect(reclasificar.estado).toBe(422);
    expect(reclasificar.cuerpo.error.codigo).toBe('no_se_reclasifica_lo_de_otro_modulo');
  });
});
