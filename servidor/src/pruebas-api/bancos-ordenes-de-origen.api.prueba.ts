import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Operador } from '../modulos/core/compartido/aplicacion/operador.js';
import '../modulos/core/contratos/bancos.contratos.js';
import { mediador } from '../modulos/core/mediador/contexto.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  cuentaConChequera,
  desgloseDe,
  MODULOS_CON_CUENTAS_POR_PAGAR,
  movimientoDe,
  operadorDeLaCuenta,
} from './soporte/ordenes-de-bancos.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
const FECHA = '2026-02-10';
let cuenta: CuentaDePrueba;
let operador: Operador;
let cuentaBancariaId = '';
let chequeraId = '';
const avisosRecibidos: string[] = [];

const origen = () => ({ modulo: 'cuentas-por-pagar', documentoId: crypto.randomUUID() });
const pago = (centavos: number) => [{ claveDeSistema: 'pago_a_proveedor' as const, montoCentavos: centavos }];
const emitir = (datos: Record<string, unknown> = {}) =>
  mediador.enviar(operador, 'bancos.emitir_cheque_de_origen', {
    origen: origen(),
    chequeraId,
    fecha: FECHA,
    montoCentavos: 10000,
    beneficiario: 'Proveedor S.A.',
    noNegociable: true,
    conceptos: pago(10000),
    ...datos,
  });
const registrarNota = (datos: Record<string, unknown> = {}) =>
  mediador.enviar(operador, 'bancos.registrar_nota_de_origen', {
    origen: origen(),
    cuentaBancariaId,
    tipo: 'debito',
    fecha: FECHA,
    montoCentavos: 5000,
    beneficiario: 'Proveedor S.A.',
    conceptos: pago(5000),
    ...datos,
  });

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Ordenes',
    usuario: 'propietarioordenes',
    modulos: MODULOS_CON_CUENTAS_POR_PAGAR,
  });
  operador = await operadorDeLaCuenta(cuenta);
  ({ cuentaBancariaId, chequeraId } = await cuentaConChequera(cuenta.propietario, 'Cuenta de ordenes'));
  mediador.escuchar('cuentas-por-pagar', 'bancos.movimiento_por_cambiar', async (aviso) => {
    avisosRecibidos.push(`${aviso.cambio}:${aviso.movimientoId}`);
  });
});

afterAll(() => {
  mediador.retirarManejadoresDe('cuentas-por-pagar');
});

