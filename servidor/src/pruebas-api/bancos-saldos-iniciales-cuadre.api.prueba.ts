/**
 * BS-2: el cuadre de la apertura por API (diferencia con los libros anteriores, posfechado fuera del cuadre y en el
 * flujo en su fecha, Bancos y Sobregiros sin compensar, avisos, hallazgos de cierre y eliminar con auditoría).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  agregarPartida,
  empresaConInicio,
  fichaDe,
  guardarSaldo,
  partida,
  RUTA_DE_APERTURA,
} from './soporte/apertura-por-api.js';
import { crearCuentaSinSaldo } from './soporte/escenarios-de-apertura.js';
import { conceptoGeneral } from './soporte/escenarios-de-bancos.js';
import { type CuentaDePrueba } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
const usuario = () => cuenta.propietario;
const nuevaCuenta = () => crearCuentaSinSaldo(usuario());
const codigosDe = (avisos: Array<{ codigo: string }>) => avisos.map((aviso) => aviso.codigo);

/** Cuántas filas de una tabla de Bancos tiene la cuenta, leídas como propietario de la base. */
async function contar(tabla: 'movimientos' | 'chequeras', cuentaId: string): Promise<number> {
  const [fila] = await comoPropietario<{ n: string }>(
    `select count(*) n from bancos.${tabla} where cuenta_bancaria_id = $1`,
    [cuentaId],
  );
  return Number(fila?.n);
}

const VARIABLE_DE_MESES = 'bancos.cheques.meses_de_vencimiento';

beforeAll(async () => {
  cuenta = await empresaConInicio(entorno, { nombre: 'Cuadre apertura', usuario: 'propietariocuadreapertura' });
});

describe('cuadre de una cuenta', () => {
  it('saldo en libros = banco + depósitos − cheques − débitos ± errores, y la diferencia con los libros anteriores', async () => {
    const cuentaId = await nuevaCuenta();
    await guardarSaldo(usuario(), cuentaId, {
      saldoSegunEstadoDeCuenta: '10000.00',
      saldoSegunLibrosAnteriores: '9010.00',
    });
    const cargas = [
      partida('deposito_en_transito', { monto: '500.00' }),
      partida('cheque_en_circulacion', { monto: '1200.00', numeroDeCheque: 11 }),
      partida('cheque_en_circulacion', { monto: '300.00', numeroDeCheque: 12 }),
      partida('debito_en_transito', { monto: '50.00' }),
      partida('error_del_banco', { monto: '80.00', sentido: 'credito' }),
      partida('error_del_banco', { monto: '20.00', sentido: 'debito' }),
    ];
    for (const carga of cargas) expect((await agregarPartida(usuario(), cuentaId, carga)).estado).toBe(201);

    const cuadrada = await fichaDe(usuario(), cuentaId);
    const descuadrada = await guardarSaldo(usuario(), cuentaId, {
      saldoSegunEstadoDeCuenta: '10000.00',
      saldoSegunLibrosAnteriores: '9000.00',
    });

    expect(cuadrada).toMatchObject({
      saldoSegunEstadoDeCuenta: '10000.00',
      totalDepositosEnTransito: '500.00',
      totalChequesEnCirculacion: '1500.00',
      totalDebitosEnTransito: '50.00',
      totalErroresDelBanco: '60.00',
      saldoEnLibrosAlCorte: '9010.00',
      diferencia: '0.00',
      cuadra: true,
    });
    expect(descuadrada.cuerpo.saldoInicial).toMatchObject({ diferencia: '10.00', cuadra: false });
    expect(codigosDe(descuadrada.cuerpo.avisos)).toContain('no_cuadra');
  });

  it('el posfechado queda fuera del cuadre y sale en el flujo de efectivo en su fecha, con su concepto', async () => {
    const cuentaId = await nuevaCuenta();
    await guardarSaldo(usuario(), cuentaId, '1000.00');
    const concepto = await conceptoGeneral(usuario());

    const guardado = await agregarPartida(
      usuario(),
      cuentaId,
      partida('cheque_posfechado', { monto: '250.00', fecha: '2026-02-10', conceptoId: concepto, numeroDeCheque: 21 }),
    );

    expect(guardado.estado).toBe(201);
    expect(guardado.cuerpo.partida).toMatchObject({
      parte: 'cheque_posfechado',
      conceptoId: concepto,
      numeroDeCheque: 21,
    });
    expect(await fichaDe(usuario(), cuentaId)).toMatchObject({
      totalPosfechados: '250.00',
      saldoEnLibrosAlCorte: '1000.00',
    });
    const [movimiento] = await comoPropietario<{ saldo_inicial: boolean; parte_de_apertura: string }>(
      'select saldo_inicial, parte_de_apertura from bancos.movimientos where id = $1',
      [guardado.cuerpo.partida.movimientoId],
    );
    expect(movimiento).toEqual({ saldo_inicial: false, parte_de_apertura: 'cheque_posfechado' });
    const febrero = await usuario().get(
      `/api/bancos/flujo-de-efectivo?cuentaBancariaId=${cuentaId}&desde=2026-02-01&hasta=2026-02-28`,
    );
    const enero = await usuario().get(
      `/api/bancos/flujo-de-efectivo?cuentaBancariaId=${cuentaId}&desde=2026-01-01&hasta=2026-01-31`,
    );
    expect(JSON.stringify(febrero.cuerpo)).toContain('"salidas":"250.00"');
    expect(JSON.stringify(enero.cuerpo)).not.toContain('"salidas":"250.00"');
  });
});

