/**
 * BS-R1: «Saldos por cuenta» por API a una fecha de corte (posfechados, partidas en tránsito de la apertura y de los
 * errores del banco, conciliaciones autorizadas, cuenta atrasada, pares compensados),
 * y `conciliadoEn` en el reporte de movimientos.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { agregarPartida, empresaConInicio, guardarSaldo, partida } from './soporte/apertura-por-api.js';
import type { ClienteApi } from './soporte/cliente-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearCuentaSinSaldo } from './soporte/escenarios-de-apertura.js';
import { conceptoGeneral, terminarConciliacionConSaldo } from './soporte/escenarios-de-bancos.js';
import { crearUsuarioConPermisos, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA = '/api/bancos/saldos-por-cuenta';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let autoriza: ClienteApi;
let conceptoId = '';
let cuentaA = '';
const usuario = () => cuenta.propietario;

interface Saldo {
  cuentaBancariaId: string;
  saldoEnLibros: string;
  chequesPosfechados: string;
  disponible: string;
  fondosInsuficientes: boolean;
  chequesEnCirculacion: { cantidad: number; monto: string };
  depositosEnTransito: { cantidad: number; monto: string };
  debitosEnTransito: { cantidad: number; monto: string };
  erroresDelBanco: { cantidad: number; monto: string };
  saldoSegunBanco: string;
  ultimaConciliacion: { anio: number; mes: number } | null;
  atrasada: boolean;
  partidas: Array<{ categoria: string; monto: string; fecha: string; parteDeApertura: string | null }>;
}

async function saldoDe(cuentaId: string, fecha: string, quien: ClienteApi = usuario()): Promise<Saldo> {
  const respuesta = await quien.get(`${RUTA}?fecha=${fecha}&cuentaBancariaId=${cuentaId}`);
  expect(respuesta.estado).toBe(200);
  return (respuesta.cuerpo.cuentas as Saldo[])[0]!;
}

interface DatosDeNota {
  cuentaBancariaId: string;
  tipo: 'credito' | 'debito';
  fecha: string;
  monto: string;
}

const nota = ({ cuentaBancariaId, tipo, fecha, monto }: DatosDeNota) => ({
  cuentaBancariaId,
  tipo,
  conceptoId,
  fecha,
  monto,
  referencia: null,
  beneficiario: null,
  observaciones: null,
});

/** Concilia enero con todo lo candidato marcado y lo autoriza otro usuario. */
async function conciliarEnero(cuentaId: string): Promise<string> {
  const iniciada = await usuario().post('/api/bancos/conciliaciones', {
    cuentaBancariaId: cuentaId,
    anio: 2026,
    mes: 1,
  });
  expect(iniciada.estado).toBe(201);
  const ruta = `/api/bancos/conciliaciones/${iniciada.cuerpo.id}`;
  const ids = (iniciada.cuerpo.candidatos as Array<{ id: string }>).map((candidato) => candidato.id);
  await usuario().put(`${ruta}/marcas`, { movimientoIds: ids });
  await terminarConciliacionConSaldo(usuario(), iniciada.cuerpo.id);
  expect((await autoriza.post(`${ruta}/autorizar`, {})).estado).toBe(200);
  return iniciada.cuerpo.id as string;
}

beforeAll(async () => {
  cuenta = await empresaConInicio(entorno, { nombre: 'Saldos por cuenta', usuario: 'propietariosaldosporcuenta' });
  autoriza = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Autoriza',
    apellidos: 'Saldos',
    permisos: ['bancos.conciliaciones.ver', 'bancos.conciliaciones.autorizar'],
  });
  conceptoId = await conceptoGeneral(usuario());
  cuentaA = await crearCuentaSinSaldo(usuario());
  await guardarSaldo(usuario(), cuentaA, '10000.00');
  const cargas = [
    partida('deposito_en_transito', { monto: '500.00' }),
    partida('cheque_en_circulacion', { monto: '1200.00', numeroDeCheque: 11 }),
    partida('debito_en_transito', { monto: '50.00' }),
    partida('error_del_banco', { monto: '80.00', sentido: 'credito' }),
    partida('cheque_posfechado', { monto: '300.00', numeroDeCheque: 21, conceptoId }),
  ];
  for (const carga of cargas) expect((await agregarPartida(usuario(), cuentaA, carga)).estado).toBe(201);
});

