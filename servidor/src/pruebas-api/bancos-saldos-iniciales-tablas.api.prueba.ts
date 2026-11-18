/**
 * BS-1: lo que la migración 0034 agrega a Bancos: cada check de las siete partes de apertura, el único del saldo
 * principal, la chequera de apertura, la evidencia única y la seguridad por empresa de `saldos_iniciales`.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { enTransaccionSegura } from '../modulos/core/compartido/pruebas/en-transaccion-segura.js';
import { saldosIniciales } from '../modulos/bancos/infraestructura/persistencia/saldos-iniciales.tablas.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import {
  crearCabecera as crearCabeceraDe,
  crearCuentaSinSaldo,
  restriccionDe,
} from './soporte/escenarios-de-apertura.js';
import { conceptoGeneral } from './soporte/escenarios-de-bancos.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let otra: CuentaDePrueba;
let conceptoId = '';
const crearCuenta = () => crearCuentaSinSaldo(cuenta.propietario);
const crearCabecera = (cuentaBancariaId: string) => crearCabeceraDe(cuenta.empresaId, cuentaBancariaId);

interface Partida {
  cuentaBancariaId: string;
  tipo: string;
  parte: string | null;
  saldoInicial: boolean;
  cabeceraId: string | null;
  anulada?: boolean;
}

const insertarMovimiento = (p: Partida) =>
  restriccionDe(
    `insert into bancos.movimientos
       (empresa_id, cuenta_bancaria_id, tipo, fecha, monto, concepto_id, saldo_inicial, parte_de_apertura, saldo_inicial_id, anulado_en)
     values ($1, $2, $3, '2026-09-30', 10, $4, $5, $6, $7, $8)`,
    [
      cuenta.empresaId,
      p.cuentaBancariaId,
      p.tipo,
      conceptoId,
      p.saldoInicial,
      p.parte,
      p.cabeceraId,
      p.anulada ? new Date() : null,
    ],
  );

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Tablas apertura',
    usuario: 'propietariotablasapertura',
    modulos: ['bancos'],
  });
  otra = await darDeAltaCuenta(entorno, {
    nombre: 'Otra apertura',
    usuario: 'propietariootraapertura',
    modulos: ['bancos'],
  });
  conceptoId = await conceptoGeneral(cuenta.propietario);
});

describe('bancos.movimientos: partes de apertura', () => {
  it('acepta cada parte con su tipo, y el posfechado no es saldo inicial', async () => {
    const cuentaId = await crearCuenta();
    const cabeceraId = await crearCabecera(cuentaId);
    const validas: Array<[string, string, boolean]> = [
      ['credito', 'saldo_del_banco', true],
      ['cheque', 'cheque_en_circulacion', true],
      ['credito', 'deposito_en_transito', true],
      ['debito', 'debito_en_transito', true],
      ['credito', 'error_del_banco', true],
      ['debito', 'error_del_banco', true],
      ['cheque', 'cheque_posfechado', false],
    ];
    for (const [tipo, parte, saldoInicial] of validas) {
      const base = { cuentaBancariaId: cuentaId, tipo, parte, saldoInicial, cabeceraId };
      expect(await insertarMovimiento(base), `${parte} ${tipo}`).toBeNull();
    }
  });

  it('rechaza una parte desconocida', async () => {
    const cuentaId = await crearCuenta();
    const cabeceraId = await crearCabecera(cuentaId);
    const base = { cuentaBancariaId: cuentaId, tipo: 'credito', saldoInicial: true, cabeceraId };
    expect(await insertarMovimiento({ ...base, parte: 'otra_parte' })).toBe('movimientos_parte_de_apertura_valida');
  });

  it('rechaza una parte con un tipo que no le corresponde', async () => {
    const cuentaId = await crearCuenta();
    const cabeceraId = await crearCabecera(cuentaId);
    const invalidas: Array<[string, string, boolean]> = [
      ['credito', 'cheque_en_circulacion', true],
      ['debito', 'deposito_en_transito', true],
      ['credito', 'debito_en_transito', true],
      ['cheque', 'saldo_del_banco', true],
      ['cheque', 'error_del_banco', true],
      ['cheque', 'saldo_global', true],
      ['debito', 'cheque_posfechado', false],
    ];
    for (const [tipo, parte, saldoInicial] of invalidas) {
      const base = { cuentaBancariaId: cuentaId, tipo, parte, saldoInicial, cabeceraId };
      expect(await insertarMovimiento(base), `${parte} ${tipo}`).toBe('movimientos_tipo_de_la_parte');
    }
  });

  it('la apertura va completa: el posfechado con saldo_inicial, la partida sin cabecera y el saldo sin parte fallan', async () => {
    const cuentaId = await crearCuenta();
    const cabeceraId = await crearCabecera(cuentaId);
    const apertura = 'movimientos_apertura_completa';
    const cheque = { cuentaBancariaId: cuentaId, tipo: 'cheque', cabeceraId };
    expect(await insertarMovimiento({ ...cheque, parte: 'cheque_posfechado', saldoInicial: true })).toBe(apertura);
    expect(await insertarMovimiento({ ...cheque, parte: 'cheque_en_circulacion', saldoInicial: false })).toBe(apertura);
    expect(
      await insertarMovimiento({ ...cheque, parte: 'cheque_en_circulacion', saldoInicial: true, cabeceraId: null }),
    ).toBe(apertura);
    expect(await insertarMovimiento({ ...cheque, parte: null, saldoInicial: false })).toBe(apertura);
    expect(await insertarMovimiento({ ...cheque, parte: null, saldoInicial: true, cabeceraId: null })).toBe(apertura);
    expect(await insertarMovimiento({ ...cheque, parte: null, saldoInicial: false, cabeceraId: null })).toBeNull();
  });
});

describe('bancos.movimientos: un solo saldo principal vigente por cuenta', () => {
  it('dos saldos del banco, o uno del banco y uno global, fallan; las partidas pueden ser muchas', async () => {
    const cuentaId = await crearCuenta();
    const cabeceraId = await crearCabecera(cuentaId);
    const credito = { cuentaBancariaId: cuentaId, tipo: 'credito', saldoInicial: true, cabeceraId };
    expect(await insertarMovimiento({ ...credito, parte: 'saldo_del_banco' })).toBeNull();
    expect(await insertarMovimiento({ ...credito, parte: 'saldo_del_banco' })).toBe('movimientos_un_saldo_del_banco');
    expect(await insertarMovimiento({ ...credito, parte: 'saldo_global' })).toBe('movimientos_un_saldo_del_banco');
    for (const [tipo, parte] of [
      ['cheque', 'cheque_en_circulacion'],
      ['cheque', 'cheque_en_circulacion'],
      ['credito', 'deposito_en_transito'],
      ['credito', 'deposito_en_transito'],
      ['debito', 'debito_en_transito'],
      ['debito', 'error_del_banco'],
      ['credito', 'error_del_banco'],
    ] as const) {
      expect(await insertarMovimiento({ ...credito, tipo, parte })).toBeNull();
    }
  });

  it('un saldo principal anulado no cuenta, y otra cuenta tiene el suyo', async () => {
    const cuentaId = await crearCuenta();
    const cabeceraId = await crearCabecera(cuentaId);
    const global = {
      cuentaBancariaId: cuentaId,
      tipo: 'credito',
      saldoInicial: true,
      cabeceraId,
      parte: 'saldo_global',
    };
    expect(await insertarMovimiento({ ...global, anulada: true })).toBeNull();
    expect(await insertarMovimiento(global)).toBeNull();
    const otraCuenta = await crearCuenta();
    const suyo = { ...global, cuentaBancariaId: otraCuenta, cabeceraId: await crearCabecera(otraCuenta) };
    expect(await insertarMovimiento(suyo)).toBeNull();
  });
});

describe('bancos.saldos_iniciales', () => {
  it('una cabecera por cuenta', async () => {
    const cuentaId = await crearCuenta();
    await crearCabecera(cuentaId);
    const repetida = restriccionDe(
      'insert into bancos.saldos_iniciales (empresa_id, cuenta_bancaria_id) values ($1, $2)',
      [cuenta.empresaId, cuentaId],
    );
    expect(await repetida).toBe('saldos_iniciales_cuenta_unico');
  });

  it('las observaciones son nulas o de 1 a 500 caracteres sin espacios a los lados', async () => {
    const insertar = async (observaciones: string | null) =>
      restriccionDe(
        'insert into bancos.saldos_iniciales (empresa_id, cuenta_bancaria_id, observaciones) values ($1, $2, $3)',
        [cuenta.empresaId, await crearCuenta(), observaciones],
      );
    const validas = 'observaciones_validas';
    expect(await insertar('')).toBe(`saldos_iniciales_${validas}`);
    expect(await insertar(' con espacio')).toBe(`saldos_iniciales_${validas}`);
    expect(await insertar('con espacio ')).toBe(`saldos_iniciales_${validas}`);
    expect(await insertar('x'.repeat(501))).toBe(`saldos_iniciales_${validas}`);
    expect(await insertar('x'.repeat(500))).toBeNull();
    expect(await insertar(null)).toBeNull();
  });

  it('la cuenta bancaria debe existir, y puede ser negativo el saldo transcrito', async () => {
    const huerfana = restriccionDe(
      'insert into bancos.saldos_iniciales (empresa_id, cuenta_bancaria_id) values ($1, $2)',
      [cuenta.empresaId, crypto.randomUUID()],
    );
    expect(await huerfana).toBe('saldos_iniciales_cuenta_fk');
    const negativo = restriccionDe(
      'insert into bancos.saldos_iniciales (empresa_id, cuenta_bancaria_id, saldo_segun_libros_anteriores) values ($1, $2, -500)',
      [cuenta.empresaId, await crearCuenta()],
    );
    expect(await negativo).toBeNull();
  });

  it('un archivo de evidencia es de una sola cabecera y debe existir', async () => {
    const [archivo] = await comoPropietario<{ id: string }>(
      `insert into core.archivos (empresa_id, ruta_original, clase, tipo_mime, tamano_bytes)
       values ($1, 'evidencia-bs1.pdf', 'documento', 'application/pdf', 10) returning id`,
      [cuenta.empresaId],
    );
    const poner = async (archivoId: string) =>
      restriccionDe(
        'insert into bancos.saldos_iniciales (empresa_id, cuenta_bancaria_id, evidencia_archivo_id) values ($1, $2, $3)',
        [cuenta.empresaId, await crearCuenta(), archivoId],
      );
    expect(await poner(archivo!.id)).toBeNull();
    expect(await poner(archivo!.id)).toBe('saldos_iniciales_evidencia_unica');
    expect(await poner(crypto.randomUUID())).toBe('saldos_iniciales_evidencia_fk');
  });

  it('cada empresa ve solo lo suyo y no puede escribir en la ajena', async () => {
    const cuentaId = await crearCuenta();
    await crearCabecera(cuentaId);
    const usuarioId = crypto.randomUUID();
    const deLaOtra = { empresaId: otra.empresaId, cuentaId: otra.cuentaId, usuarioId };
    const propias = { empresaId: cuenta.empresaId, cuentaId: cuenta.cuentaId, usuarioId };

    expect(await enTransaccionSegura(deLaOtra, (tx) => tx.select().from(saldosIniciales))).toEqual([]);
    expect((await enTransaccionSegura(propias, (tx) => tx.select().from(saldosIniciales))).length).toBeGreaterThan(0);
    await expect(
      enTransaccionSegura(deLaOtra, (tx) =>
        tx.insert(saldosIniciales).values({ empresaId: cuenta.empresaId, cuentaBancariaId: cuentaId }),
      ),
    ).rejects.toThrow();
  });
});