describe('totales de la empresa: Bancos y Sobregiros sin compensar', () => {
  it('una cuenta negativa suma a Sobregiros y no resta de Bancos; no hay total neto', async () => {
    const aparte = await empresaConInicio(entorno, {
      nombre: 'Totales apertura',
      usuario: 'propietariototalesapertura',
    });
    for (const saldo of ['1000.00', '500.50', '-300.00']) {
      await guardarSaldo(aparte.propietario, await crearCuentaSinSaldo(aparte.propietario), saldo);
    }
    await crearCuentaSinSaldo(aparte.propietario);

    const lista = (await aparte.propietario.get(RUTA_DE_APERTURA)).cuerpo;

    expect(lista).toMatchObject({ fechaDeInicio: '2026-01-01', fechaDeCorte: '2025-12-31', cargaCerrada: false });
    expect(lista).toMatchObject({ totalBancos: '1500.50', totalSobregiros: '300.00' });
    expect(Object.keys(lista)).not.toContain('totalNeto');
    expect(lista.cuentas).toHaveLength(4);
    expect(lista.cuentas.filter((c: { forma: string }) => c.forma === 'sin_saldo')).toHaveLength(1);
  });
});

describe('avisos al guardar (no bloquean)', () => {
  it('cheque antiguo: con la variable en 7 un cheque de 6 meses no avisa; con 6, sí', async () => {
    const cuentaId = await nuevaCuenta();
    await guardarSaldo(usuario(), cuentaId, '1000.00');
    const deSeisMeses = (numeroDeCheque: number) =>
      partida('cheque_en_circulacion', { fecha: '2025-06-30', numeroDeCheque });

    const conSiete = await agregarPartida(usuario(), cuentaId, deSeisMeses(31));
    await entorno.soporte.put('/api/sesion/empresa-activa', { empresaId: cuenta.empresaId });
    expect(
      (await entorno.soporte.put(`/api/configuracion/${VARIABLE_DE_MESES}`, { nivel: 'empresa', valor: 6 })).estado,
    ).toBe(204);
    const conSeis = await agregarPartida(usuario(), cuentaId, deSeisMeses(32));
    await entorno.soporte.delete(`/api/configuracion/${VARIABLE_DE_MESES}?nivel=empresa`);

    expect(codigosDe(conSiete.cuerpo.avisos)).not.toContain('cheque_antiguo');
    expect(conSiete.cuerpo.partida.avisos).toEqual([]);
    const aviso = conSeis.cuerpo.avisos.find((a: { codigo: string }) => a.codigo === 'cheque_antiguo');
    expect(aviso.mensaje).toContain('al 31/12/2025 tiene 6 meses');
    expect(aviso.mensaje).toContain('art. 508');
    expect(conSeis.cuerpo.partida.avisos).toEqual(['antiguo']);
  });

  it('un depósito en tránsito de 31 días avisa y uno de 30 no', async () => {
    const cuentaId = await nuevaCuenta();
    await guardarSaldo(usuario(), cuentaId, '1000.00');

    const treintaYUno = await agregarPartida(
      usuario(),
      cuentaId,
      partida('deposito_en_transito', { fecha: '2025-11-30' }),
    );
    const treinta = await agregarPartida(usuario(), cuentaId, partida('deposito_en_transito', { fecha: '2025-12-01' }));

    expect(codigosDe(treintaYUno.cuerpo.avisos)).toContain('deposito_viejo');
    expect(treintaYUno.cuerpo.partida.avisos).toEqual(['deposito_viejo']);
    expect(codigosDe(treinta.cuerpo.avisos)).not.toContain('deposito_viejo');
  });

  it('el sobregiro no bloquea la apertura, pero avisa si la empresa no lo permite', async () => {
    const cuentaId = await nuevaCuenta();

    const respuesta = await guardarSaldo(usuario(), cuentaId, '-75.00');

    expect(respuesta.estado).toBe(200);
    expect(codigosDe(respuesta.cuerpo.avisos)).toContain('saldo_negativo_sin_sobregiro');
  });
});

