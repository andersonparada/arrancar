/**
 * Registrar el reintegro del proveedor (CP4-7): por depósito (nota de crédito en Bancos con el concepto de reintegro, de
 * activo fijo si la factura lo es) y en efectivo (referencia del recibo obligatoria, sin movimiento y con el aviso de
 * depositarlo); varias notas en uno, el saldo libre de la nota, la numeración y el evento que se publica al confirmar.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import '../modulos/core/contratos/cuentas-por-pagar.contratos.js';
import { busEventos } from '../modulos/core/eventos/bus-eventos.js';
import { EscenarioDePagos } from './soporte/cuentas-por-pagar-pagar.js';
import {
  cuantosMovimientosEn,
  depositoDe,
  desgloseDe,
  efectivoDe,
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
import { auditoriaDe } from './soporte/ordenes-de-bancos.js';

const entorno = usarEntornoApi();
let e: EscenarioDePagos;
const eventos: Array<{ nombre: string; datos: Record<string, unknown> }> = [];

beforeAll(async () => {
  e = await EscenarioDePagos.preparar(entorno, 'cxpreintregistro');
  busEventos.suscribir('cuentas-por-pagar.reintegro_registrado', async (datos) => {
    eventos.push({ nombre: 'reintegro_registrado', datos: datos as unknown as Record<string, unknown> });
  });
});

afterAll(() => {
  eventos.length = 0;
});

/** Un proveedor nuevo con una nota de Q100.00 de saldo libre. */
async function unaNota(opciones: Parameters<typeof notaConSaldoLibre>[2] = {}): Promise<NotaDePrueba> {
  return notaConSaldoLibre(e, await e.mundo.unProveedor(), opciones);
}

const ficha = async (id: string) => (await e.propietario().get(`/api/cuentas-por-pagar/documentos/${id}`)).cuerpo;
const monto = (nota: NotaDePrueba, valor = '100.00') => ({ notaId: nota.notaPropia, monto: valor });

describe('por depósito', () => {
  it('crea la nota de crédito en Bancos con su origen, concepto y beneficiario, baja el saldo libre y publica el evento', async () => {
    const nota = await unaNota();
    const saldoAntes = await saldoDe(e.propietario(), e.cuentaBancariaId);

    const reintegro = await registrarReintegro(
      e.propietario(),
      depositoDe(e, nota.proveedor.proveedorId, [monto(nota)], { observaciones: 'Devolvió por transferencia' }),
    );

    expect(reintegro).toMatchObject({
      forma: 'deposito',
      fecha: HOY,
      monto: '100.00',
      estado: 'vigente',
      referencia: 'BOL-77',
      observaciones: 'Devolvió por transferencia',
      avisos: [],
      anulacion: null,
      puedeAnular: true,
      proveedor: { id: nota.proveedor.proveedorId },
      notas: [{ notaId: nota.notaPropia, serie: 'N', monto: '100.00' }],
    });
    expect(reintegro.movimiento).toMatchObject({ cuentaBancariaId: e.cuentaBancariaId });
    expect(await saldoDe(e.propietario(), e.cuentaBancariaId)).toBe(String((Number(saldoAntes) + 100).toFixed(2)));
    expect(await notaDelDeposito(reintegro.movimiento.id)).toMatchObject({
      tipo: 'credito',
      monto: '100.00',
      referencia: 'BOL-77',
      modulo: 'cuentas-por-pagar',
      origen: reintegro.id,
      clave: 'reintegro_de_proveedor',
      beneficiario: reintegro.proveedor.nombre,
    });
    expect(await ficha(nota.notaPropia)).toMatchObject({ saldo: '0.00', reintegrado: '100.00', puedeAjustar: false });
    expect(await auditoriaDe(reintegro.id)).toEqual([]);
    const evento = eventos.find(({ datos }) => datos.reintegroId === reintegro.id);
    expect(evento?.datos).toMatchObject({
      forma: 'deposito',
      fecha: HOY,
      montoCentavos: 10000,
      movimientoId: reintegro.movimiento.id,
      efecto: 'banco',
      proveedorId: nota.proveedor.proveedorId,
      notas: [{ documentoId: nota.notaPropia, montoCentavos: 10000, tieneActivoFijo: false }],
    });
  });

  it('puede devolver una parte y deja el resto de la nota libre', async () => {
    const nota = await unaNota();

    const reintegro = await registrarReintegro(
      e.propietario(),
      depositoDe(e, nota.proveedor.proveedorId, [monto(nota, '30.50')], { fecha: haceDias(1) }),
    );

    expect(reintegro).toMatchObject({ monto: '30.50', fecha: haceDias(1) });
    expect(await ficha(nota.notaPropia)).toMatchObject({
      saldo: '69.50',
      reintegrado: '30.50',
      puedeAjustar: true,
      puedeReintegrar: true,
    });
  });

  it('varias notas del proveedor van en un solo depósito, con el desglose de activo fijo cuando la factura lo es', async () => {
    const proveedor = await e.mundo.unProveedor();
    const comun = await notaConSaldoLibre(e, proveedor);
    const deActivo = await notaConSaldoLibre(e, proveedor, { facturaDeActivo: true });

    const reintegro = await registrarReintegro(
      e.propietario(),
      depositoDe(e, proveedor.proveedorId, [monto(comun, '60.00'), monto(deActivo, '100.00')]),
    );

    expect(reintegro.monto).toBe('160.00');
    expect(reintegro.notas).toHaveLength(2);
    expect(await desgloseDe(reintegro.movimiento.id)).toEqual([
      { clave: 'reintegro_de_proveedor', monto: '60.00' },
      { clave: 'reintegro_de_proveedor_de_activo', monto: '100.00' },
    ]);
    const evento = eventos.find(({ datos }) => datos.reintegroId === reintegro.id);
    expect(evento?.datos.notas).toEqual([
      { documentoId: comun.notaPropia, montoCentavos: 6000, tieneActivoFijo: false },
      { documentoId: deActivo.notaPropia, montoCentavos: 10000, tieneActivoFijo: true },
    ]);
  });

  it('una sola nota de factura de activo fijo va toda al concepto de activo', async () => {
    const nota = await unaNota({ facturaDeActivo: true });

    const reintegro = await registrarReintegro(
      e.propietario(),
      depositoDe(e, nota.proveedor.proveedorId, [monto(nota)]),
    );

    expect(await notaDelDeposito(reintegro.movimiento.id)).toMatchObject({ clave: 'reintegro_de_proveedor_de_activo' });
  });

  it('numera cada reintegro con el correlativo propio, sin saltos', async () => {
    const primera = await unaNota();
    const segunda = await unaNota();

    const uno = await registrarReintegro(
      e.propietario(),
      depositoDe(e, primera.proveedor.proveedorId, [monto(primera)]),
    );
    const dos = await registrarReintegro(e.propietario(), efectivoDe(segunda.proveedor.proveedorId, [monto(segunda)]));

    const [numeroUno, numeroDos] = [await reintegroEnBase(uno.id), await reintegroEnBase(dos.id)];
    expect(numeroDos.numero).toBe(numeroUno.numero + 1);
    expect(uno.numero).toBe(String(numeroUno.numero));
    expect(dos.numero).toBe(String(numeroDos.numero));
  });
});

