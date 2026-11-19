/** IC-6: pasar el pago a otro formulario (inutilizado) y anular como extraviado. */
import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { EscenarioDePagos } from './soporte/cuentas-por-pagar-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { EscenarioDeCheques } from './soporte/escenario-de-impresion-de-cheques.js';
import { crearCuentaBancaria } from './soporte/escenarios-de-bancos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';
import { auditoriaDe, movimientoDe } from './soporte/ordenes-de-bancos.js';

const entorno = usarEntornoApi();
let e: EscenarioDeCheques;

const cambio = (chequeId: string, chequeDestinoId: string, cambios: Record<string, unknown> = {}) => ({
  chequeId,
  cuerpo: {
    chequeDestinoId,
    motivo: 'Se arrugó en la impresora',
    enCustodia: true,
    papelConservado: true,
    ...cambios,
  },
});
const pasar = (chequeId: string, destinoId: string, cambios: Record<string, unknown> = {}) => {
  const { cuerpo } = cambio(chequeId, destinoId, cambios);
  return e.propietario.post(`/api/bancos/cheques/${chequeId}/cambiar-formulario`, cuerpo);
};
const imprimir = (usuario: ClienteApi, ids: string[]) => usuario.post('/api/bancos/cheques/impresiones', { ids });
const movimientoDeCheque = async (chequeId: string) =>
  (
    await comoPropietario<{ movimiento_id: string | null }>('select movimiento_id from bancos.cheques where id = $1', [
      chequeId,
    ])
  )[0]!.movimiento_id;

beforeAll(async () => {
  e = await EscenarioDeCheques.preparar(entorno, 'iccambio');
  await e.propietario.patch(`/api/bancos/chequeras/${e.chequeraId}/formato`, {
    formatoDeChequeId: null,
    plantillaDeCheque: 'cheque_suelto',
  });
});

