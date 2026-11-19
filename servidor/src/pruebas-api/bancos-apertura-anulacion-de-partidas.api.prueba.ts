/**
 * BS-3: anular un depósito en tránsito (con pagador), un débito en tránsito y un error del banco desde la ventana de
 * saldos iniciales; lo que no se anula; la carga cerrada; los permisos y la auditoría.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import {
  anularPartida,
  escucharAnulacionesDeApertura,
  inversoDeApertura,
  movimientoDeApertura,
} from './soporte/anulaciones-de-apertura.js';
import { agregarPartida, empresaConInicio, fichaDe, guardarSaldo, partida } from './soporte/apertura-por-api.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { crearCuentaSinSaldo } from './soporte/escenarios-de-apertura.js';
import { crearUsuarioConPermisos, type CuentaDePrueba } from './soporte/escenarios.js';
import { usarEntornoApi } from './soporte/entorno-api.js';

const entorno = usarEntornoApi();
const eventos = escucharAnulacionesDeApertura();
let cuenta: CuentaDePrueba;
const usuario = () => cuenta.propietario;

/** Una cuenta con saldo del banco de 1,000.00 y la partida pedida cargada. */
async function cuentaCon(parte: string, cambios: Record<string, unknown> = {}) {
  const cuentaId = await crearCuentaSinSaldo(usuario());
  expect((await guardarSaldo(usuario(), cuentaId, '1000.00')).estado).toBe(200);
  const cargada = await agregarPartida(usuario(), cuentaId, partida(parte, cambios));
  expect(cargada.estado, JSON.stringify(cargada.cuerpo)).toBe(201);
  return { cuentaId, movimientoId: cargada.cuerpo.partida.movimientoId as string };
}

beforeAll(async () => {
  cuenta = await empresaConInicio(entorno, { nombre: 'Anular partidas', usuario: 'propietarioanularpartidas' });
});

describe('depósito en tránsito rechazado', () => {
  it('sin pagador se rechaza (400, campo pagador); con pagador va en el inverso y en el evento', async () => {
    const { cuentaId, movimientoId } = await cuentaCon('deposito_en_transito', { monto: '300.00' });

    const sinPagador = await anularPartida(usuario(), { cuentaId, movimientoId });
    const sinTexto = await anularPartida(usuario(), { cuentaId, movimientoId }, { pagador: '   ' });
    const conPagador = await anularPartida(
      usuario(),
      { cuentaId, movimientoId },
      { pagador: ' Cliente Moroso, S.A. ' },
    );

    for (const rechazo of [sinPagador, sinTexto]) {
      expect(rechazo.estado).toBe(400);
      expect(rechazo.cuerpo.error.codigo).toBe('pagador_obligatorio');
    }
    expect(conPagador.estado).toBe(200);
    expect(await inversoDeApertura(movimientoId)).toMatchObject({
      concepto: 'anulacion_de_apertura',
      tipo: 'debito',
      fecha: '2026-02-10',
      beneficiario: 'Cliente Moroso, S.A.',
    });
    expect(eventos.find((e) => e.movimientoId === movimientoId)).toMatchObject({
      parte: 'deposito_en_transito',
      montoCentavos: 30000,
      pagador: 'Cliente Moroso, S.A.',
      numeroDeCheque: null,
      cuentaBancariaId: cuentaId,
    });
    expect((await fichaDe(usuario(), cuentaId)).saldoEnLibrosAlCorte).toBe('1300.00');
  });

  it('un pagador de más de 150 caracteres se rechaza (400)', async () => {
    const { cuentaId, movimientoId } = await cuentaCon('deposito_en_transito');

    const largo = await anularPartida(usuario(), { cuentaId, movimientoId }, { pagador: 'x'.repeat(151) });

    expect(largo.estado).toBe(400);
  });
});