describe('en efectivo', () => {
  it('exige la referencia del recibo y no deja nada si falta', async () => {
    const nota = await unaNota();
    const movimientos = await cuantosMovimientosEn(e.cuentaBancariaId);

    const cuerpo = (referencia: string | null) => efectivoDe(nota.proveedor.proveedorId, [monto(nota)], { referencia });

    const sin = await e.propietario().post(RUTA_DE_REINTEGROS, cuerpo(null));
    const enBlanco = await e.propietario().post(RUTA_DE_REINTEGROS, cuerpo('   '));

    expect(sin.estado).toBe(400);
    expect(sin.cuerpo.error).toMatchObject({
      codigo: 'referencia_del_recibo_obligatoria',
      detalles: { campo: 'referencia' },
    });
    expect(enBlanco.estado).toBe(400);
    expect(await ficha(nota.notaPropia)).toMatchObject({ saldo: '100.00', reintegrado: '0.00' });
    expect(await cuantosMovimientosEn(e.cuentaBancariaId)).toBe(movimientos);
  });

  it('se registra sin movimiento en Bancos, con el aviso de depositarlo y el efecto de efectivo', async () => {
    const nota = await unaNota();
    const saldoAntes = await saldoDe(e.propietario(), e.cuentaBancariaId);
    const movimientos = await cuantosMovimientosEn(e.cuentaBancariaId);

    const reintegro = await registrarReintegro(
      e.propietario(),
      efectivoDe(nota.proveedor.proveedorId, [monto(nota, '40.00')], { referencia: ' RC-9001 ' }),
    );

    expect(reintegro).toMatchObject({
      forma: 'efectivo',
      movimiento: null,
      referencia: 'RC-9001',
      monto: '40.00',
      avisos: ['Deposite el efectivo recibido o regístrelo en la caja de la empresa; Arrancar no lleva caja todavía.'],
    });
    expect(await reintegroEnBase(reintegro.id)).toMatchObject({
      forma: 'efectivo',
      movimiento_id: null,
      vigentes: '1',
    });
    expect(await cuantosMovimientosEn(e.cuentaBancariaId)).toBe(movimientos);
    expect(await saldoDe(e.propietario(), e.cuentaBancariaId)).toBe(saldoAntes);
    expect(await ficha(nota.notaPropia)).toMatchObject({ saldo: '60.00', reintegrado: '40.00' });
    const evento = eventos.find(({ datos }) => datos.reintegroId === reintegro.id);
    expect(evento?.datos).toMatchObject({ forma: 'efectivo', movimientoId: null, efecto: 'efectivo' });
  });

  it('un depósito sin cuenta bancaria se rechaza', async () => {
    const nota = await unaNota();

    const respuesta = await e
      .propietario()
      .post(RUTA_DE_REINTEGROS, depositoDe(e, nota.proveedor.proveedorId, [monto(nota)], { cuentaBancariaId: null }));

    expect(respuesta.cuerpo.error).toMatchObject({
      codigo: 'cuenta_del_deposito_obligatoria',
      detalles: { campo: 'cuentaBancariaId' },
    });
  });
});

describe('el reintegro y la ficha de la nota', () => {
  it('la ficha de la nota muestra sus reintegros y la ficha del reintegro se puede ver', async () => {
    const nota = await unaNota();
    const reintegro = await registrarReintegro(e.propietario(), efectivoDe(nota.proveedor.proveedorId, [monto(nota)]));

    const dto = await e.propietario().get(`${RUTA_DE_REINTEGROS}/${reintegro.id}`);

    expect(dto.estado).toBe(200);
    expect(dto.cuerpo).toMatchObject({ id: reintegro.id, numero: reintegro.numero, avisos: [] });
    expect((await ficha(nota.notaPropia)).reintegros).toMatchObject([
      { reintegroId: reintegro.id, forma: 'efectivo', estado: 'vigente', monto: '100.00' },
    ]);
  });
});