describe('hallazgos de cierre', () => {
  it('los cinco: no cuadra, sin dato de libros, sin evidencia, saldo global y sobregiro sin permiso', async () => {
    const aparte = await empresaConInicio(entorno, { nombre: 'Hallazgos apertura', usuario: 'propietariohallazgos' });
    const yo = aparte.propietario;
    const cuadrada = await crearCuentaSinSaldo(yo);
    const descuadrada = await crearCuentaSinSaldo(yo);
    const sinDato = await crearCuentaSinSaldo(yo);
    const global = await crearCuentaSinSaldo(yo);
    const sobregirada = await crearCuentaSinSaldo(yo);
    await crearCuentaSinSaldo(yo);
    await guardarSaldo(yo, cuadrada, { saldoSegunEstadoDeCuenta: '100.00', saldoSegunLibrosAnteriores: '100.00' });
    await guardarSaldo(yo, descuadrada, { saldoSegunEstadoDeCuenta: '100.00', saldoSegunLibrosAnteriores: '90.00' });
    await guardarSaldo(yo, sinDato, '100.00');
    await guardarSaldo(yo, sobregirada, { saldoSegunEstadoDeCuenta: '-50.00', saldoSegunLibrosAnteriores: '-50.00' });
    await yo.post(RUTA_DE_APERTURA, {
      cuentaBancariaId: global,
      tipo: 'credito',
      fecha: '2025-10-01',
      monto: '10.00',
      referencia: null,
      observaciones: null,
    });

    const revision = (await yo.get(`${RUTA_DE_APERTURA}/revision-de-cierre`)).cuerpo as Array<{
      cuentaBancariaId: string;
      codigo: string;
      pideMotivo: boolean;
    }>;
    const deLa = (id: string) => revision.filter((h) => h.cuentaBancariaId === id).map((h) => [h.codigo, h.pideMotivo]);

    expect(deLa(cuadrada)).toEqual([['sin_evidencia', false]]);
    expect(deLa(descuadrada)).toEqual([
      ['no_cuadra', true],
      ['sin_evidencia', false],
    ]);
    expect(deLa(sinDato)).toEqual([
      ['sin_dato_de_libros', true],
      ['sin_evidencia', false],
    ]);
    expect(deLa(global)).toEqual([['saldo_global', false]]);
    expect(deLa(sobregirada)).toEqual([
      ['sin_evidencia', false],
      ['sobregiro_sin_permiso', false],
    ]);
    expect((await yo.get(RUTA_DE_APERTURA)).cuerpo.hallazgos).toEqual(revision);
  });
});

describe('eliminar el saldo inicial', () => {
  it('borra la cabecera con sus partidas, los posfechados y los cheques de apertura; audita todo con el motivo', async () => {
    const cuentaId = await nuevaCuenta();
    await guardarSaldo(usuario(), cuentaId, {
      saldoSegunEstadoDeCuenta: '2000.00',
      observaciones: 'Del sistema anterior',
    });
    await agregarPartida(usuario(), cuentaId, partida('deposito_en_transito'));
    await agregarPartida(usuario(), cuentaId, partida('cheque_en_circulacion', { numeroDeCheque: 41 }));
    await agregarPartida(
      usuario(),
      cuentaId,
      partida('cheque_posfechado', { numeroDeCheque: 42, conceptoId: await conceptoGeneral(usuario()) }),
    );
    const antes = await fichaDe(usuario(), cuentaId);

    const baja = await usuario().delete(`${RUTA_DE_APERTURA}/${cuentaId}`, {
      motivo: 'Se cargó en la cuenta equivocada',
    });

    expect(baja.estado).toBe(204);
    expect([await contar('movimientos', cuentaId), await contar('chequeras', cuentaId)]).toEqual([0, 0]);
    expect((await fichaDe(usuario(), cuentaId)).forma).toBe('sin_saldo');
    const [auditoria] = await comoPropietario<{
      motivo: string;
      anterior: { partidas: unknown[]; observaciones: string };
    }>(
      `select motivo, anterior from core.auditoria where recurso = 'bancos.saldos-iniciales' and accion = 'eliminar' and cuenta_id = $1 order by creado_en desc limit 1`,
      [cuenta.cuentaId],
    );
    expect(auditoria?.motivo).toBe('Se cargó en la cuenta equivocada');
    expect(auditoria?.anterior.partidas).toHaveLength(antes.partidas.length);
    expect(auditoria?.anterior.partidas).toHaveLength(4);
    expect(auditoria?.anterior.observaciones).toBe('Del sistema anterior');
  });

  it('una partida eliminada deja su rastro en la auditoría con su motivo', async () => {
    const cuentaId = await nuevaCuenta();
    await guardarSaldo(usuario(), cuentaId, '100.00');
    const deposito = await agregarPartida(usuario(), cuentaId, partida('deposito_en_transito'));
    const id = deposito.cuerpo.partida.movimientoId;

    const baja = await usuario().delete(`${RUTA_DE_APERTURA}/${cuentaId}/partidas/${id}`, { motivo: 'Duplicado' });
    const rastro = await comoPropietario<{ accion: string; motivo: string; recurso: string }>(
      'select accion, motivo, recurso from core.auditoria where registro_id = $1',
      [id],
    );

    expect(baja.estado).toBe(204);
    expect(rastro).toEqual([{ accion: 'eliminar', motivo: 'Duplicado', recurso: 'bancos.movimientos' }]);
  });
});