describe('débito en tránsito y error del banco', () => {
  it('el débito en tránsito se anula sin pagador, con su inverso de crédito', async () => {
    const { cuentaId, movimientoId } = await cuentaCon('debito_en_transito', { monto: '60.00' });

    const anulada = await anularPartida(usuario(), { cuentaId, movimientoId });

    expect(anulada.estado).toBe(200);
    expect(await inversoDeApertura(movimientoId)).toMatchObject({ tipo: 'credito', concepto: 'anulacion_de_apertura' });
    expect(eventos.find((e) => e.movimientoId === movimientoId)).toMatchObject({
      parte: 'debito_en_transito',
      pagador: null,
    });
  });

  it('el error del banco se anula con su inverso en el sentido contrario y el pagador que se mande se ignora', async () => {
    const { cuentaId, movimientoId } = await cuentaCon('error_del_banco', { sentido: 'debito', monto: '25.00' });

    const anulada = await anularPartida(usuario(), { cuentaId, movimientoId }, { pagador: 'Nadie' });

    expect(anulada.estado).toBe(200);
    expect(await inversoDeApertura(movimientoId)).toMatchObject({ tipo: 'credito', beneficiario: null });
    expect(eventos.find((e) => e.movimientoId === movimientoId)).toMatchObject({
      parte: 'error_del_banco',
      pagador: null,
    });
    expect((await fichaDe(usuario(), cuentaId)).saldoEnLibrosAlCorte).toBe('975.00');
  });

  it('el inverso antes del corte se rechaza (400) y el original sigue vigente', async () => {
    const { cuentaId, movimientoId } = await cuentaCon('debito_en_transito');

    const rechazada = await anularPartida(usuario(), { cuentaId, movimientoId }, { fecha: '2025-12-31' });

    expect(rechazada.estado).toBe(400);
    expect(rechazada.cuerpo.error.codigo).toBe('inverso_dentro_de_la_apertura');
    expect((await movimientoDeApertura(movimientoId)).revertido_en).toBeNull();
  });

  it('la anulación deja su rastro en la auditoría', async () => {
    const { cuentaId, movimientoId } = await cuentaCon('debito_en_transito');

    await anularPartida(usuario(), { cuentaId, movimientoId }, { motivo: 'El banco lo corrigió' });

    const rastro = await comoPropietario<{ accion: string; motivo: string | null }>(
      "select accion, motivo from core.auditoria where registro_id = $1 and accion = 'anular'",
      [movimientoId],
    );
    expect(rastro).toEqual([{ accion: 'anular', motivo: 'El banco lo corrigió' }]);
  });
});

describe('lo que no se anula desde aquí', () => {
  it('el saldo del banco, una cuenta ajena, una partida inexistente y un movimiento normal se rechazan', async () => {
    const { cuentaId, movimientoId } = await cuentaCon('debito_en_transito');
    const ficha = await fichaDe(usuario(), cuentaId);
    const delBanco = ficha.partidas.find((p: { parte: string }) => p.parte === 'saldo_del_banco');
    const otra = await crearCuentaSinSaldo(usuario());

    const saldo = await anularPartida(usuario(), { cuentaId, movimientoId: delBanco.movimientoId });
    const ajena = await anularPartida(usuario(), { cuentaId: otra, movimientoId });
    const inexistente = await anularPartida(usuario(), { cuentaId, movimientoId: crypto.randomUUID() });

    expect(saldo.estado).toBe(422);
    expect(saldo.cuerpo.error.codigo).toBe('no_se_anula_el_saldo_del_banco');
    expect(ajena.estado).toBe(404);
    expect(inexistente.estado).toBe(404);
    expect(delBanco.puedeAnular).toBe(false);
  });

  it('con la carga cerrada una partida de apertura sí se anula (es un hecho del período)', async () => {
    const aparte = await empresaConInicio(entorno, {
      nombre: 'Anular con carga cerrada',
      usuario: 'propietariocerradaanular',
    });
    const cuentaId = await crearCuentaSinSaldo(aparte.propietario);
    await guardarSaldo(aparte.propietario, cuentaId, '500.00');
    const cargada = await agregarPartida(aparte.propietario, cuentaId, partida('debito_en_transito'));
    const movimientoId = cargada.cuerpo.partida.movimientoId as string;
    await aparte.propietario.post(`/api/empresas/${aparte.empresaId}/carga-inicial/cerrar`, {
      motivo: 'Sin el dato de los libros anteriores',
    });

    const anulada = await anularPartida(aparte.propietario, { cuentaId, movimientoId });

    expect(anulada.estado).toBe(200);
    expect(anulada.cuerpo.partida).toMatchObject({ revertida: true, puedeAnular: false, puedeCorregir: false });
  });
});

describe('permisos', () => {
  it('anular exige su propio permiso: con crear, editar y eliminar no alcanza (403)', async () => {
    const { cuentaId, movimientoId } = await cuentaCon('debito_en_transito');
    const permisos = ['ver', 'crear', 'editar', 'eliminar'].map((accion) => `bancos.saldos-iniciales.${accion}`);
    const sinAnular = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Sin anular',
      apellidos: 'Apertura',
      permisos,
    });
    const conAnular = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Con anular',
      apellidos: 'Apertura',
      permisos: [...permisos, 'bancos.saldos-iniciales.anular', 'bancos.cheques.anular'],
    });

    const prohibido = await anularPartida(sinAnular, { cuentaId, movimientoId });
    const permitido = await anularPartida(conAnular, { cuentaId, movimientoId });

    expect(prohibido.estado).toBe(403);
    expect(permitido.estado).toBe(200);
  });
});
