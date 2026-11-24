/**
 * Pagar saldos iniciales con el cheque posfechado de la carga inicial que ya está en Bancos (AP-3, diseño CP-AP §2.3): la
 * fecha y el monto son los del cheque, queda comprometido hasta su fecha y pagado en ella, el cheque pasa a ser del pago
 * (concepto y reparto), sirve con la carga cerrada y rechaza lo que no es un saldo inicial, otro proveedor, lo sin
 * autorizar y un cheque ya ligado. Cuenta para la bancarización en el mes del cheque y publica `pago_registrado`.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { busEventos } from '../modulos/core/eventos/bus-eventos.js';
import type { ClienteApi } from './soporte/cliente-api.js';
import {
  fichaDelCargo,
  INICIO,
  ligarCheque,
  movimientoEnBase,
  posfechado,
  saldoEnContrasena,
} from './soporte/cuentas-por-pagar-cheques-de-apertura.js';
import { EscenarioDePagos, RUTA_DE_PAGOS } from './soporte/cuentas-por-pagar-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { consultar, haceDias, HOY } from './soporte/escenario-de-documentos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';
import { desgloseDe } from './soporte/ordenes-de-bancos.js';

const entorno = usarEntornoApi();
let e: EscenarioDePagos;
let sinPermiso: ClienteApi;
const eventos: Array<Record<string, any>> = [];

beforeAll(async () => {
  e = await EscenarioDePagos.preparar(entorno, 'cxpchequeapertura');
  const fijada = await e
    .propietario()
    .put(`/api/empresas/${e.mundo.escenario.cuenta.empresaId}/carga-inicial`, { fechaDeInicio: INICIO });
  expect(fijada.estado, JSON.stringify(fijada.cuerpo)).toBe(200);
  busEventos.suscribir('cuentas-por-pagar.pago_registrado', async (datos) => {
    eventos.push(datos as unknown as Record<string, any>);
  });
  sinPermiso = await crearUsuarioConPermisos(entorno, e.mundo.escenario.cuenta, {
    nombres: 'Solo emite',
    apellidos: 'Cheque de apertura',
    permisos: ['cuentas-por-pagar.pagos.ver', 'cuentas-por-pagar.pagos.emitir'],
  });
});

afterAll(() => {
  eventos.length = 0;
});

/** El nombre del proveedor en Terceros: con el que Bancos compara el beneficiario del cheque. */
async function nombreDe(proveedorId: string): Promise<string> {
  const [fila] = await consultar<{ nombre: string }>(
    `select t.nombre_mostrar as nombre from terceros.proveedores p join terceros.terceros t on t.id = p.tercero_id
      where p.id = $1`,
    [proveedorId],
  );
  return fila!.nombre;
}

/** Un proveedor con un saldo inicial de Q700.00 en su contraseña y un cheque posfechado de Q600.00 a su nombre. */
async function escenario(fecha = haceDias(-10), beneficiario?: string) {
  const proveedor = await e.mundo.unProveedor();
  const cargoId = await saldoEnContrasena(e, proveedor);
  const cheque = await posfechado(e, {
    monto: '600.00',
    fecha,
    beneficiario: beneficiario ?? (await nombreDe(proveedor.proveedorId)),
  });
  return { proveedor, cargoId, movimientoId: cheque.movimientoId, cuentaId: cheque.cuentaId };
}

