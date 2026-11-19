/**
 * Cambiar un fondo de Caja chica (CC-2): aumentar con cheque o nota, disminuir con el depósito del custodio (contra el
 * efectivo esperado), editar (con la auditoría del tope), cambiar el custodio y anular una apertura sin uso.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import {
  cambiosEnBase,
  conAccesoAlFondo,
  EscenarioDeCajaChica,
  fondoEnBase,
  movimientoDeBancos,
  RUTA_DE_FONDOS,
  sembrarVale,
} from './soporte/caja-chica-fondos.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { saldoDe } from './soporte/escenarios-de-bancos.js';
import { auditoriaDe } from './soporte/ordenes-de-bancos.js';

const entorno = usarEntornoApi();
let e: EscenarioDeCajaChica;

beforeAll(async () => {
  e = await EscenarioDeCajaChica.preparar(entorno, 'cajachicacambios');
});

const post = (fondoId: string, accion: string, cuerpo: Record<string, unknown>) =>
  e.propietario().post(`${RUTA_DE_FONDOS}/${fondoId}/${accion}`, cuerpo);

const aumentoConCheque = (monto: string) => ({ forma: 'cheque', chequeraId: e.chequeraId, monto });

describe('aumentar', () => {
  it('con cheque o con nota suma al monto, con el concepto de sistema, sin auditoría', async () => {
    const fondo = await e.abrir(e.conCheque('Caja que crece', { monto: '1000.00' }));

    const conCheque = await post(fondo.id, 'aumentar', aumentoConCheque('200.00'));
    const conNota = await post(fondo.id, 'aumentar', {
      forma: 'nota_de_debito',
      cuentaBancariaId: e.cuentaBancariaId,
      monto: '300.00',
      referencia: 'BOL-9',
    });

    expect(conCheque.estado, JSON.stringify(conCheque.cuerpo)).toBe(200);
    expect(conNota.cuerpo.monto).toBe('1500.00');
    const cambios = await cambiosEnBase(fondo.id);
    expect(cambios.map((c) => [c.tipo, c.forma, c.monto])).toEqual([
      ['apertura', 'cheque', '1000.00'],
      ['aumento', 'cheque', '200.00'],
      ['aumento', 'nota_de_debito', '300.00'],
    ]);
    expect((await movimientoDeBancos(cambios[1]!.movimiento_id!)).concepto).toBe('fondo_de_caja_chica');
    expect(await auditoriaDe(fondo.id)).toEqual([]);
  });

  it('un monto en cero o un fondo inexistente se rechaza', async () => {
    const fondo = await e.abrir(e.conCheque('Caja sin aumento'));

    const enCero = await post(fondo.id, 'aumentar', aumentoConCheque('0.00'));
    const inexistente = await post(crypto.randomUUID(), 'aumentar', aumentoConCheque('5.00'));

    expect(enCero.cuerpo.error.codigo).toBe('monto_del_fondo_invalido');
    expect(inexistente.estado).toBe(404);
  });
});

describe('disminuir', () => {
  it('el custodio deposita: nota de crédito con el concepto, el monto baja, el saldo sube y se audita «ajustar»', async () => {
    const fondo = await e.abrir(e.conCheque('Caja que baja', { monto: '1000.00' }));
    const saldoAntes = Number(await saldoDe(e.propietario(), e.cuentaBancariaId));

    const respuesta = await post(fondo.id, 'disminuir', { monto: '400.00', referencia: 'DEP-1' });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo).toMatchObject({ monto: '600.00', efectivoEsperado: '600.00' });
    const cambios = await cambiosEnBase(fondo.id);
    expect(cambios[1]).toMatchObject({ tipo: 'disminucion', forma: 'nota_de_credito', monto: '400.00' });
    expect(await movimientoDeBancos(cambios[1]!.movimiento_id!)).toMatchObject({
      tipo: 'credito',
      concepto: 'devolucion_de_fondo_de_caja_chica',
      origen: fondo.id,
    });
    expect(Number(await saldoDe(e.propietario(), e.cuentaBancariaId)) - saldoAntes).toBe(400);
    expect(await auditoriaDe(fondo.id)).toEqual([{ accion: 'ajustar', motivo: null, recurso: 'caja-chica.fondos' }]);
  });

  it('no deja devolver más que el efectivo esperado ni dejar el fondo en cero', async () => {
    const fondo = await e.abrir(e.conCheque('Caja con vale', { monto: '1000.00' }));
    await sembrarVale(fondo.id, e.cuenta.empresaId, '700.00');
    const otro = await e.abrir(e.conCheque('Caja sin vales', { monto: '1000.00' }));

    const demasiado = await post(fondo.id, 'disminuir', { monto: '400.00' });
    const todo = await post(otro.id, 'disminuir', { monto: '1000.00' });

    expect(demasiado.cuerpo.error.codigo).toBe('disminucion_mayor_que_el_efectivo');
    expect(todo.cuerpo.error.codigo).toBe('disminucion_deja_el_fondo_en_cero');
    expect(await cambiosEnBase(fondo.id)).toHaveLength(1);
  });
});

describe('editar', () => {
  it('cambia el nombre sin auditar; cambiar el tope audita «corregir» con el fondo como estaba', async () => {
    const fondo = await e.abrir(e.conCheque('Caja a editar', { topePorComprobante: '100.00' }));

    const nombre = await e.propietario().patch(`${RUTA_DE_FONDOS}/${fondo.id}`, { nombre: 'Caja editada' });
    expect(nombre.estado, JSON.stringify(nombre.cuerpo)).toBe(200);
    expect(await auditoriaDe(fondo.id)).toEqual([]);
    const ruta = `${RUTA_DE_FONDOS}/${fondo.id}`;
    const tope = await e.propietario().patch(ruta, { topePorComprobante: null, motivo: 'Sube el gasto' });

    expect(tope.cuerpo).toMatchObject({ nombre: 'Caja editada', topePorComprobante: null });
    expect((await fondoEnBase(fondo.id)).tope_por_comprobante).toBeNull();
    const auditoria = await auditoriaDe(fondo.id);
    expect(auditoria).toEqual([{ accion: 'corregir', motivo: 'Sube el gasto', recurso: 'caja-chica.fondos' }]);
  });

  it('un nombre repetido se rechaza', async () => {
    const uno = await e.abrir(e.conCheque('Caja uno'));
    await e.abrir(e.conCheque('Caja dos'));

    const respuesta = await e.propietario().patch(`${RUTA_DE_FONDOS}/${uno.id}`, { nombre: 'caja DOS' });

    expect(respuesta.cuerpo.error.codigo).toBe('nombre_de_fondo_repetido');
  });
});

describe('cambiar el custodio', () => {
  it('cierra el tramo anterior, abre el nuevo, audita «corregir» y el anterior conserva su acceso', async () => {
    const [propio] = await comoPropietario<{ id: string }>('select id from core.usuarios where usuario = $1', [
      e.cuenta.usuario,
    ]);
    const fondo = await e.abrir(e.conCheque('Caja que cambia', { custodio: null, custodioUsuarioId: propio!.id }));

    const respuesta = await post(fondo.id, 'custodio', { custodio: 'María Gómez', motivo: 'Cambio de turno' });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo.custodio).toBe('María Gómez');
    expect(respuesta.cuerpo.custodios).toMatchObject([
      { custodioUsuarioId: propio!.id, motivoDelCambio: null },
      { custodio: 'María Gómez', hasta: null, motivoDelCambio: 'Cambio de turno' },
    ]);
    expect(respuesta.cuerpo.custodios[0].hasta).not.toBeNull();
    expect(await conAccesoAlFondo(fondo.id)).toEqual(['cajachicacambios']);
    const auditoria = await auditoriaDe(fondo.id);
    expect(auditoria).toEqual([{ accion: 'corregir', motivo: 'Cambio de turno', recurso: 'caja-chica.fondos' }]);
  });

  it('pide el motivo y no deja una fecha futura', async () => {
    const fondo = await e.abrir(e.conCheque('Caja con motivo'));

    const sinMotivo = await post(fondo.id, 'custodio', { custodio: 'Ana', motivo: '  ' });
    const futura = await post(fondo.id, 'custodio', { custodio: 'Ana', motivo: 'x', fecha: '2999-01-01' });

    expect(sinMotivo.estado).toBe(400);
    expect(futura.cuerpo.error.codigo).toBe('fecha_del_fondo_invalida');
  });
});

describe('anular la apertura', () => {
  it('sin uso: anula el cheque, deja el fondo cerrado con el motivo y audita «anular»', async () => {
    const saldoAntes = await saldoDe(e.propietario(), e.cuentaBancariaId);
    const fondo = await e.abrir(e.conCheque('Caja equivocada', { monto: '500.00' }));

    const respuesta = await post(fondo.id, 'anular-apertura', { motivo: 'Se abrió por error' });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo).toMatchObject({
      estado: 'cerrado',
      aperturaAnulada: true,
      monto: '0.00',
      puedeAnularApertura: false,
    });
    expect(await fondoEnBase(fondo.id)).toMatchObject({ estado: 'cerrado', motivo_de_cierre: 'Se abrió por error' });
    expect((await cambiosEnBase(fondo.id))[0]).toMatchObject({ estado: 'anulado' });
    expect(await saldoDe(e.propietario(), e.cuentaBancariaId)).toBe(saldoAntes);
    const auditoria = await auditoriaDe(fondo.id);
    expect(auditoria).toEqual([{ accion: 'anular', motivo: 'Se abrió por error', recurso: 'caja-chica.fondos' }]);
  });

  it('una nota se anula con inverso y queda la fecha contable de la anulación', async () => {
    const fondo = await e.abrir(e.conNota('Caja con nota anulada', { monto: '300.00' }));

    const respuesta = await post(fondo.id, 'anular-apertura', { motivo: 'Boleta equivocada' });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect((await cambiosEnBase(fondo.id))[0]!.fecha_de_anulacion).not.toBeNull();
  });

  it('con un vale, un aumento o ya anulada se rechaza', async () => {
    const conVale = await e.abrir(e.conCheque('Caja con uso'));
    await sembrarVale(conVale.id, e.cuenta.empresaId, '10.00');
    const conAumento = await e.abrir(e.conCheque('Caja con aumento'));
    await post(conAumento.id, 'aumentar', aumentoConCheque('50.00'));
    const anulada = await e.abrir(e.conCheque('Caja ya anulada'));
    await post(anulada.id, 'anular-apertura', { motivo: 'Una vez' });

    const conUso = await post(conVale.id, 'anular-apertura', { motivo: 'Probar' });
    const conCambios = await post(conAumento.id, 'anular-apertura', { motivo: 'Probar' });
    const otraVez = await post(anulada.id, 'anular-apertura', { motivo: 'Otra vez' });

    expect(conUso.cuerpo.error.codigo).toBe('fondo_con_movimientos');
    expect(conCambios.cuerpo.error.codigo).toBe('fondo_con_movimientos');
    expect(otraVez.cuerpo.error.codigo).toBe('apertura_ya_anulada');
    expect((await e.propietario().get(`${RUTA_DE_FONDOS}/${conVale.id}`)).cuerpo.estado).toBe('abierto');
  });

  it('un fondo cerrado no admite aumentos ni cambios de custodio', async () => {
    const fondo = await e.abrir(e.conCheque('Caja que se cierra'));
    await post(fondo.id, 'anular-apertura', { motivo: 'Cerrar' });

    const aumento = await post(fondo.id, 'aumentar', aumentoConCheque('5.00'));
    const custodio = await post(fondo.id, 'custodio', { custodio: 'Ana', motivo: 'x' });

    expect(aumento.cuerpo.error.codigo).toBe('fondo_no_disponible');
    expect(custodio.cuerpo.error.codigo).toBe('fondo_no_disponible');
  });
});
