import { readFileSync } from 'node:fs';
import pg from 'pg';
import { beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../configuracion.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { conceptoGeneral, crearCuentaBancaria } from './soporte/escenarios-de-bancos.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const MIGRACION = new URL('../modulos/bancos/migraciones/0018_h3b_concepto_en_movimientos.sql', import.meta.url);
const RUTA_NOTAS = '/api/bancos/notas';
const RUTA_TRANSFERENCIAS = '/api/bancos/transferencias';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let origen: string;
let destino: string;
let conceptoId = '';

const nota = (cambios: Record<string, unknown> = {}) => ({
  cuentaBancariaId: origen,
  tipo: 'credito',
  fecha: '2026-02-01',
  monto: '10.00',
  referencia: null,
  beneficiario: null,
  observaciones: null,
  conceptoId,
  ...cambios,
});

/** Lo que había antes de H3b: sin concepto en los movimientos y sin catálogo en la empresa. */
async function volverAlEstadoAnteriorYMigrar(): Promise<void> {
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  await conexion.query('alter table bancos.movimientos drop constraint movimientos_concepto_de_la_empresa_fk');
  await conexion.query('drop index bancos.movimientos_concepto_fecha_idx');
  await conexion.query('alter table bancos.movimientos alter column concepto_id drop not null');
  await conexion.query('update bancos.movimientos set concepto_id = null where empresa_id = $1', [cuenta.empresaId]);
  await conexion.query('delete from bancos.conceptos where empresa_id = $1', [cuenta.empresaId]);
  const yaExisten = (instruccion: string) =>
    instruccion.includes('ADD COLUMN') || instruccion.includes('"conceptos" ADD');
  for (const instruccion of readFileSync(MIGRACION, 'utf8').split('--> statement-breakpoint')) {
    if (!yaExisten(instruccion)) await conexion.query(instruccion);
  }
  await conexion.end();
}

/** Nombre del concepto de cada movimiento de la cuenta, por su etiqueta. */
async function conceptosPorEtiqueta(etiquetas: Map<string, string>): Promise<Record<string, string>> {
  const conceptos: Record<string, string> = {};
  for (const cuentaId of [origen, destino]) {
    const reporte = await cuenta.propietario.get(`/api/bancos/movimientos/reporte?cuentaBancariaId=${cuentaId}`);
    for (const fila of reporte.cuerpo.filas) conceptos[etiquetas.get(fila.id) ?? fila.id] = fila.conceptoNombre;
  }
  return conceptos;
}

/** Etiqueta los saldos iniciales, las notas de transferencia y los inversos, para revisarlos después. */
async function etiquetarLoDemas(etiquetas: Map<string, string>, notaAnuladaId: string): Promise<void> {
  const filas: Array<Record<string, any>> = [];
  for (const cuentaId of [origen, destino]) {
    const reporte = await cuenta.propietario.get(`/api/bancos/movimientos/reporte?cuentaBancariaId=${cuentaId}`);
    filas.push(...reporte.cuerpo.filas);
  }
  const deTransferencia = new Set(filas.filter((f) => f.transferenciaId).map((f) => f.id as string));
  for (const fila of filas) {
    if (fila.saldoInicial) etiquetas.set(fila.id, `saldoInicial:${fila.cuentaBancariaId === origen}`);
    else if (fila.revierteAId === notaAnuladaId) etiquetas.set(fila.id, 'inversoDeLaNotaAnulada');
    else if (deTransferencia.has(fila.revierteAId)) etiquetas.set(fila.id, `inversoDeTransferencia:${fila.tipo}`);
    else if (fila.transferenciaId) etiquetas.set(fila.id, `transferencia:${fila.tipo}`);
  }
}

async function emitirCheque(): Promise<string> {
  await cuenta.propietario.post(`/api/bancos/cuentas-bancarias/${origen}/chequeras`, {
    serie: null,
    desde: 1,
    hasta: 3,
  });
  const siguiente = await cuenta.propietario.get(`/api/bancos/cuentas-bancarias/${origen}/siguiente-cheque`);
  const emitido = await cuenta.propietario.post(`/api/bancos/cheques/${siguiente.cuerpo.id}/emitir`, {
    fecha: '2026-02-05',
    monto: '5.00',
    beneficiario: 'Proveedor',
    noNegociable: true,
    conceptoId,
    referencia: null,
    observaciones: null,
  });
  return emitido.cuerpo.id as string;
}

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Clasificada',
    usuario: 'propietarioclasificado',
    modulos: ['bancos'],
  });
  origen = await crearCuentaBancaria(cuenta.propietario, 'Clasificada origen');
  destino = await crearCuentaBancaria(cuenta.propietario, 'Clasificada destino');
  conceptoId = await conceptoGeneral(cuenta.propietario);
});

describe('migración que clasifica los movimientos existentes (0018)', () => {
  it('siembra el catálogo y aplica las reglas deterministas: nada inferido', async () => {
    const etiquetas = new Map<string, string>();
    const nota1 = await cuenta.propietario.post(RUTA_NOTAS, nota());
    const anulada = await cuenta.propietario.post(RUTA_NOTAS, nota({ tipo: 'debito', fecha: '2026-02-02' }));
    await cuenta.propietario.post(`${RUTA_NOTAS}/${anulada.cuerpo.id}/anular`, {
      motivo: 'Error',
      fecha: '2026-02-03',
    });
    const transferencia = await cuenta.propietario.post(RUTA_TRANSFERENCIAS, {
      cuentaOrigenId: origen,
      cuentaDestinoId: destino,
      fecha: '2026-02-10',
      monto: '1.00',
      referencia: null,
      observaciones: null,
    });
    await cuenta.propietario.post(`${RUTA_TRANSFERENCIAS}/${transferencia.cuerpo.id}/anular`, {
      motivo: 'Error',
      fecha: '2026-02-11',
    });
    const cheque = await emitirCheque();
    etiquetas.set(nota1.cuerpo.id, 'nota');
    etiquetas.set(anulada.cuerpo.id, 'notaAnulada');
    etiquetas.set(cheque, 'cheque');
    await etiquetarLoDemas(etiquetas, anulada.cuerpo.id);

    await volverAlEstadoAnteriorYMigrar();

    expect(await conceptosPorEtiqueta(etiquetas)).toMatchObject({
      nota: 'Sin clasificar',
      notaAnulada: 'Sin clasificar',
      inversoDeLaNotaAnulada: 'Sin clasificar',
      cheque: 'Sin clasificar',
      'saldoInicial:true': 'Saldo inicial',
      'saldoInicial:false': 'Saldo inicial',
      'transferencia:debito': 'Transferencia entre cuentas',
      'transferencia:credito': 'Transferencia entre cuentas',
      'inversoDeTransferencia:credito': 'Transferencia entre cuentas',
      'inversoDeTransferencia:debito': 'Transferencia entre cuentas',
    });
  });

  it('dejó el catálogo completo de la empresa: los de sistema y los sugeridos', async () => {
    const lista = await cuenta.propietario.get('/api/bancos/conceptos');
    const claves = (lista.cuerpo as Array<{ claveDeSistema: string | null }>)
      .map((c) => c.claveDeSistema)
      .filter(Boolean);

    expect(lista.cuerpo).toHaveLength(16);
    expect(claves.sort()).toEqual([
      'cheque_caduco',
      'pago_a_proveedor',
      'saldo_inicial',
      'sin_clasificar',
      'transferencia',
    ]);
  });
});