describe('pagar con el cheque de apertura', () => {
  it('toma la fecha y el monto del cheque, lo compromete hasta su fecha y lo hace del pago', async () => {
    const { proveedor, cargoId, movimientoId } = await escenario();

    const respuesta = await ligarCheque(e, { proveedor, movimientoId, cargoId, monto: '600.00' });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(respuesta.cuerpo).toMatchObject({
      forma: 'cheque_de_apertura',
      fecha: haceDias(-10),
      monto: '600.00',
      posfechado: true,
      estado: 'vigente',
      movimiento: { id: movimientoId },
    });
    expect(respuesta.cuerpo.aplicaciones[0]).toMatchObject({ retencionDescontada: '0.00', monto: '600.00' });
    expect(respuesta.cuerpo.avisos.some((a: string) => a.includes('lleva fecha'))).toBe(true);
    expect(await movimientoEnBase(movimientoId)).toMatchObject({
      modulo_de_origen: 'cuentas-por-pagar',
      documento_de_origen_id: respuesta.cuerpo.id,
      concepto: 'pago_a_proveedor',
    });
    // Todo el cheque va a un solo concepto, el del movimiento: no hay reparto que guardar.
    expect(await desgloseDe(movimientoId)).toEqual([]);
    expect(await fichaDelCargo(e, cargoId)).toMatchObject({
      saldo: '700.00',
      comprometido: '600.00',
      disponible: '100.00',
      pagado: '0.00',
      estadoDePago: 'comprometido_en_parte',
      comprometidoHasta: haceDias(-10),
    });
  });

  it('con un cheque de fecha ya cumplida el documento queda pagado en esa fecha', async () => {
    const { proveedor, cargoId, movimientoId } = await escenario(haceDias(5));

    const respuesta = await ligarCheque(e, { proveedor, movimientoId, cargoId, monto: '600.00' });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(respuesta.cuerpo).toMatchObject({ fecha: haceDias(5), posfechado: false });
    expect(await fichaDelCargo(e, cargoId)).toMatchObject({
      saldo: '100.00',
      pagado: '600.00',
      comprometido: '0.00',
      estadoDePago: 'en_parte',
    });
  });

  it('publica pago_registrado con la forma, el efecto banco y la fecha del cheque', async () => {
    const { proveedor, cargoId, movimientoId, cuentaId } = await escenario();

    const respuesta = await ligarCheque(e, { proveedor, movimientoId, cargoId, monto: '600.00' });

    expect(eventos.find(({ pagoId }) => pagoId === respuesta.cuerpo.id)).toMatchObject({
      forma: 'cheque_de_apertura',
      efecto: 'banco',
      fecha: haceDias(-10),
      posfechado: true,
      montoCentavos: 60000,
      movimientoId,
      cuentaBancariaId: cuentaId,
    });
  });

  it('un beneficiario distinto del proveedor solo avisa', async () => {
    const { proveedor, cargoId, movimientoId } = await escenario(haceDias(-10), 'Otra Persona Individual');

    const respuesta = await ligarCheque(e, { proveedor, movimientoId, cargoId, monto: '600.00' });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(respuesta.cuerpo.avisos.some((a: string) => a.includes('Otra Persona Individual'))).toBe(true);
  });
});

