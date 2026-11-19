/**
 * BS-3: anular un cheque de la carga inicial (siempre con inverso y concepto de apertura), por Cheques, por la ventana
 * de saldos iniciales y en lote; el flujo de efectivo con el inverso en «sin actividad»; el posfechado como cheque normal.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import {
  anularPartida,
  chequeDeLaPartida,
  escucharAnulacionesDeApertura,
  inversoDeApertura,
  movimientoDeApertura,
} from './soporte/anulaciones-de-apertura.js';
import { agregarPartida, empresaConInicio, fichaDe, guardarSaldo, partida } from './soporte/apertura-por-api.js';
import { crearCuentaSinSaldo } from './soporte/escenarios-de-apertura.js';
import { conceptoGeneral } from './soporte/escenarios-de-bancos.js';
import type { CuentaDePrueba } from './soporte/escenarios.js';
import { usarEntornoApi } from './soporte/entorno-api.js';

const entorno = usarEntornoApi();
const eventos = escucharAnulacionesDeApertura();
let cuenta: CuentaDePrueba;
const usuario = () => cuenta.propietario;

/** Una cuenta con saldo del banco de 1,000.00 y un cheque en circulación de 100.00 (libros al corte: 900.00). */
async function cuentaConCheque(numero: number) {
  const cuentaId = await crearCuentaSinSaldo(usuario());
  expect((await guardarSaldo(usuario(), cuentaId, '1000.00')).estado).toBe(200);
  const cargado = await agregarPartida(
    usuario(),
    cuentaId,
    partida('cheque_en_circulacion', { numeroDeCheque: numero }),
  );
  expect(cargado.estado).toBe(201);
  const movimientoId = cargado.cuerpo.partida.movimientoId as string;
  return { cuentaId, movimientoId, chequeId: await chequeDeLaPartida(movimientoId) };
}

beforeAll(async () => {
  cuenta = await empresaConInicio(entorno, {
    nombre: 'Anular cheques de apertura',
    usuario: 'propietarioanularapertura',
  });
});

describe('anular un cheque de la carga inicial desde Cheques', () => {
  it('con el mes abierto crea el inverso con el concepto de apertura, deja el original revertido y avisa por evento', async () => {
    const { cuentaId, movimientoId, chequeId } = await cuentaConCheque(51);

    const anulado = await usuario().post(`/api/bancos/cheques/${chequeId}/anular`, {
      motivo: 'No se cobró',
      fecha: '2026-02-10',
    });

    expect(anulado.estado).toBe(200);
    expect(anulado.cuerpo).toMatchObject({ estado: 'anulado', parteDeApertura: 'cheque_en_circulacion' });
    expect(await movimientoDeApertura(movimientoId)).toMatchObject({ anulado_en: null });
    expect((await movimientoDeApertura(movimientoId)).revertido_en).not.toBeNull();
    expect(await inversoDeApertura(movimientoId)).toMatchObject({
      concepto: 'anulacion_de_apertura',
      fecha: '2026-02-10',
      tipo: 'credito',
      beneficiario: 'Proveedor Uno',
    });
    const ficha = await fichaDe(usuario(), cuentaId);
    expect(ficha.saldoEnLibrosAlCorte).toBe('900.00');
    expect(ficha.partidas.find((p: { movimientoId: string }) => p.movimientoId === movimientoId)).toMatchObject({
      revertida: true,
      puedeAnular: false,
    });
    expect(eventos.find((e) => e.movimientoId === movimientoId)).toMatchObject({
      parte: 'cheque_en_circulacion',
      cuentaBancariaId: cuentaId,
      fecha: '2026-02-10',
      montoCentavos: 10000,
      beneficiario: 'Proveedor Uno',
      numeroDeCheque: 51,
      pagador: null,
      motivo: 'No se cobró',
    });
  });

  it('con una fecha anterior o igual al corte se rechaza (400, campo fecha) y nada cambia', async () => {
    const { cuentaId, movimientoId, chequeId } = await cuentaConCheque(52);

    for (const fecha of ['2025-12-31', '2025-06-01']) {
      const rechazado = await usuario().post(`/api/bancos/cheques/${chequeId}/anular`, { motivo: 'x', fecha });
      expect(rechazado.estado).toBe(400);
      expect(rechazado.cuerpo.error.codigo).toBe('inverso_dentro_de_la_apertura');
      expect(rechazado.cuerpo.error.mensaje).toContain('31/12/2025');
    }
    expect((await movimientoDeApertura(movimientoId)).revertido_en).toBeNull();
    expect((await fichaDe(usuario(), cuentaId)).partidas).toHaveLength(2);
  });

  it('sin fecha usa hoy; la ventana de saldos iniciales hace lo mismo y avisa que ya no se puede anular otra vez', async () => {
    const { cuentaId, movimientoId } = await cuentaConCheque(53);

    const anulada = await anularPartida(usuario(), { cuentaId, movimientoId }, { fecha: undefined });

    expect(anulada.estado).toBe(200);
    expect(anulada.cuerpo.partida).toMatchObject({ movimientoId, revertida: true, puedeAnular: false });
    expect((await inversoDeApertura(movimientoId)).id).toBe(anulada.cuerpo.inversoId);
    const otra = await anularPartida(usuario(), { cuentaId, movimientoId });
    expect(otra.estado).toBeGreaterThanOrEqual(400);
  });
});

