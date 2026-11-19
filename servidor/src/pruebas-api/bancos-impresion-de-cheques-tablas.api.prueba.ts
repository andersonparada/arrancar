/**
 * IC-1: lo que la migración 0038 agrega a Bancos para imprimir cheques: cada check rechaza lo prohibido, la seguridad
 * por cuenta de los formatos y la de solo agregar de las impresiones, y el reparto de permisos por rol y por usuario.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { enTransaccionSegura } from '../modulos/core/compartido/pruebas/en-transaccion-segura.js';
import { formatosDeCheque } from '../modulos/bancos/infraestructura/persistencia/formatos-de-cheque.tablas.js';
import { impresionesDeCheques } from '../modulos/bancos/infraestructura/persistencia/impresiones-de-cheques.tablas.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearCuentaSinSaldo, restriccionDe } from './soporte/escenarios-de-apertura.js';
import { conceptoGeneral } from './soporte/escenarios-de-bancos.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let otra: CuentaDePrueba;
let conceptoId = '';
let cuentaBancariaId = '';
let secuencia = 0;

async function crearFormato(cuentaId: string, nombre = `Formato ${(secuencia += 1)}`): Promise<string> {
  const [fila] = await comoPropietario<{ id: string }>(
    `insert into bancos.formatos_de_cheque (cuenta_id, nombre, base) values ($1, $2, 'cheque_suelto') returning id`,
    [cuentaId, nombre],
  );
  return fila!.id;
}

async function crearChequera(extra: { formatoId?: string; plantilla?: string; deApertura?: boolean } = {}) {
  secuencia += 1;
  const [fila] = await comoPropietario<{ id: string }>(
    `insert into bancos.chequeras (empresa_id, cuenta_bancaria_id, serie, desde, hasta, activa, de_apertura,
        formato_de_cheque_id, plantilla_de_cheque)
     values ($1, $2, $3, 1, 10, $4, $5, $6, $7) returning id`,
    [
      cuenta.empresaId,
      cuentaBancariaId,
      `IC${secuencia}`,
      !extra.deApertura,
      extra.deApertura ?? false,
      extra.formatoId ?? null,
      extra.plantilla ?? null,
    ],
  );
  return fila!.id;
}

async function crearCheque(chequeraId: string): Promise<string> {
  secuencia += 1;
  const [fila] = await comoPropietario<{ id: string }>(
    'insert into bancos.cheques (empresa_id, chequera_id, numero) values ($1, $2, $3) returning id',
    [cuenta.empresaId, chequeraId, secuencia],
  );
  return fila!.id;
}

async function crearMovimiento(tipo: string, abono: boolean): Promise<string | null> {
  return restriccionDe(
    `insert into bancos.movimientos (empresa_id, cuenta_bancaria_id, tipo, fecha, monto, concepto_id, para_abono_en_cuenta)
     values ($1, $2, $3, '2026-09-30', 10, $4, $5)`,
    [cuenta.empresaId, cuentaBancariaId, tipo, conceptoId, abono],
  );
}

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Tablas IC', usuario: 'propietariotablasic', modulos: ['bancos'] });
  otra = await darDeAltaCuenta(entorno, { nombre: 'Otra IC', usuario: 'propietariootraic', modulos: ['bancos'] });
  cuentaBancariaId = await crearCuentaSinSaldo(cuenta.propietario);
  conceptoId = await conceptoGeneral(cuenta.propietario);
});

describe('bancos.movimientos.para_abono_en_cuenta', () => {
  it('queda apagada en lo existente y solo un cheque puede llevarla', async () => {
    expect(await crearMovimiento('cheque', true)).toBeNull();
    expect(await crearMovimiento('debito', false)).toBeNull();
    expect(await crearMovimiento('debito', true)).toBe('movimientos_abono_en_cuenta_solo_cheque');
    expect(await crearMovimiento('credito', true)).toBe('movimientos_abono_en_cuenta_solo_cheque');
    const [filas] = await comoPropietario<{ n: string }>(
      `select count(*) as n from bancos.movimientos where tipo <> 'cheque' and para_abono_en_cuenta`,
      [],
    );
    expect(filas!.n).toBe('0');
  });
});

describe('bancos.cheques', () => {
  it('acepta las cuatro causas y rechaza otra; un inutilizado no puede tener movimiento', async () => {
    const chequeraId = await crearChequera();
    const poner = async (causa: string, movimiento = false) => {
      const id = await crearCheque(chequeraId);
      const [mov] = movimiento
        ? await comoPropietario<{ id: string }>(
            `insert into bancos.movimientos (empresa_id, cuenta_bancaria_id, tipo, fecha, monto, concepto_id)
             values ($1, $2, 'cheque', '2026-09-30', 10, $3) returning id`,
            [cuenta.empresaId, cuentaBancariaId, conceptoId],
          )
        : [{ id: null }];
      return restriccionDe(
        `update bancos.cheques set estado = 'anulado', causa_de_anulacion = $2, movimiento_id = $3 where id = $1`,
        [id, causa, mov!.id],
      );
    };
    for (const causa of ['manual', 'caducidad', 'inutilizado', 'extraviado']) expect(await poner(causa)).toBeNull();
    expect(await poner('otra')).toBe('cheques_causa_de_anulacion_valida');
    expect(await poner('inutilizado', true)).toBe('cheques_inutilizado_sin_movimiento');
    expect(await poner('extraviado', true)).toBeNull();
  });

  it('los cheques que ya existían quedan sin impresión', async () => {
    const id = await crearCheque(await crearChequera());
    const [fila] = await comoPropietario<{ impreso_en: Date | null }>(
      'select impreso_en from bancos.cheques where id = $1',
      [id],
    );
    expect(fila!.impreso_en).toBeNull();
  });
});

describe('bancos.chequeras: formato', () => {
  it('lleva un formato o una plantilla, no los dos; la plantilla debe ser de fábrica', async () => {
    const formatoId = await crearFormato(cuenta.cuentaId);
    await expect(crearChequera({ formatoId })).resolves.toBeTruthy();
    await expect(crearChequera({ plantilla: 'cheque_suelto' })).resolves.toBeTruthy();
    await expect(crearChequera({ formatoId, plantilla: 'cheque_suelto' })).rejects.toMatchObject({
      constraint: 'chequeras_un_formato',
    });
    await expect(crearChequera({ plantilla: 'de_otro_banco' })).rejects.toMatchObject({
      constraint: 'chequeras_plantilla_valida',
    });
  });

  it('una chequera de apertura no lleva formato', async () => {
    const formatoId = await crearFormato(cuenta.cuentaId);
    await expect(crearChequera({ deApertura: true, formatoId })).rejects.toMatchObject({
      constraint: 'chequeras_apertura_sin_formato',
    });
    await expect(crearChequera({ deApertura: true, plantilla: 'cheque_suelto' })).rejects.toMatchObject({
      constraint: 'chequeras_apertura_sin_formato',
    });
  });

  it('un formato en uso por una chequera no se elimina', async () => {
    const formatoId = await crearFormato(cuenta.cuentaId);
    await crearChequera({ formatoId });
    expect(await restriccionDe('delete from bancos.formatos_de_cheque where id = $1', [formatoId])).toBe(
      'chequeras_formato_de_cheque_id_formatos_de_cheque_id_fk',
    );
  });
});

describe('bancos.formatos_de_cheque', () => {
  it('el nombre es único por cuenta sin importar mayúsculas ni acentos, y la base debe ser de fábrica', async () => {
    const nombre = 'Cheque Banrural';
    await crearFormato(cuenta.cuentaId, nombre);
    await expect(crearFormato(cuenta.cuentaId, 'CHEQUE  banrural')).rejects.toMatchObject({
      constraint: 'formatos_de_cheque_nombre_unico',
    });
    await expect(crearFormato(otra.cuentaId, nombre)).resolves.toBeTruthy();
    const base = restriccionDe(
      `insert into bancos.formatos_de_cheque (cuenta_id, nombre, base) values ($1, 'X', 'z')`,
      [cuenta.cuentaId],
    );
    expect(await base).toBe('formatos_de_cheque_base_valida');
    const vacio = restriccionDe(
      `insert into bancos.formatos_de_cheque (cuenta_id, nombre, base) values ($1, '  ', 'cheque_suelto')`,
      [cuenta.cuentaId],
    );
    expect(await vacio).toBe('formatos_de_cheque_nombre_valido');
  });

  it('cada cuenta suscriptora ve solo los suyos y no escribe en los ajenos', async () => {
    await crearFormato(cuenta.cuentaId);
    const usuarioId = crypto.randomUUID();
    const deLaOtra = { empresaId: otra.empresaId, cuentaId: otra.cuentaId, usuarioId };
    const propias = { empresaId: cuenta.empresaId, cuentaId: cuenta.cuentaId, usuarioId };
    const ajenos = await enTransaccionSegura(deLaOtra, (tx) => tx.select().from(formatosDeCheque));
    expect(ajenos.every((f) => f.cuentaId === otra.cuentaId)).toBe(true);
    expect((await enTransaccionSegura(propias, (tx) => tx.select().from(formatosDeCheque))).length).toBeGreaterThan(0);
    await expect(
      enTransaccionSegura(deLaOtra, (tx) =>
        tx.insert(formatosDeCheque).values({ cuentaId: cuenta.cuentaId, nombre: 'Ajeno', base: 'cheque_suelto' }),
      ),
    ).rejects.toThrow();
  });
});

describe('bancos.impresiones_de_cheques', () => {
  const insertar = (chequeId: string, tipo: string, motivo: string | null) =>
    comoPropietario(
      `insert into bancos.impresiones_de_cheques (empresa_id, cheque_id, movimiento_id, tipo, motivo, formato, impreso_por)
       values ($1, $2, $3, $4, $5, '{}', gen_random_uuid())`,
      [cuenta.empresaId, chequeId, movimientoDe(chequeId), tipo, motivo],
    );
  const movimientos = new Map<string, string>();
  const movimientoDe = (chequeId: string): string => movimientos.get(chequeId)!;

  async function chequeConMovimiento(): Promise<string> {
    const chequeId = await crearCheque(await crearChequera());
    const [mov] = await comoPropietario<{ id: string }>(
      `insert into bancos.movimientos (empresa_id, cuenta_bancaria_id, tipo, fecha, monto, concepto_id)
       values ($1, $2, 'cheque', '2026-09-30', 10, $3) returning id`,
      [cuenta.empresaId, cuentaBancariaId, conceptoId],
    );
    movimientos.set(chequeId, mov!.id);
    return chequeId;
  }

  it('un solo original por cheque, pero las reimpresiones con motivo pueden ser muchas', async () => {
    const chequeId = await chequeConMovimiento();
    await insertar(chequeId, 'original', null);
    await expect(insertar(chequeId, 'original', null)).rejects.toMatchObject({
      constraint: 'impresiones_de_cheques_un_original',
    });
    await insertar(chequeId, 'reimpresion', 'Se atascó el papel');
    await insertar(chequeId, 'reimpresion', 'Otra copia');
  });

  it('la reimpresión exige motivo de 1 a 300 caracteres y el tipo debe ser conocido', async () => {
    const chequeId = await chequeConMovimiento();
    const motivo = { constraint: 'impresiones_de_cheques_motivo_valido' };
    await expect(insertar(chequeId, 'reimpresion', null)).rejects.toMatchObject(motivo);
    await expect(insertar(chequeId, 'reimpresion', '   ')).rejects.toMatchObject(motivo);
    await expect(insertar(chequeId, 'reimpresion', 'x'.repeat(301))).rejects.toMatchObject(motivo);
    await expect(insertar(chequeId, 'otro', 'x')).rejects.toMatchObject({
      constraint: 'impresiones_de_cheques_tipo_valido',
    });
  });

  it('solo se agrega y se lee dentro de la empresa: ni cambiar, ni borrar, ni ver las ajenas', async () => {
    const chequeId = await chequeConMovimiento();
    await insertar(chequeId, 'original', null);
    const usuarioId = crypto.randomUUID();
    const propias = { empresaId: cuenta.empresaId, cuentaId: cuenta.cuentaId, usuarioId };
    const deLaOtra = { empresaId: otra.empresaId, cuentaId: otra.cuentaId, usuarioId };

    expect((await enTransaccionSegura(propias, (tx) => tx.select().from(impresionesDeCheques))).length).toBe(
      (await comoPropietario('select 1 from bancos.impresiones_de_cheques where empresa_id = $1', [cuenta.empresaId]))
        .length,
    );
    expect(await enTransaccionSegura(deLaOtra, (tx) => tx.select().from(impresionesDeCheques))).toEqual([]);
    const cambiadas = await enTransaccionSegura(propias, (tx) =>
      tx.update(impresionesDeCheques).set({ motivo: 'cambiado' }).returning(),
    );
    expect(cambiadas).toEqual([]);
    const borradas = await enTransaccionSegura(propias, (tx) => tx.delete(impresionesDeCheques).returning());
    expect(borradas).toEqual([]);
  });
});