describe('pasar a otro formulario', () => {
  it('el movimiento pasa al cheque nuevo con sus condiciones y el viejo queda inutilizado, con auditoría', async () => {
    const { chequeId, movimientoId } = await e.emitir(1, { paraAbonoEnCuenta: true, noNegociable: false });
    await imprimir(e.propietario, [chequeId]);
    const destino = await e.chequeDe(2);

    const respuesta = await pasar(chequeId, destino);

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo.inutilizado).toMatchObject({
      estado: 'anulado',
      causaDeAnulacion: 'inutilizado',
      movimientoId: null,
      aviso: null,
    });
    expect(respuesta.cuerpo.destino).toMatchObject({
      numero: 2,
      estado: 'emitido',
      movimientoId,
      noNegociable: false,
      paraAbonoEnCuenta: true,
      impresoEn: null,
    });
    expect(respuesta.cuerpo.avisos).toEqual([]);
    expect(await movimientoDeCheque(chequeId)).toBeNull();
    expect(await movimientoDeCheque(destino)).toBe(movimientoId);
    const movimiento = await movimientoDe(e.propietario, movimientoId);
    expect(movimiento).toMatchObject({ numeroDeCheque: 2, referencia: 'Cheque 2', paraAbonoEnCuenta: true });
    const [auditoria] = (await auditoriaDe(chequeId)).filter((a) => a.accion === 'inutilizar');
    expect(auditoria).toMatchObject({ recurso: 'bancos.cheques', motivo: 'Se arrugó en la impresora' });
    const historial = await e.propietario.get(`/api/bancos/cheques/${chequeId}/impresiones`);
    expect(historial.cuerpo).toHaveLength(1);
    const lista = await e.propietario.get('/api/bancos/cheques');
    const causas = lista.cuerpo.map((c: { numero: number; causaDeAnulacion: string | null }) => [
      c.numero,
      c.causaDeAnulacion,
    ]);
    expect(causas).toContainEqual([1, 'inutilizado']);
  });

  it('sin las dos confirmaciones no cambia nada; con el papel fuera de la empresa es extraviado', async () => {
    const { chequeId } = await e.emitir(3);
    await imprimir(e.propietario, [chequeId]);
    const destino = await e.chequeDe(4);

    const sinCustodia = await pasar(chequeId, destino, { enCustodia: false });
    const sinPapel = await pasar(chequeId, destino, { papelConservado: false });

    expect([sinCustodia.estado, sinPapel.estado]).toEqual([422, 422]);
    expect(sinCustodia.cuerpo.error.codigo).toBe('confirmacion_de_custodia_faltante');
    expect(await movimientoDeCheque(chequeId)).not.toBeNull();
    expect(await movimientoDeCheque(destino)).toBeNull();
  });

  it('el cheque debe estar impreso y el destino ser disponible, de la misma cuenta bancaria', async () => {
    const sinImprimir = (await e.emitir(5)).chequeId;
    const impreso = (await e.emitir(6)).chequeId;
    await imprimir(e.propietario, [impreso]);
    const ocupado = (await e.emitir(7)).chequeId;
    const otraCuenta = await crearCuentaBancaria(e.propietario, 'Otra cuenta del cambio');
    const chequeraAjena = (
      await e.propietario.post(`/api/bancos/cuentas-bancarias/${otraCuenta}/chequeras`, {
        serie: 'X',
        desde: 1,
        hasta: 5,
      })
    ).cuerpo.id as string;
    const deOtraCuenta = await e.chequeDe(1, chequeraAjena);

    const noImpreso = await pasar(sinImprimir, await e.chequeDe(8));
    const destinoOcupado = await pasar(impreso, ocupado);
    const cuentaDistinta = await pasar(impreso, deOtraCuenta);

    expect(noImpreso.estado).toBe(422);
    expect(noImpreso.cuerpo.error.codigo).toBe('cheque_no_se_pasa_de_formulario');
    expect(destinoOcupado.estado).toBe(422);
    expect(destinoOcupado.cuerpo.error.codigo).toBe('cheque_no_disponible');
    expect(cuentaDistinta.estado).toBe(422);
    expect(cuentaDistinta.cuerpo.error.codigo).toBe('cheque_no_se_pasa_de_formulario');
  });

  it('un movimiento marcado en una conciliación no se pasa', async () => {
    const { chequeId, movimientoId } = await e.emitir(9);
    await imprimir(e.propietario, [chequeId]);
    const [conciliacion] = await comoPropietario<{ id: string }>(
      `insert into bancos.conciliaciones (empresa_id, cuenta_bancaria_id, anio, mes, estado)
       values ($1, $2, 2026, 2, 'en_proceso') returning id`,
      [e.cuenta.empresaId, e.cuentaBancariaId],
    );
    await comoPropietario('update bancos.movimientos set conciliacion_id = $1 where id = $2', [
      conciliacion!.id,
      movimientoId,
    ]);

    const respuesta = await pasar(chequeId, await e.chequeDe(10));

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('movimiento_marcado_en_conciliacion');
  });

  it('exige el permiso de anular', async () => {
    const { chequeId } = await e.emitir(11);
    await imprimir(e.propietario, [chequeId]);
    const sin = await crearUsuarioConPermisos(entorno, e.cuenta, { nombres: 'Sin', apellidos: 'Cambio', permisos: [] });

    const { cuerpo } = cambio(chequeId, await e.chequeDe(12));
    const respuesta = await sin.post(`/api/bancos/cheques/${chequeId}/cambiar-formulario`, cuerpo);

    expect(respuesta.estado).toBe(403);
  });
});