describe('anular cheques de la carga inicial en lote', () => {
  it('aparecen como origen «apertura», se anulan juntos con su inverso y una fecha del corte rechaza todo el lote', async () => {
    const uno = await cuentaConCheque(61);
    const dos = await cuentaConCheque(62);
    const reporte = await usuario().get('/api/bancos/cheques-caducos');
    const filas = reporte.cuerpo.cheques as Array<{ chequeId: string; origen: string; parteDeApertura: string | null }>;
    expect(filas.find((f) => f.chequeId === uno.chequeId)).toMatchObject({
      origen: 'apertura',
      parteDeApertura: 'cheque_en_circulacion',
    });

    const rechazado = await usuario().post('/api/bancos/cheques/anular-en-lote', {
      chequeIds: [uno.chequeId, dos.chequeId],
      motivo: 'Caducos',
      fecha: '2025-12-31',
    });
    expect(rechazado.estado).toBeGreaterThanOrEqual(400);
    expect(JSON.stringify(rechazado.cuerpo)).toContain('inverso_dentro_de_la_apertura');
    expect((await movimientoDeApertura(uno.movimientoId)).revertido_en).toBeNull();

    const lote = await usuario().post('/api/bancos/cheques/anular-en-lote', {
      chequeIds: [uno.chequeId, dos.chequeId],
      motivo: 'Caducos',
    });
    expect(lote.estado).toBe(200);
    expect(lote.cuerpo).toMatchObject({ totalDeCheques: 2, montoTotal: '200.00' });
    expect((await inversoDeApertura(uno.movimientoId)).concepto).toBe('anulacion_de_apertura');
    expect((await inversoDeApertura(dos.movimientoId)).concepto).toBe('anulacion_de_apertura');
    expect(eventos.filter((e) => [uno.movimientoId, dos.movimientoId].includes(e.movimientoId))).toHaveLength(2);
  });
});

describe('el flujo de efectivo con el inverso de una partida de apertura', () => {
  it('sale en «Otros movimientos sin actividad» y el control cuadra', async () => {
    const aparte = await empresaConInicio(entorno, {
      nombre: 'Flujo de apertura',
      usuario: 'propietarioflujoapertura',
    });
    const cuentaId = await crearCuentaSinSaldo(aparte.propietario);
    await guardarSaldo(aparte.propietario, cuentaId, '1000.00');
    const cheque = await agregarPartida(aparte.propietario, cuentaId, partida('cheque_en_circulacion'));
    const anulada = await anularPartida(aparte.propietario, {
      cuentaId,
      movimientoId: cheque.cuerpo.partida.movimientoId,
    });
    expect(anulada.estado, JSON.stringify(anulada.cuerpo)).toBe(200);

    const flujo = await aparte.propietario.get('/api/bancos/flujo-de-efectivo?desde=2026-02-01&hasta=2026-02-28');

    expect(flujo.estado).toBe(200);

    expect(flujo.cuerpo.lineasAparte.map((l: { clave: string; neto: string }) => [l.clave, l.neto])).toContainEqual([
      'sin_actividad',
      '100.00',
    ]);
    expect(flujo.cuerpo.actividades.every((a: { lineas: unknown[] }) => a.lineas.length === 0)).toBe(true);
    expect(flujo.cuerpo.control).toMatchObject({
      saldoAlInicio: '900.00',
      saldosInicialesDelRango: '0.00',
      flujoNeto: '100.00',
      saldoAlFinal: '1000.00',
      cuadra: true,
    });
  });
});

describe('el cheque posfechado se anula como cualquier cheque', () => {
  it('con la carga cerrada se anula a la antigua (sin inverso) y no se anula desde saldos iniciales', async () => {
    const aparte = await empresaConInicio(entorno, {
      nombre: 'Posfechado cerrado',
      usuario: 'propietarioposfechadocerrado',
    });
    const cuentaId = await crearCuentaSinSaldo(aparte.propietario);
    await guardarSaldo(aparte.propietario, cuentaId, '1000.00');
    const conceptoId = await conceptoGeneral(aparte.propietario);
    const cargado = await agregarPartida(aparte.propietario, cuentaId, partida('cheque_posfechado', { conceptoId }));
    const movimientoId = cargado.cuerpo.partida.movimientoId as string;
    expect(
      (
        await aparte.propietario.post(`/api/empresas/${aparte.empresaId}/carga-inicial/cerrar`, {
          motivo: 'Sin el dato de los libros anteriores',
        })
      ).estado,
    ).toBe(200);

    const desdeSaldos = await anularPartida(aparte.propietario, { cuentaId, movimientoId });
    const anulado = await aparte.propietario.post(
      `/api/bancos/cheques/${await chequeDeLaPartida(movimientoId)}/anular`,
      {
        motivo: 'Se devolvió',
      },
    );

    expect(desdeSaldos.estado).toBe(422);
    expect(desdeSaldos.cuerpo.error.codigo).toBe('el_posfechado_se_anula_como_cheque');
    expect(anulado.estado).toBe(200);
    expect((await movimientoDeApertura(movimientoId)).anulado_en).not.toBeNull();
    expect((await movimientoDeApertura(movimientoId)).revertido_en).toBeNull();
    expect(eventos.some((e) => e.movimientoId === movimientoId)).toBe(false);
  });
});
