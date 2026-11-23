/**
 * AP-2: las órdenes `bancos.ligar_cheque_de_apertura` y `bancos.desligar_cheque_de_apertura` (diseño CP-AP §2.7): el
 * posfechado de la carga inicial pasa a ser de un pago de Cuentas por pagar y vuelve a quedar suelto.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import type { Operador } from '../modulos/core/compartido/aplicacion/operador.js';
import '../modulos/core/contratos/bancos.contratos.js';
import { chequeDeLaPartida } from './soporte/anulaciones-de-apertura.js';
import { agregarPartida, empresaConInicio, guardarSaldo, partida } from './soporte/apertura-por-api.js';
import { type CuentaDePrueba } from './soporte/escenarios.js';
import { crearCuentaSinSaldo } from './soporte/escenarios-de-apertura.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  auditoriaDe,
  desgloseDe,
  MODULOS_CON_CUENTAS_POR_PAGAR,
  movimientoDe,
  operadorDeLaCuenta,
} from './soporte/ordenes-de-bancos.js';
import {
  cuentaConPosfechado,
  nuevoOrigen,
  ordenesDeChequeDeApertura,
  pago,
} from './soporte/ordenes-de-cheque-de-apertura.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let operador: Operador;
const usuario = () => cuenta.propietario;

const origen = nuevoOrigen;
const { ligar, desligar } = ordenesDeChequeDeApertura(() => operador);
const nuevoPosfechado = async (cambios: { monto?: string; beneficiario?: string } = {}) =>
  (await cuentaConPosfechado(usuario(), cambios)).movimientoId;

beforeAll(async () => {
  cuenta = await empresaConInicio(entorno, {
    nombre: 'Cheques de apertura ligados',
    usuario: 'propietarioligarapertura',
    modulos: MODULOS_CON_CUENTAS_POR_PAGAR,
  });
  operador = await operadorDeLaCuenta(cuenta);
});

describe('bancos.ligar_cheque_de_apertura', () => {
  it('pone el origen y el concepto, no toca monto ni fecha ni número y deja la auditoría', async () => {
    const movimientoId = await nuevoPosfechado();
    const antes = await movimientoDe(usuario(), movimientoId);
    const pedido = origen();

    const respuesta = await ligar({ movimientoId, origen: pedido });

    expect(respuesta).toMatchObject({
      numeroDeCheque: antes.numeroDeCheque,
      fecha: '2026-02-10',
      cuentaBancariaId: antes.cuentaBancariaId,
      avisos: [],
    });
    const despues = await movimientoDe(usuario(), movimientoId);
    expect(despues).toMatchObject({
      moduloDeOrigen: 'cuentas-por-pagar',
      documentoDeOrigenId: pedido.documentoId,
      conceptoNombre: 'Pago a proveedores',
      monto: antes.monto,
      fecha: antes.fecha,
      numeroDeCheque: antes.numeroDeCheque,
      parteDeApertura: 'cheque_posfechado',
      desglose: [],
      puedeEliminar: false,
      puedeReclasificar: false,
    });
    const rastro = await auditoriaDe(movimientoId);
    expect(rastro).toEqual([
      {
        accion: 'corregir',
        recurso: 'bancos.cheques',
        motivo: `Ligado al pago ${pedido.documentoId} de Cuentas por pagar`,
      },
    ]);
  });

  it('con dos conceptos deja el de mayor monto y guarda el reparto', async () => {
    const movimientoId = await nuevoPosfechado();

    await ligar({
      movimientoId,
      conceptos: [
        { claveDeSistema: 'pago_a_proveedor', montoCentavos: 3000 },
        { claveDeSistema: 'pago_a_proveedor_de_activo', montoCentavos: 7000 },
      ],
    });

    expect((await movimientoDe(usuario(), movimientoId)).conceptoNombre).toBe('Pago a proveedores de activo fijo');
    expect(await desgloseDe(movimientoId)).toEqual([
      { clave: 'pago_a_proveedor', monto: '30.00' },
      { clave: 'pago_a_proveedor_de_activo', monto: '70.00' },
    ]);
  });

  it('un movimiento que no es posfechado de apertura no se liga', async () => {
    const cuentaId = await crearCuentaSinSaldo(usuario());
    await guardarSaldo(usuario(), cuentaId, '1000.00');
    const enCirculacion = await agregarPartida(usuario(), cuentaId, partida('cheque_en_circulacion'));

    await expect(ligar({ movimientoId: enCirculacion.cuerpo.partida.movimientoId })).rejects.toMatchObject({
      codigo: 'cheque_de_apertura_no_ligable',
    });
  });

  it('uno que ya tiene origen no se liga otra vez, ni el mismo documento', async () => {
    const movimientoId = await nuevoPosfechado();
    const pedido = origen();
    await ligar({ movimientoId, origen: pedido });

    await expect(ligar({ movimientoId })).rejects.toMatchObject({ codigo: 'cheque_de_apertura_no_ligable' });
    await expect(ligar({ movimientoId, origen: pedido })).rejects.toMatchObject({
      codigo: 'cheque_de_apertura_no_ligable',
    });
  });

  it('uno anulado no se liga', async () => {
    const movimientoId = await nuevoPosfechado();
    const chequeId = await chequeDeLaPartida(movimientoId);
    const anulado = await usuario().post(`/api/bancos/cheques/${chequeId}/anular`, { motivo: 'Error' });
    expect(anulado.estado).toBe(200);

    await expect(ligar({ movimientoId })).rejects.toMatchObject({ codigo: 'cheque_de_apertura_no_ligable' });
  });

  it('un monto distinto del cheque se rechaza y nada cambia', async () => {
    const movimientoId = await nuevoPosfechado();

    await expect(ligar({ movimientoId, montoCentavos: 9999, conceptos: pago(9999) })).rejects.toMatchObject({
      codigo: 'monto_distinto_del_cheque',
    });
    expect((await movimientoDe(usuario(), movimientoId)).moduloDeOrigen).toBeNull();
    expect(await auditoriaDe(movimientoId)).toEqual([]);
  });

  it('un reparto que no suma el monto se rechaza y nada cambia', async () => {
    const movimientoId = await nuevoPosfechado();

    await expect(ligar({ movimientoId, conceptos: pago(9999) })).rejects.toMatchObject({
      codigo: 'desglose_no_suma',
    });
    expect((await movimientoDe(usuario(), movimientoId)).moduloDeOrigen).toBeNull();
  });

  it('un beneficiario distinto del proveedor liga con aviso; con el mismo nombre, sin aviso', async () => {
    const distinto = await nuevoPosfechado({ beneficiario: 'Otra Persona' });
    const parecido = await nuevoPosfechado({ beneficiario: 'PROVEEDOR  UNO, S.A.' });

    const conAviso = await ligar({ movimientoId: distinto });
    const sinAviso = await ligar({ movimientoId: parecido, beneficiarioEsperado: 'Proveedor Uno' });

    expect(conAviso.avisos).toEqual([expect.objectContaining({ codigo: 'beneficiario_distinto' })]);
    expect(sinAviso.avisos).toEqual([]);
  });

  it('después de ligado no se corrige, elimina ni blanquea en Bancos', async () => {
    const { cuentaId, movimientoId } = await cuentaConPosfechado(usuario());
    await ligar({ movimientoId });
    const ruta = `/api/bancos/saldos-iniciales/${cuentaId}/partidas/${movimientoId}`;

    const corregido = await usuario().put(ruta, partida('cheque_posfechado', { monto: '90.00', numeroDeCheque: 9999 }));
    const eliminado = await usuario().delete(ruta);
    const blanqueado = await usuario().post(`/api/bancos/cheques/${await chequeDeLaPartida(movimientoId)}/blanquear`, {
      motivo: 'Error',
    });

    expect(corregido.estado).toBeGreaterThanOrEqual(400);
    expect(eliminado.estado).toBeGreaterThanOrEqual(400);
    expect(blanqueado.estado).toBeGreaterThanOrEqual(400);
    expect((await movimientoDe(usuario(), movimientoId)).moduloDeOrigen).toBe('cuentas-por-pagar');
  });
});

describe('bancos.desligar_cheque_de_apertura', () => {
  it('quita el origen y el reparto, lo deja sin clasificar, audita con el motivo y se puede ligar otra vez', async () => {
    const movimientoId = await nuevoPosfechado();
    const pedido = origen();
    await ligar({
      movimientoId,
      origen: pedido,
      conceptos: [
        { claveDeSistema: 'pago_a_proveedor', montoCentavos: 3000 },
        { claveDeSistema: 'pago_a_proveedor_de_activo', montoCentavos: 7000 },
      ],
    });

    const respuesta = await desligar(movimientoId, { origen: pedido });

    expect(respuesta.conceptoId).toEqual(expect.any(String));
    const despues = await movimientoDe(usuario(), movimientoId);
    expect(despues).toMatchObject({
      moduloDeOrigen: null,
      documentoDeOrigenId: null,
      conceptoId: respuesta.conceptoId,
      conceptoNombre: 'Sin clasificar',
      parteDeApertura: 'cheque_posfechado',
      desglose: [],
    });
    expect(await desgloseDe(movimientoId)).toEqual([]);
    const rastro = await auditoriaDe(movimientoId);
    expect(rastro).toHaveLength(2);
    expect(rastro[1]).toMatchObject({
      accion: 'corregir',
      recurso: 'bancos.cheques',
      motivo: expect.stringContaining('Se ligó a la factura equivocada'),
    });
    await expect(ligar({ movimientoId })).resolves.toMatchObject({ avisos: [] });
  });

  it('desligar un cheque ligado a otro documento, o suelto, se rechaza y no cambia nada', async () => {
    const ligado = await nuevoPosfechado();
    const suelto = await nuevoPosfechado();
    await ligar({ movimientoId: ligado });

    await expect(desligar(ligado, { origen: origen() })).rejects.toMatchObject({
      codigo: 'origen_del_movimiento_no_coincide',
    });
    await expect(desligar(suelto, { origen: origen() })).rejects.toMatchObject({
      codigo: 'origen_del_movimiento_no_coincide',
    });
    expect((await movimientoDe(usuario(), ligado)).moduloDeOrigen).toBe('cuentas-por-pagar');
    expect(await auditoriaDe(ligado)).toHaveLength(1);
  });

  it('sin motivo se rechaza', async () => {
    const movimientoId = await nuevoPosfechado();
    const pedido = origen();
    await ligar({ movimientoId, origen: pedido });

    await expect(desligar(movimientoId, { origen: pedido, motivo: '   ' })).rejects.toBeInstanceOf(Error);
    expect((await movimientoDe(usuario(), movimientoId)).moduloDeOrigen).toBe('cuentas-por-pagar');
  });
});