describe('anular por la ruta de anular', () => {
  it('como extraviado anula el cheque con el aviso al banco; inutilizado y caducidad no se pueden pedir', async () => {
    const { chequeId } = await e.emitir(13);
    const url = `/api/bancos/cheques/${chequeId}/anular`;

    const invalida = await e.propietario.post(url, { motivo: 'Prueba', causa: 'inutilizado' });
    const caducidad = await e.propietario.post(url, { motivo: 'Prueba', causa: 'caducidad' });
    const extraviado = await e.propietario.post(url, { motivo: 'Se perdió en el camino', causa: 'extraviado' });

    expect([invalida.estado, caducidad.estado]).toEqual([400, 400]);
    expect(extraviado.estado, JSON.stringify(extraviado.cuerpo)).toBe(200);
    expect(extraviado.cuerpo).toMatchObject({ estado: 'anulado', causaDeAnulacion: 'extraviado' });
    expect(extraviado.cuerpo.aviso).toContain('Avise al banco por escrito para que no pague el cheque 13');
    const lista = await e.propietario.get('/api/bancos/cheques?estado=anulado');
    expect(lista.cuerpo.find((c: { id: string }) => c.id === chequeId).aviso).toContain('cheque 13');
  });

  it('un cheque disponible no se anula como extraviado, y sin causa sigue siendo manual', async () => {
    const disponible = await e.chequeDe(40);
    const { chequeId } = await e.emitir(14);

    const extraviado = await e.propietario.post(`/api/bancos/cheques/${disponible}/anular`, {
      motivo: 'Prueba',
      causa: 'extraviado',
    });
    const manual = await e.propietario.post(`/api/bancos/cheques/${chequeId}/anular`, { motivo: 'Error de captura' });

    expect(extraviado.estado).toBe(422);
    expect(manual.cuerpo).toMatchObject({ causaDeAnulacion: 'manual', aviso: null });
  });
});

describe('un cheque de Cuentas por pagar', () => {
  it('al pasarlo a otro formulario el pago sigue igual, muestra el número nuevo y avisa de reimprimir el comprobante', async () => {
    const pagos = await EscenarioDePagos.preparar(entorno, 'iccambiocxp');
    await pagos.propietario().patch(`/api/bancos/chequeras/${pagos.chequeraId}/formato`, {
      formatoDeChequeId: null,
      plantillaDeCheque: 'cheque_suelto',
    });
    const { proveedor, cargo } = await pagos.proveedorConCargo();
    const pago = (
      await pagos.pagar(
        pagos.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '500.00' }], { paraAbonoEnCuenta: true }),
      )
    ).cuerpo;
    const movimiento = await movimientoDe(pagos.propietario(), pago.movimiento.id);
    const numeroViejo = movimiento.numeroDeCheque as number;
    await imprimir(pagos.propietario(), [movimiento.chequeId]);
    const chequera = await pagos.propietario().get(`/api/bancos/chequeras/${pagos.chequeraId}/cheques`);
    const destino = chequera.cuerpo.find((c: { numero: number }) => c.numero === numeroViejo + 1);

    const respuesta = await pagos
      .propietario()
      .post(`/api/bancos/cheques/${movimiento.chequeId}/cambiar-formulario`, cambio('', destino.id).cuerpo);

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo.avisos).toEqual([
      `Si ya entregó el comprobante de pago con el cheque ${numeroViejo}, reimprímalo: ahora es el cheque ${numeroViejo + 1}.`,
    ]);
    const ficha = (await pagos.propietario().get(`/api/cuentas-por-pagar/pagos/${pago.id}`)).cuerpo;
    expect(ficha).toMatchObject({ estado: 'vigente', monto: '500.00' });
    expect(ficha.movimiento).toMatchObject({ id: pago.movimiento.id, numero: numeroViejo + 1 });
    expect(await movimientoDe(pagos.propietario(), pago.movimiento.id)).toMatchObject({ paraAbonoEnCuenta: true });
  });

  it('como extraviado sí anula el pago', async () => {
    const pagos = await EscenarioDePagos.preparar(entorno, 'iccambioextra');
    const { proveedor, cargo } = await pagos.proveedorConCargo();
    const pago = (await pagos.pagar(pagos.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '300.00' }]))).cuerpo;
    const movimiento = await movimientoDe(pagos.propietario(), pago.movimiento.id);

    const respuesta = await pagos.propietario().post(`/api/bancos/cheques/${movimiento.chequeId}/anular`, {
      motivo: 'Se perdió con el mensajero',
      causa: 'extraviado',
    });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo.causaDeAnulacion).toBe('extraviado');
    const ficha = (await pagos.propietario().get(`/api/cuentas-por-pagar/pagos/${pago.id}`)).cuerpo;
    expect(ficha.estado).toBe('anulado');
  });
});
