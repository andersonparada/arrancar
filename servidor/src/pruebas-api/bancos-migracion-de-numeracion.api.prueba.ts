import { readFileSync } from 'node:fs';
import pg from 'pg';
import { beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../configuracion.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearCuentaBancaria } from './soporte/escenarios-de-bancos.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const MIGRACION = new URL('../modulos/bancos/migraciones/0014_h9_numerar_datos_existentes.sql', import.meta.url);
const RUTA_NOTAS = '/api/bancos/notas';
const RUTA_TRANSFERENCIAS = '/api/bancos/transferencias';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let origen: string;
let destino: string;

const nota = (tipo: string, fecha: string) => ({
  cuentaBancariaId: origen,
  tipo,
  fecha,
  monto: '10.00',
  referencia: null,
  beneficiario: null,
  observaciones: null,
});

const transferencia = (fecha: string) => ({
  cuentaOrigenId: origen,
  cuentaDestinoId: destino,
  fecha,
  monto: '1.00',
  referencia: null,
  observaciones: null,
});

/** Deja los datos como estaban antes de H9 (sin número ni correlativos) y corre el SQL de la migración. */
async function volverAlEstadoAnteriorYMigrar(): Promise<void> {
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  await conexion.query('update bancos.movimientos set numero = null, anio_de_numero = 0');
  await conexion.query('update bancos.transferencias set numero = null, anio_de_numero = 0');
  await conexion.query('delete from core.correlativos');
  for (const instruccion of readFileSync(MIGRACION, 'utf8').split('--> statement-breakpoint')) {
    await conexion.query(instruccion);
  }
  await conexion.end();
}

/** Todos los movimientos de la cuenta, con la etiqueta que las pruebas les dieron. */
async function numerosPorEtiqueta(etiquetas: Map<string, string>): Promise<Record<string, number | null>> {
  const numeros: Record<string, number | null> = {};
  for (const cuentaId of [origen, destino]) {
    const reporte = await cuenta.propietario.get(`/api/bancos/movimientos/reporte?cuentaBancariaId=${cuentaId}`);
    for (const fila of reporte.cuerpo.filas) numeros[etiquetas.get(fila.id) ?? fila.id] = fila.numero;
  }
  return numeros;
}

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Migrada', usuario: 'propietariomigrado', modulos: ['bancos'] });
  origen = await crearCuentaBancaria(cuenta.propietario, 'Migrada origen');
  destino = await crearCuentaBancaria(cuenta.propietario, 'Migrada destino');
});

describe('migración que numera los datos existentes', () => {
  it('numera por empresa y tipo en orden (fecha, creado_en) y deja el siguiente en el último + 1', async () => {
    const etiquetas = new Map<string, string>();
    const registrar = async (etiqueta: string, ruta: string, datos: object) => {
      const respuesta = await cuenta.propietario.post(ruta, datos);
      etiquetas.set(respuesta.cuerpo.id, etiqueta);
      return respuesta.cuerpo;
    };
    await registrar('creditoDeMarzo', RUTA_NOTAS, nota('credito', '2026-03-01'));
    const febreroA = await registrar('creditoDeFebreroA', RUTA_NOTAS, nota('credito', '2026-02-01'));
    await registrar('creditoDeFebreroB', RUTA_NOTAS, nota('credito', '2026-02-01'));
    await registrar('debito', RUTA_NOTAS, nota('debito', '2026-02-15'));
    await registrar('transferenciaDeMarzo', RUTA_TRANSFERENCIAS, transferencia('2026-03-10'));
    await registrar('transferenciaDeFebrero', RUTA_TRANSFERENCIAS, transferencia('2026-02-10'));
    await cuenta.propietario.post(`${RUTA_NOTAS}/${febreroA.id}/anular`, { motivo: 'Error', fecha: '2026-04-01' });
    const reporte = await cuenta.propietario.get(`/api/bancos/movimientos/reporte?cuentaBancariaId=${origen}`);
    for (const fila of [...reporte.cuerpo.filas]) {
      if (fila.revierteAId) etiquetas.set(fila.id, 'inversoDelCreditoDeFebreroA');
      if (fila.transferenciaId) etiquetas.set(fila.id, `notaDeTransferencia:${fila.tipo}:${fila.fecha}`);
      if (fila.saldoInicial) etiquetas.set(fila.id, `saldoInicial:${fila.cuentaBancariaId === origen}`);
    }

    await volverAlEstadoAnteriorYMigrar();

    const numeros = await numerosPorEtiqueta(etiquetas);
    expect(numeros).toMatchObject({
      creditoDeFebreroA: 1,
      creditoDeFebreroB: 2,
      creditoDeMarzo: 3,
      debito: 1,
      inversoDelCreditoDeFebreroA: 2,
      'saldoInicial:true': null,
      'notaDeTransferencia:debito:2026-03-10': null,
      'notaDeTransferencia:debito:2026-02-10': null,
    });
    const transferencias = await cuenta.propietario.get(RUTA_TRANSFERENCIAS);
    const porFecha = Object.fromEntries(
      transferencias.cuerpo.map((t: { fecha: string; numero: number }) => [t.fecha, t.numero]),
    );
    expect(porFecha).toEqual({ '2026-02-10': 1, '2026-03-10': 2 });
  });

  it('el siguiente número que se asigna después de migrar es el último + 1', async () => {
    const credito = await cuenta.propietario.post(RUTA_NOTAS, nota('credito', '2026-05-01'));
    const debito = await cuenta.propietario.post(RUTA_NOTAS, nota('debito', '2026-05-01'));
    const enviada = await cuenta.propietario.post(RUTA_TRANSFERENCIAS, transferencia('2026-05-01'));

    expect([credito.cuerpo.numero, debito.cuerpo.numero, enviada.cuerpo.numero]).toEqual([4, 3, 3]);
  });
});