describe('lo que rechaza', () => {
  it('solo cubre saldos iniciales, no documentos del libro', async () => {
    const { movimientoId } = await escenario();
    const delLibro = await e.proveedorConCargo('600.00');

    const respuesta = await ligarCheque(e, { ...delLibro, movimientoId, cargoId: delLibro.cargo, monto: '600.00' });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('solo_saldos_iniciales');
    expect((await movimientoEnBase(movimientoId)).modulo_de_origen).toBeNull();
  });

  it('un cargo de otro proveedor no se paga con este cheque', async () => {
    const { proveedor, movimientoId } = await escenario();
    const otro = await e.mundo.unProveedor();
    const ajeno = await saldoEnContrasena(e, otro);

    const respuesta = await ligarCheque(e, { proveedor, movimientoId, cargoId: ajeno, monto: '600.00' });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(400);
    expect(respuesta.cuerpo.error.codigo).toBe('cargo_no_disponible');
    expect((await movimientoEnBase(movimientoId)).modulo_de_origen).toBeNull();
  });

  it('un cargo sin autorizar no se paga', async () => {
    const { proveedor, movimientoId } = await escenario();
    const creado = await e.propietario().post('/api/cuentas-por-pagar/saldos-iniciales', {
      proveedorId: proveedor.proveedorId,
      tipo: 'factura',
      serie: 'B',
      numero: `SA-${Math.random().toString(36).slice(2, 7)}`,
      fechaEmision: haceDias(90),
      vencimiento: haceDias(50),
      total: '600.00',
      retenciones: '0.00',
      retencionesPorPracticar: '0.00',
      saldoPendiente: '600.00',
      tieneActivoFijo: false,
    });
    expect(creado.estado, JSON.stringify(creado.cuerpo)).toBe(201);

    const respuesta = await ligarCheque(e, { proveedor, movimientoId, cargoId: creado.cuerpo.id, monto: '600.00' });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBeGreaterThanOrEqual(400);
    expect((await movimientoEnBase(movimientoId)).modulo_de_origen).toBeNull();
  });

  it('el monto debe ser el del cheque y nada queda guardado', async () => {
    const { proveedor, cargoId, movimientoId } = await escenario();

    const respuesta = await ligarCheque(e, { proveedor, movimientoId, cargoId, monto: '500.00' });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('monto_distinto_del_cheque');
    expect((await movimientoEnBase(movimientoId)).modulo_de_origen).toBeNull();
    expect((await fichaDelCargo(e, cargoId)).saldo).toBe('700.00');
  });

  it('un cheque ya ligado a un pago vigente no se liga otra vez', async () => {
    const { proveedor, cargoId, movimientoId } = await escenario();
    const otro = await saldoEnContrasena(e, proveedor);
    expect((await ligarCheque(e, { proveedor, movimientoId, cargoId, monto: '600.00' })).estado).toBe(201);

    const repetido = await ligarCheque(e, { proveedor, movimientoId, cargoId: otro, monto: '600.00' });

    expect(repetido.estado, JSON.stringify(repetido.cuerpo)).toBe(422);
    expect(repetido.cuerpo.error.codigo).toBe('cheque_de_apertura_no_ligable');
  });

  it('no admite diferencias ni referencia, y exige su permiso', async () => {
    const { proveedor, cargoId, movimientoId } = await escenario();

    const sinCheque = await ligarCheque(
      e,
      { proveedor, movimientoId, cargoId, monto: '600.00' },
      { movimientoId: 'x' },
    );
    const noPermitido = await sinPermiso.post(`${RUTA_DE_PAGOS}/cheque-de-apertura`, {
      forma: 'cheque_de_apertura',
      movimientoId,
      proveedorId: proveedor.proveedorId,
      aplicaciones: [{ cargoId, monto: '600.00' }],
    });

    expect(sinCheque.estado).toBe(400);
    expect(noPermitido.estado).toBe(403);
    expect((await movimientoEnBase(movimientoId)).modulo_de_origen).toBeNull();
  });
});

describe('la bancarización', () => {
  it('cuenta en el mes del cheque, no en el de hoy', async () => {
    const fecha = haceDias(-40);
    const { proveedor, cargoId, movimientoId } = await escenario(fecha);
    const antes = await e.propietario().get(`/api/cuentas-por-pagar/proveedores/${proveedor.proveedorId}/saldo`);
    expect(antes.estado).toBe(200);

    const respuesta = await ligarCheque(e, { proveedor, movimientoId, cargoId, monto: '600.00' });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    const [pago] = await consultar<{ fecha: string }>('select fecha::text from cuentas_por_pagar.pagos where id = $1', [
      respuesta.cuerpo.id,
    ]);
    expect(pago!.fecha).toBe(fecha);
    expect(fecha.slice(0, 7)).not.toBe(HOY.slice(0, 7));
    const delMes = await consultar<{ n: string }>(
      `select count(*)::text as n from cuentas_por_pagar.pagos
        where proveedor_id = $1 and forma = 'cheque_de_apertura' and date_trunc('month', fecha) = date_trunc('month', $2::date)`,
      [proveedor.proveedorId, fecha],
    );
    expect(delMes[0]!.n).toBe('1');
  });
});

/** Al final: cerrar la carga inicial es definitivo para el resto de las pruebas de esta empresa. */
describe('con la carga inicial cerrada', () => {
  it('sirve igual: no cambia ningún saldo al corte', async () => {
    const { proveedor, cargoId, movimientoId } = await escenario();
    const ruta = `/api/empresas/${e.mundo.escenario.cuenta.empresaId}/carga-inicial`;
    const cierre = await e.propietario().post(`${ruta}/cerrar`, {
      motivo: 'Sin el dato de los libros anteriores',
    });
    expect(cierre.estado, JSON.stringify(cierre.cuerpo)).toBe(200);

    const respuesta = await ligarCheque(e, { proveedor, movimientoId, cargoId, monto: '600.00' });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(respuesta.cuerpo.fecha).toBe(haceDias(-10));
  });
});