describe('saldos por cuenta a una fecha con posfechados y partidas de la apertura', () => {
  it('al corte: libros, posfechado comprometido, disponible y las cuatro partidas en tránsito, con el saldo del banco', async () => {
    const saldo = await saldoDe(cuentaA, '2025-12-31');

    expect(saldo).toMatchObject({
      saldoEnLibros: '9330.00',
      chequesPosfechados: '300.00',
      disponible: '9030.00',
      fondosInsuficientes: false,
      chequesEnCirculacion: { cantidad: 1, monto: '1200.00' },
      depositosEnTransito: { cantidad: 1, monto: '500.00' },
      debitosEnTransito: { cantidad: 1, monto: '50.00' },
      erroresDelBanco: { cantidad: 1, monto: '80.00' },
      saldoSegunBanco: '10000.00',
      ultimaConciliacion: null,
      atrasada: false,
    });
    expect(saldo.partidas.map((p) => [p.categoria, p.parteDeApertura]).sort()).toEqual([
      ['cheque_en_circulacion', 'cheque_en_circulacion'],
      ['debito_en_transito', 'debito_en_transito'],
      ['deposito_en_transito', 'deposito_en_transito'],
      ['error_del_banco', 'error_del_banco'],
    ]);
  });

  it('el saldo del banco de la apertura no es partida en tránsito (es lo que el banco ya vio)', async () => {
    const saldo = await saldoDe(cuentaA, '2025-12-31');

    expect(saldo.partidas.some((p) => p.parteDeApertura === 'saldo_del_banco')).toBe(false);
  });

  it('cuando llega la fecha del posfechado ya no es comprometido: baja el libro y pasa a cheque en circulación', async () => {
    const saldo = await saldoDe(cuentaA, '2026-02-28');

    expect(saldo).toMatchObject({
      saldoEnLibros: '9030.00',
      chequesPosfechados: '0.00',
      disponible: '9030.00',
      chequesEnCirculacion: { cantidad: 2, monto: '1500.00' },
      saldoSegunBanco: '10000.00',
    });
  });

  it('un posfechado mayor que el libro marca fondos insuficientes pero la cuenta sigue en Bancos', async () => {
    const corta = await crearCuentaSinSaldo(usuario());
    await guardarSaldo(usuario(), corta, '100.00');
    await agregarPartida(
      usuario(),
      corta,
      partida('cheque_posfechado', { monto: '350.50', numeroDeCheque: 31, conceptoId }),
    );

    const respuesta = await usuario().get(`${RUTA}?fecha=2025-12-31&cuentaBancariaId=${corta}`);

    expect(respuesta.cuerpo.cuentas[0]).toMatchObject({ disponible: '-250.50', fondosInsuficientes: true });
    expect(respuesta.cuerpo.bancos.cantidadDeCuentas).toBe(1);
    expect(respuesta.cuerpo.sobregiros.cantidadDeCuentas).toBe(0);
  });

  it('sin fecha usa hoy; con una cuenta ajena o inexistente responde 404; la fecha mal escrita, 400', async () => {
    const hoy = await usuario().get(RUTA);
    const inexistente = await usuario().get(`${RUTA}?cuentaBancariaId=00000000-0000-4000-8000-000000000000`);
    const malEscrita = await usuario().get(`${RUTA}?fecha=15-03-2026`);

    expect(hoy.estado).toBe(200);
    expect(hoy.cuerpo.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(inexistente.estado).toBe(404);
    expect(malEscrita.estado).toBe(400);
  });
});

describe('saldos por cuenta con conciliaciones, cuenta atrasada y pares compensados', () => {
  let conciliacionId = '';

  it('antes de conciliar y a una fecha anterior al mes conciliado la cuenta no está atrasada', async () => {
    const saldo = await saldoDe(cuentaA, '2026-01-31');

    expect(saldo.partidas).toHaveLength(4);
    expect(saldo).toMatchObject({ ultimaConciliacion: null, atrasada: false });
  });

  it('una conciliación autorizada de enero deja sin partidas en tránsito a fin de enero, pero no cambia el corte de diciembre', async () => {
    conciliacionId = await conciliarEnero(cuentaA);

    const finDeEnero = await saldoDe(cuentaA, '2026-01-31');
    const alCorte = await saldoDe(cuentaA, '2025-12-31');

    expect(finDeEnero).toMatchObject({
      partidas: [],
      saldoEnLibros: '9330.00',
      saldoSegunBanco: '9330.00',
      ultimaConciliacion: { anio: 2026, mes: 1 },
      atrasada: false,
    });
    expect(alCorte.partidas).toHaveLength(4);
    expect(alCorte.ultimaConciliacion).toBeNull();
  });

  it('la cuenta queda atrasada cuando pasa un mes completo sin conciliar y deja de estarlo con una fecha que no lo exige', async () => {
    await usuario().post(
      '/api/bancos/notas',
      nota({ cuentaBancariaId: cuentaA, tipo: 'credito', fecha: '2026-02-12', monto: '10.00' }),
    );
    const marzo = await saldoDe(cuentaA, '2026-03-15');
    const febrero = await saldoDe(cuentaA, '2026-02-20');

    expect(marzo).toMatchObject({ atrasada: true, ultimaConciliacion: { anio: 2026, mes: 1 } });
    expect(febrero.atrasada).toBe(false);
  });

  it('una cuenta con conciliación en proceso (sin autorizar) sigue con todo en tránsito', async () => {
    const otra = await crearCuentaSinSaldo(usuario());
    await guardarSaldo(usuario(), otra, '1000.00');
    await agregarPartida(usuario(), otra, partida('deposito_en_transito', { monto: '70.00' }));
    const iniciada = await usuario().post('/api/bancos/conciliaciones', { cuentaBancariaId: otra, anio: 2026, mes: 1 });
    const ids = (iniciada.cuerpo.candidatos as Array<{ id: string }>).map((c) => c.id);
    await usuario().put(`/api/bancos/conciliaciones/${iniciada.cuerpo.id}/marcas`, { movimientoIds: ids });

    const saldo = await saldoDe(otra, '2026-01-31');

    expect(saldo.depositosEnTransito).toEqual({ cantidad: 1, monto: '70.00' });
    expect(saldo.ultimaConciliacion).toBeNull();
  });

  it('un original anulado con su inverso, ambos sin pasar por el banco, no es partida en tránsito: se compensan', async () => {
    const compensada = await crearCuentaSinSaldo(usuario());
    await guardarSaldo(usuario(), compensada, '1000.00');
    const creada = await usuario().post(
      '/api/bancos/notas',
      nota({ cuentaBancariaId: compensada, tipo: 'debito', fecha: '2026-02-05', monto: '40.00' }),
    );
    await usuario().post(`/api/bancos/notas/${creada.cuerpo.id}/anular`, { motivo: 'Error', fecha: '2026-02-10' });

    const antesDelInverso = await saldoDe(compensada, '2026-02-07');
    const despues = await saldoDe(compensada, '2026-02-28');

    expect(antesDelInverso.debitosEnTransito).toEqual({ cantidad: 1, monto: '40.00' });
    expect(despues).toMatchObject({
      saldoEnLibros: '1000.00',
      partidas: [],
      debitosEnTransito: { cantidad: 0, monto: '0.00' },
      depositosEnTransito: { cantidad: 0, monto: '0.00' },
    });
  });

  it('el reporte de movimientos trae «conciliado en» de las filas marcadas en una conciliación autorizada', async () => {
    const reporte = await usuario().get(`/api/bancos/movimientos/reporte?cuentaBancariaId=${cuentaA}`);
    const filas = reporte.cuerpo.filas as Array<{
      conciliacionId: string | null;
      conciliadoEn: { anio: number; mes: number } | null;
      parteDeApertura: string | null;
    }>;

    const marcadas = filas.filter((f) => f.conciliacionId === conciliacionId);
    // Solo las cuatro partidas de la apertura: el saldo del banco nunca es candidato (§6.4) y el posfechado
    // (10 de febrero) no entra a enero porque aun no se cobra.
    expect(marcadas).toHaveLength(4);
    const saldoDelBanco = filas.find((f) => f.parteDeApertura === 'saldo_del_banco');
    expect(saldoDelBanco).toMatchObject({ conciliacionId: null, conciliadoEn: null });
    expect(marcadas.every((f) => f.conciliadoEn?.anio === 2026 && f.conciliadoEn.mes === 1)).toBe(true);
    const sinMarca = filas.filter((f) => f.conciliacionId === null);
    expect(sinMarca.length).toBeGreaterThan(0);
    expect(sinMarca.every((f) => f.conciliadoEn === null)).toBe(true);
  });
});