describe('bancos.emitir_cheque_de_origen', () => {
  it('emite el siguiente cheque con su origen, el concepto fijo y el movimiento en la cuenta', async () => {
    const pedido = origen();

    const respuesta = await emitir({ origen: pedido, referencia: 'Pago 1' });

    expect(respuesta).toMatchObject({ cuentaBancariaId, avisos: [] });
    const movimiento = await movimientoDe(cuenta.propietario, respuesta.movimientoId);
    expect(movimiento).toMatchObject({
      tipo: 'cheque',
      monto: '100.00',
      beneficiario: 'Proveedor S.A.',
      moduloDeOrigen: 'cuentas-por-pagar',
      documentoDeOrigenId: pedido.documentoId,
      conceptoNombre: 'Pago a proveedores',
      numeroDeCheque: respuesta.numeroDeCheque,
      desglose: [],
      puedeEliminar: false,
      puedeReclasificar: false,
    });
  });

  it('con dos conceptos deja el de mayor monto en el movimiento y el reparto aparte', async () => {
    const respuesta = await emitir({
      montoCentavos: 10000,
      conceptos: [
        { claveDeSistema: 'pago_a_proveedor', montoCentavos: 3000 },
        { claveDeSistema: 'pago_a_proveedor_de_activo', montoCentavos: 7000 },
      ],
    });

    const movimiento = await movimientoDe(cuenta.propietario, respuesta.movimientoId);
    expect(movimiento.conceptoNombre).toBe('Pago a proveedores de activo fijo');
    expect(await desgloseDe(respuesta.movimientoId)).toEqual([
      { clave: 'pago_a_proveedor', monto: '30.00' },
      { clave: 'pago_a_proveedor_de_activo', monto: '70.00' },
    ]);
    expect(movimiento.desglose.map((l: { monto: string }) => l.monto)).toEqual(['70.00', '30.00']);
  });

  it('un cheque pedido de otra chequera, o ya emitido, no está disponible', async () => {
    const primero = await emitir();
    const cheque = await cuenta.propietario.get(`/api/bancos/cuentas-bancarias/${cuentaBancariaId}/siguiente-cheque`);

    await expect(emitir({ chequeId: cheque.cuerpo.id, chequeraId: crypto.randomUUID() })).rejects.toMatchObject({
      codigo: 'cheque_no_disponible',
    });
    expect(primero.numeroDeCheque).toBeGreaterThan(0);
  });

  it('un desglose que no suma el monto se rechaza y no deja nada', async () => {
    const antes = await cuenta.propietario.get(`/api/bancos/cuentas-bancarias/${cuentaBancariaId}`);

    await expect(emitir({ montoCentavos: 10000, conceptos: pago(9999) })).rejects.toMatchObject({
      codigo: 'desglose_no_suma',
    });
    const despues = await cuenta.propietario.get(`/api/bancos/cuentas-bancarias/${cuentaBancariaId}`);
    expect(despues.cuerpo.saldo).toBe(antes.cuerpo.saldo);
  });

  it('un concepto de reintegro no sirve para un cheque', async () => {
    await expect(
      emitir({ conceptos: [{ claveDeSistema: 'reintegro_de_proveedor', montoCentavos: 10000 }] }),
    ).rejects.toMatchObject({ codigo: 'concepto_de_desglose_incompatible' });
  });
});

describe('bancos.registrar_nota_de_origen', () => {
  it('registra la nota de débito con número, origen y concepto fijos', async () => {
    const pedido = origen();

    const respuesta = await registrarNota({ origen: pedido });

    expect(respuesta).toMatchObject({ numero: expect.any(Number), avisos: [] });
    const nota = await movimientoDe(cuenta.propietario, respuesta.movimientoId);
    expect(nota).toMatchObject({
      tipo: 'debito',
      monto: '50.00',
      moduloDeOrigen: 'cuentas-por-pagar',
      documentoDeOrigenId: pedido.documentoId,
      marcadaParaModulo: null,
      puedeEliminar: false,
    });
  });

  it('una nota de crédito (reintegro) lleva un concepto de reintegro y no uno de pago', async () => {
    const reintegro = await registrarNota({
      tipo: 'credito',
      conceptos: [{ claveDeSistema: 'reintegro_de_proveedor', montoCentavos: 5000 }],
    });

    const nota = await movimientoDe(cuenta.propietario, reintegro.movimientoId);
    expect(nota).toMatchObject({ tipo: 'credito', conceptoNombre: 'Reintegro de proveedores' });
    await expect(registrarNota({ tipo: 'credito' })).rejects.toMatchObject({
      codigo: 'concepto_de_desglose_incompatible',
    });
  });
});

