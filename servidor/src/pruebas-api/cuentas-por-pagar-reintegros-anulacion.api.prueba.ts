/**
 * Anular un reintegro del proveedor (CP4-7), desde Cuentas por pagar y desde Bancos: la fecha contable de la anulación
 * (con inverso, sin inverso por aviso y hoy en efectivo), el saldo libre que vuelve a la nota, la auditoría, el evento, lo
 * que se rechaza (ya anulado, nota conciliada) y lo que Bancos no puede corregir ni eliminar.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import '../modulos/core/contratos/cuentas-por-pagar.contratos.js';
import { busEventos } from '../modulos/core/eventos/bus-eventos.js';
import type { CambioDeMovimiento, FormaDeAnulacion } from '../modulos/core/contratos/bancos.contratos.js';
import { mediador } from '../modulos/core/mediador/contexto.js';
import type { ClienteApi } from './soporte/cliente-api.js';
import {
  cerrarEnero,
  cuentaConFondos,
  iniciarEnero,
  MES_CONCILIADO,
} from './soporte/cuentas-por-pagar-pagos-cambios.js';
import { EscenarioDePagos } from './soporte/cuentas-por-pagar-pagar.js';
import {
  cuantosMovimientosEn,
  depositoDe,
  efectivoDe,
  moverFechaDelReintegro,
  notaConSaldoLibre,
  notaDelDeposito,
  registrarReintegro,
  reintegroEnBase,
  RUTA_DE_REINTEGROS,
  type NotaDePrueba,
} from './soporte/cuentas-por-pagar-reintegros.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { haceDias, HOY } from './soporte/escenario-de-documentos.js';
import { saldoDe } from './soporte/escenarios-de-bancos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';
import { auditoriaDe, operadorDeLaCuenta } from './soporte/ordenes-de-bancos.js';

const entorno = usarEntornoApi();
let e: EscenarioDePagos;
let autoriza: ClienteApi;
const eventos: Array<Record<string, unknown>> = [];

beforeAll(async () => {
  e = await EscenarioDePagos.preparar(entorno, 'cxpreintanul');
  autoriza = await crearUsuarioConPermisos(entorno, e.mundo.escenario.cuenta, {
    nombres: 'Autoriza',
    apellidos: 'Reintegros',
    permisos: ['bancos.conciliaciones.ver', 'bancos.conciliaciones.autorizar'],
  });
  busEventos.suscribir('cuentas-por-pagar.reintegro_anulado', async (datos) => {
    eventos.push(datos as unknown as Record<string, unknown>);
  });
});

afterAll(() => {
  eventos.length = 0;
});

async function unaNota(): Promise<NotaDePrueba> {
  return notaConSaldoLibre(e, await e.mundo.unProveedor());
}

const ficha = async (id: string) => (await e.propietario().get(`/api/cuentas-por-pagar/documentos/${id}`)).cuerpo;
const notas = (nota: NotaDePrueba) => [{ notaId: nota.notaPropia, monto: '100.00' }];
const anular = (id: string, cuerpo: Record<string, unknown> = { motivo: 'Se depositó por error' }) =>
  e.propietario().post(`${RUTA_DE_REINTEGROS}/${id}/anular`, cuerpo);
const eventoDe = (reintegroId: string) => eventos.find((datos) => datos.reintegroId === reintegroId);

describe('anular un depósito desde Cuentas por pagar', () => {
  it('anula la nota de Bancos con inverso, devuelve el saldo libre a la nota, se audita y publica el evento', async () => {
    const nota = await unaNota();
    const reintegro = await registrarReintegro(
      e.propietario(),
      depositoDe(e, nota.proveedor.proveedorId, notas(nota), { fecha: haceDias(2) }),
    );
    const saldoConDeposito = await saldoDe(e.propietario(), e.cuentaBancariaId);

    const anulado = await anular(reintegro.id, { motivo: 'Se depositó por error', fecha: HOY });

    expect(anulado.estado, JSON.stringify(anulado.cuerpo)).toBe(200);
    expect(anulado.cuerpo).toMatchObject({
      estado: 'anulado',
      anulacion: { fecha: HOY, motivo: 'Se depositó por error' },
      puedeAnular: false,
    });
    expect(await reintegroEnBase(reintegro.id)).toMatchObject({
      estado: 'anulado',
      fecha: haceDias(2),
      fecha_de_anulacion: HOY,
      vigentes: '0',
    });
    expect(await notaDelDeposito(reintegro.movimiento.id)).toMatchObject({ anulada: true, inverso_fecha: HOY });
    expect(Number(await saldoDe(e.propietario(), e.cuentaBancariaId))).toBe(Number(saldoConDeposito) - 100);
    expect(await ficha(nota.notaPropia)).toMatchObject({ saldo: '100.00', reintegrado: '0.00', puedeReintegrar: true });
    expect(await auditoriaDe(reintegro.id)).toEqual([
      { accion: 'anular', motivo: 'Se depositó por error', recurso: 'cuentas-por-pagar.reintegros' },
    ]);
    expect(eventoDe(reintegro.id)).toMatchObject({
      fecha: HOY,
      fechaOriginal: haceDias(2),
      montoCentavos: 10000,
      forma: 'deposito',
      efecto: 'banco',
      anulacionEnBancos: 'con_inverso',
    });
  });

  it('sin fecha, el inverso es de hoy; la nota recuperada se puede reintegrar otra vez', async () => {
    const nota = await unaNota();
    const reintegro = await registrarReintegro(e.propietario(), depositoDe(e, nota.proveedor.proveedorId, notas(nota)));

    const anulado = await anular(reintegro.id);

    expect(anulado.estado, JSON.stringify(anulado.cuerpo)).toBe(200);
    expect((await reintegroEnBase(reintegro.id)).fecha_de_anulacion).toBe(HOY);
    await registrarReintegro(e.propietario(), efectivoDe(nota.proveedor.proveedorId, notas(nota)));
  });

  it('una fecha de inverso anterior al depósito la rechaza Bancos y todo sigue vigente', async () => {
    const nota = await unaNota();
    const reintegro = await registrarReintegro(e.propietario(), depositoDe(e, nota.proveedor.proveedorId, notas(nota)));

    const respuesta = await anular(reintegro.id, { motivo: 'Error', fecha: haceDias(5) });

    expect(respuesta.estado).toBeGreaterThanOrEqual(400);
    expect(await reintegroEnBase(reintegro.id)).toMatchObject({ estado: 'vigente', vigentes: '1' });
    expect((await notaDelDeposito(reintegro.movimiento.id)).anulada).toBe(false);
    expect(await auditoriaDe(reintegro.id)).toEqual([]);
  });

  it('pide el motivo y no anula dos veces', async () => {
    const nota = await unaNota();
    const reintegro = await registrarReintegro(e.propietario(), depositoDe(e, nota.proveedor.proveedorId, notas(nota)));

    const sinMotivo = await anular(reintegro.id, { motivo: '   ' });
    const primera = await anular(reintegro.id);
    const otra = await anular(reintegro.id);

    expect(sinMotivo.estado).toBe(400);
    expect(primera.estado).toBe(200);
    expect(otra.cuerpo.error.codigo).toBe('reintegro_ya_anulado');
    expect(await auditoriaDe(reintegro.id)).toHaveLength(1);
  });

  it('un reintegro que no existe responde que no se encontró', async () => {
    expect((await anular(crypto.randomUUID())).estado).toBe(404);
  });

  it('con la nota de Bancos ya conciliada también se anula, con inverso de hoy', async () => {
    const cuenta = await cuentaConFondos(e.propietario(), 'Cuenta de reintegros cobrados');
    const nota = await unaNota();
    const reintegro = await registrarReintegro(
      e.propietario(),
      depositoDe(e, nota.proveedor.proveedorId, notas(nota), { cuentaBancariaId: cuenta.cuentaBancariaId }),
    );
    await moverFechaDelReintegro(reintegro.id, MES_CONCILIADO);
    await iniciarEnero(e.propietario(), cuenta.cuentaBancariaId, [reintegro.movimiento.id]);

    const desdeAqui = await anular(reintegro.id);

    expect(desdeAqui.estado, JSON.stringify(desdeAqui.cuerpo)).toBe(200);
    expect(await reintegroEnBase(reintegro.id)).toMatchObject({ estado: 'anulado', fecha_de_anulacion: HOY });
  });

  it('en un mes conciliado anula con inverso en la fecha que se escriba', async () => {
    const cuenta = await cuentaConFondos(e.propietario(), 'Cuenta de reintegros cerrada');
    const nota = await unaNota();
    const reintegro = await registrarReintegro(
      e.propietario(),
      depositoDe(e, nota.proveedor.proveedorId, notas(nota), { cuentaBancariaId: cuenta.cuentaBancariaId }),
    );
    await moverFechaDelReintegro(reintegro.id, MES_CONCILIADO);
    await cerrarEnero(e.propietario(), autoriza, await iniciarEnero(e.propietario(), cuenta.cuentaBancariaId));

    const anulado = await anular(reintegro.id, { motivo: 'Mes cerrado', fecha: HOY });

    expect(anulado.estado, JSON.stringify(anulado.cuerpo)).toBe(200);
    expect(await reintegroEnBase(reintegro.id)).toMatchObject({ fecha: MES_CONCILIADO, fecha_de_anulacion: HOY });
  });
});

describe('anular un reintegro en efectivo', () => {
  it('no mueve nada en Bancos, su fecha contable es hoy y el evento no trae anulación en Bancos', async () => {
    const nota = await unaNota();
    const reintegro = await registrarReintegro(
      e.propietario(),
      efectivoDe(nota.proveedor.proveedorId, notas(nota), { fecha: haceDias(2) }),
    );
    const movimientos = await cuantosMovimientosEn(e.cuentaBancariaId);

    const anulado = await anular(reintegro.id, { motivo: 'No llegó el efectivo', fecha: haceDias(1) });

    expect(anulado.estado, JSON.stringify(anulado.cuerpo)).toBe(200);
    expect(anulado.cuerpo).toMatchObject({ estado: 'anulado', anulacion: { fecha: HOY }, movimiento: null });
    expect(await reintegroEnBase(reintegro.id)).toMatchObject({
      fecha: haceDias(2),
      fecha_de_anulacion: HOY,
      vigentes: '0',
    });
    expect(await cuantosMovimientosEn(e.cuentaBancariaId)).toBe(movimientos);
    expect(await ficha(nota.notaPropia)).toMatchObject({ saldo: '100.00' });
    expect(eventoDe(reintegro.id)).toMatchObject({
      forma: 'efectivo',
      efecto: 'efectivo',
      anulacionEnBancos: null,
      fecha: HOY,
      fechaOriginal: haceDias(2),
    });
  });
});

describe('anular la nota de crédito desde Bancos', () => {
  it('anula el reintegro con la fecha del inverso y devuelve el saldo libre a la nota', async () => {
    const nota = await unaNota();
    const reintegro = await registrarReintegro(
      e.propietario(),
      depositoDe(e, nota.proveedor.proveedorId, notas(nota), { fecha: haceDias(2) }),
    );

    const respuesta = await e
      .propietario()
      .post(`/api/bancos/notas/${reintegro.movimiento.id}/anular`, { motivo: 'Nota duplicada', fecha: HOY });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(await reintegroEnBase(reintegro.id)).toMatchObject({
      estado: 'anulado',
      fecha_de_anulacion: HOY,
      vigentes: '0',
    });
    expect(await ficha(nota.notaPropia)).toMatchObject({ saldo: '100.00', reintegrado: '0.00' });
    expect(await auditoriaDe(reintegro.id)).toMatchObject([
      { accion: 'anular', recurso: 'cuentas-por-pagar.reintegros' },
    ]);
    expect(eventoDe(reintegro.id)).toMatchObject({ anulacionEnBancos: 'con_inverso', fecha: HOY });
  });
});

describe('lo que Bancos no puede hacer con la nota de un reintegro', () => {
  const aviso = (
    reintegro: { id: string; movimiento: { id: string } },
    cambio: CambioDeMovimiento,
    forma: FormaDeAnulacion = 'con_inverso',
  ) => ({
    movimientoId: reintegro.movimiento.id,
    moduloDeOrigen: 'cuentas-por-pagar',
    documentoDeOrigenId: reintegro.id,
    cambio,
    formaDeAnulacion: cambio === 'anular' ? forma : null,
    motivo: 'Prueba',
    fecha: null,
  });

  it('no elimina ni corrige la nota, y el aviso rechaza con el error del módulo', async () => {
    const nota = await unaNota();
    const reintegro = await registrarReintegro(e.propietario(), depositoDe(e, nota.proveedor.proveedorId, notas(nota)));
    const ruta = `/api/bancos/notas/${reintegro.movimiento.id}`;

    const eliminar = await e.propietario().delete(ruta, { motivo: 'Intento' });
    const corregir = await e.propietario().put(ruta, { monto: '80.00' });

    for (const respuesta of [eliminar, corregir]) expect(respuesta.estado).toBeGreaterThanOrEqual(400);
    const operador = await operadorDeLaCuenta(e.mundo.escenario.cuenta);
    for (const cambio of ['eliminar', 'blanquear', 'corregir', 'reclasificar', 'desmarcar'] as const) {
      await expect(
        mediador.avisar(operador, 'bancos.movimiento_por_cambiar', aviso(reintegro, cambio)),
      ).rejects.toMatchObject({ codigo: 'movimiento_de_un_reintegro' });
    }
    expect((await reintegroEnBase(reintegro.id)).estado).toBe('vigente');
  });

  it('el aviso de anular sin inverso fecha la anulación con la del reintegro; es idempotente y luego no deja eliminar', async () => {
    const nota = await unaNota();
    const reintegro = await registrarReintegro(
      e.propietario(),
      depositoDe(e, nota.proveedor.proveedorId, notas(nota), { fecha: haceDias(2) }),
    );
    const operador = await operadorDeLaCuenta(e.mundo.escenario.cuenta);

    await mediador.avisar(operador, 'bancos.movimiento_por_cambiar', aviso(reintegro, 'anular', 'sin_inverso'));
    await mediador.avisar(operador, 'bancos.movimiento_por_cambiar', aviso(reintegro, 'anular', 'sin_inverso'));
    await mediador.avisar(operador, 'bancos.movimiento_por_cambiar', {
      ...aviso(reintegro, 'blanquear'),
      movimientoId: crypto.randomUUID(),
    });

    expect(await reintegroEnBase(reintegro.id)).toMatchObject({ estado: 'anulado', fecha_de_anulacion: haceDias(2) });
    expect(await auditoriaDe(reintegro.id)).toHaveLength(1);
    expect(eventoDe(reintegro.id)).toMatchObject({ anulacionEnBancos: 'sin_inverso', fecha: haceDias(2) });
    await expect(
      mediador.avisar(operador, 'bancos.movimiento_por_cambiar', aviso(reintegro, 'eliminar')),
    ).rejects.toMatchObject({ codigo: 'movimiento_con_reintegro_anulado' });
  });
});