describe('bancos.anular_movimiento_de_origen', () => {
  it('un cheque de mes abierto se anula a la antigua, con motivo rotulado, sin avisar a quien lo pide', async () => {
    const pedido = origen();
    const cheque = await emitir({ origen: pedido });
    avisosRecibidos.length = 0;

    const respuesta = await mediador.enviar(operador, 'bancos.anular_movimiento_de_origen', {
      origen: pedido,
      movimientoId: cheque.movimientoId,
      motivo: 'Pago anulado',
    });

    expect(respuesta).toEqual({ forma: 'sin_inverso', inversoId: null });
    expect(avisosRecibidos).toEqual([]);
    const movimiento = await movimientoDe(cuenta.propietario, cheque.movimientoId);
    expect(movimiento.motivoDeAnulacion).toBe('Anulado desde Cuentas por pagar: Pago anulado');
  });

  it('una nota se anula con su inverso y la respuesta dice cuál es', async () => {
    const pedido = origen();
    const nota = await registrarNota({ origen: pedido });

    const respuesta = await mediador.enviar(operador, 'bancos.anular_movimiento_de_origen', {
      origen: pedido,
      movimientoId: nota.movimientoId,
      motivo: 'Error del pago',
    });

    expect(respuesta.forma).toBe('con_inverso');
    const inverso = await movimientoDe(cuenta.propietario, respuesta.inversoId!);
    expect(inverso).toMatchObject({ tipo: 'credito', revierteAId: nota.movimientoId });
  });

  it('un movimiento que no es del documento que lo pide se rechaza', async () => {
    const nota = await registrarNota();

    await expect(
      mediador.enviar(operador, 'bancos.anular_movimiento_de_origen', {
        origen: origen(),
        movimientoId: nota.movimientoId,
        motivo: 'No es mío',
      }),
    ).rejects.toMatchObject({ codigo: 'origen_del_movimiento_no_coincide' });
  });
});

describe('bancos.fijar_desglose_de_conceptos', () => {
  it('reemplaza el reparto de un movimiento con origen, cambia su concepto y es idempotente', async () => {
    const pedido = origen();
    const nota = await registrarNota({ origen: pedido });
    const fijar = (
      conceptos: Array<{ claveDeSistema: 'pago_a_proveedor' | 'pago_a_proveedor_de_activo'; montoCentavos: number }>,
    ) =>
      mediador.enviar(operador, 'bancos.fijar_desglose_de_conceptos', {
        movimientoId: nota.movimientoId,
        origen: pedido,
        conceptos,
      });
    const mixto = [
      { claveDeSistema: 'pago_a_proveedor' as const, montoCentavos: 2000 },
      { claveDeSistema: 'pago_a_proveedor_de_activo' as const, montoCentavos: 3000 },
    ];

    expect(await fijar(mixto)).toEqual({ conDesglose: true });
    expect(await fijar(mixto)).toEqual({ conDesglose: true });
    expect(await desgloseDe(nota.movimientoId)).toHaveLength(2);
    expect((await movimientoDe(cuenta.propietario, nota.movimientoId)).conceptoNombre).toBe(
      'Pago a proveedores de activo fijo',
    );

    expect(await fijar([{ claveDeSistema: 'pago_a_proveedor', montoCentavos: 5000 }])).toEqual({
      conDesglose: false,
    });
    expect(await desgloseDe(nota.movimientoId)).toEqual([]);
  });

  it('no suma, otro origen o una nota que no está marcada se rechazan', async () => {
    const pedido = origen();
    const nota = await registrarNota({ origen: pedido });
    const sinOrigen = await cuenta.propietario.post('/api/bancos/notas', {
      cuentaBancariaId,
      tipo: 'debito',
      fecha: FECHA,
      monto: '10.00',
      referencia: null,
      beneficiario: null,
      observaciones: null,
      conceptoId: (await cuenta.propietario.get('/api/bancos/conceptos')).cuerpo.find(
        (c: { claveDeSistema: string | null }) => c.claveDeSistema === null,
      ).id,
    });

    await expect(
      mediador.enviar(operador, 'bancos.fijar_desglose_de_conceptos', {
        movimientoId: nota.movimientoId,
        origen: pedido,
        conceptos: pago(4999),
      }),
    ).rejects.toMatchObject({ codigo: 'desglose_no_suma' });
    await expect(
      mediador.enviar(operador, 'bancos.fijar_desglose_de_conceptos', {
        movimientoId: nota.movimientoId,
        origen: origen(),
        conceptos: pago(5000),
      }),
    ).rejects.toMatchObject({ codigo: 'origen_del_movimiento_no_coincide' });
    await expect(
      mediador.enviar(operador, 'bancos.fijar_desglose_de_conceptos', {
        movimientoId: sinOrigen.cuerpo.id,
        origen: null,
        conceptos: pago(1000),
      }),
    ).rejects.toMatchObject({ codigo: 'nota_no_marcada' });
  });
});
