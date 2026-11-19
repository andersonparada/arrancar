/**
 * Los gastos de los anticipos (CL-3): recibir del libro (con y sin referencia), la bandeja, asignar, el gasto sin documento,
 * quitar, los permisos de cada ruta, los avisos de baja del libro y la respuesta a la bancarización compartida.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import '../modulos/core/contratos/cuentas-por-liquidar.contratos.js';
import { busEventos } from '../modulos/core/eventos/bus-eventos.js';
import {
  auditoriaDelGasto,
  EscenarioDeGastos,
  gastoEnBase,
  RUTA_DE_CUENTAS_POR_LIQUIDAR,
} from './soporte/cuentas-por-liquidar-gastos.js';
import { RUTA_DE_ANTICIPOS } from './soporte/cuentas-por-liquidar-anticipos.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { HOY, nitValido, registrarProveedor, RUTA_DOCUMENTOS } from './soporte/escenario-de-documentos.js';

const entorno = usarEntornoApi();
let e: EscenarioDeGastos;
let anticipoId: string;

beforeAll(async () => {
  e = await EscenarioDeGastos.preparar(entorno, 'cxlgastos');
  anticipoId = await e.anticipo();
});

describe('recibir un documento del libro', () => {
  it('con la referencia del anticipo queda asignado y el anticipo lo cuenta como gastado', async () => {
    const respuesta = await e.registrar({ referenciaDeDestino: anticipoId });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    const gastoId = await e.gastoDelDocumento(respuesta.cuerpo.documento.id);
    expect(await gastoEnBase(gastoId)).toMatchObject({ anticipo_id: anticipoId, monto: '1120.00', fecha: HOY });
    const gastos = await e.gastosDe(anticipoId);
    expect(gastos.find((g) => g.id === gastoId)).toMatchObject({
      etiqueta: expect.stringMatching(/^A-/),
      clase: 'documento',
    });
    const ficha = await e.propietario().get(`${RUTA_DE_ANTICIPOS}/${anticipoId}`);
    expect(Number(ficha.cuerpo.gastado)).toBeGreaterThanOrEqual(1120);
  });

  it('sin referencia queda en la bandeja, y con una referencia mala también, con el porqué', async () => {
    const suelto = await e.enLaBandeja();
    const mala = await e.registrar({ referenciaDeDestino: crypto.randomUUID() });

    const bandeja = await e.bandeja();

    expect(mala.estado, JSON.stringify(mala.cuerpo)).toBe(201);
    expect(mala.cuerpo.avisos.join(' ')).toContain('Quedó en la bandeja de Cuentas por liquidar');
    const ids = bandeja.cuerpo.map((g: { documentoDeCompraId: string }) => g.documentoDeCompraId);
    expect(ids).toEqual(expect.arrayContaining([suelto.documentoId, mala.cuerpo.documento.id]));
  });

  it('un anticipo con otra fecha: un documento anterior a la entrega queda en la bandeja', async () => {
    const respuesta = await e.registrar({
      referenciaDeDestino: anticipoId,
      fechaEmision: '2020-01-15',
      fechaRecepcion: HOY,
    });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(respuesta.cuerpo.avisos.join(' ')).toContain('anterior a la entrega del anticipo');
    expect((await gastoEnBase(await e.gastoDelDocumento(respuesta.cuerpo.documento.id))).anticipo_id).toBeNull();
  });
});

describe('asignar y quitar', () => {
  it('asigna una tanda desde la bandeja, publica los eventos y no deja rastro de auditoría (es un alta)', async () => {
    const uno = await e.enLaBandeja();
    const dos = await e.enLaBandeja();
    const eventos: string[] = [];
    const baja = busEventos.suscribir('cuentas-por-liquidar.gasto_asignado', (datos) => {
      eventos.push(datos.gastoId);
    });

    const respuesta = await e.asignar(e.usuarios.asignador, anticipoId, [
      { gastoId: uno.gastoId },
      { gastoId: dos.gastoId, fecha: HOY },
    ]);
    baja();

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(respuesta.cuerpo.gastos).toHaveLength(2);
    expect(eventos).toEqual([uno.gastoId, dos.gastoId]);
    expect(await auditoriaDelGasto(uno.gastoId)).toEqual([]);
    const otra = await e.asignar(e.usuarios.asignador, anticipoId, [{ gastoId: uno.gastoId }]);
    expect(otra.cuerpo.error.codigo).toBe('gasto_no_disponible');
  });

  it('quitar un documento lo devuelve a la bandeja y queda auditado como estaba', async () => {
    const { gastoId } = await e.enLaBandeja();
    await e.asignar(e.usuarios.asignador, anticipoId, [{ gastoId }]);

    const respuesta = await e.quitar(e.usuarios.quitador, gastoId, 'Era de otro viaje');

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(await gastoEnBase(gastoId)).toMatchObject({ anticipo_id: null, estado: 'vigente', fecha: HOY });
    const [auditado] = await auditoriaDelGasto(gastoId);
    expect(auditado).toMatchObject({ accion: 'corregir', motivo: 'Era de otro viaje', anterior: { anticipoId } });
  });

  it('un gasto sin documento nace asignado, se quita como anulado y queda auditado', async () => {
    const creado = await e.propietario().post(`${RUTA_DE_ANTICIPOS}/${anticipoId}/gastos/sin-documento`, {
      monto: '45.50',
      descripcion: 'Taxi al aeropuerto',
      pagadoA: 'Taxista',
      conceptoDeGastoId: e.anticipos.conceptoDeGastoId,
      motivoSinDocumento: 'No quiso dar factura',
    });

    expect(creado.estado, JSON.stringify(creado.cuerpo)).toBe(201);
    expect(creado.cuerpo).toMatchObject({
      clase: 'sin_documento',
      tratamientoSinDocumento: 'no_deducible',
      monto: '45.50',
      anticipoId,
    });
    expect(creado.cuerpo.avisos[0]).toContain('no es deducible');
    const quitado = await e.quitar(e.usuarios.quitador, creado.cuerpo.id);
    expect(quitado.estado, JSON.stringify(quitado.cuerpo)).toBe(200);
    expect(await gastoEnBase(creado.cuerpo.id)).toMatchObject({ estado: 'anulado', fecha_de_anulacion: HOY });
    expect((await auditoriaDelGasto(creado.cuerpo.id)).map(({ accion }) => accion)).toEqual(['anular']);
  });

  it('el gasto sin documento valida el concepto, el monto y la fecha', async () => {
    const cuerpo = {
      monto: '10.00',
      descripcion: 'Peaje',
      pagadoA: 'Garita',
      conceptoDeGastoId: e.anticipos.conceptoDeGastoId,
      motivoSinDocumento: 'No dan factura',
    };
    const registrar = (cambios: Record<string, unknown>) =>
      e.propietario().post(`${RUTA_DE_ANTICIPOS}/${anticipoId}/gastos/sin-documento`, { ...cuerpo, ...cambios });

    const concepto = await registrar({ conceptoDeGastoId: crypto.randomUUID() });
    const cero = await registrar({ monto: '0.00' });
    const futura = await registrar({ fecha: '2999-01-01' });

    expect([concepto.cuerpo.error.codigo, cero.cuerpo.error.codigo, futura.cuerpo.error.codigo]).toEqual([
      'concepto_de_gasto_invalido',
      'monto_del_gasto_invalido',
      'fecha_del_gasto_invalida',
    ]);
  });
});

describe('permisos y empresa', () => {
  it('cada ruta pide su permiso (403) y un anticipo ajeno es 404', async () => {
    const { gastoId } = await e.enLaBandeja();
    const sinCrear = await e.asignar(e.usuarios.soloVer, anticipoId, [{ gastoId }]);
    const sinDocumentoSinPermiso = await e.usuarios.soloVer.post(
      `${RUTA_DE_ANTICIPOS}/${anticipoId}/gastos/sin-documento`,
      {
        monto: '10.00',
        descripcion: 'Peaje',
        pagadoA: 'Garita',
        conceptoDeGastoId: e.anticipos.conceptoDeGastoId,
        motivoSinDocumento: 'No dan factura',
      },
    );
    const sinQuitar = await e.quitar(e.usuarios.asignador, gastoId);
    const sinVer = await e.usuarios.quitador.get(`${RUTA_DE_CUENTAS_POR_LIQUIDAR}/bandeja`);
    const inexistente = await e.asignar(e.propietario(), crypto.randomUUID(), [{ gastoId }]);

    expect([sinCrear.estado, sinDocumentoSinPermiso.estado, sinQuitar.estado, sinVer.estado]).toEqual([
      403, 403, 403, 200,
    ]);
    expect(inexistente.estado).toBe(404);
    expect((await gastoEnBase(gastoId)).anticipo_id).toBeNull();
  });

  it('pide de 1 a 100 documentos y fechas bien escritas', async () => {
    const vacia = await e.asignar(e.propietario(), anticipoId, []);
    const mala = await e.asignar(e.propietario(), anticipoId, [{ gastoId: crypto.randomUUID(), fecha: '15/11/2026' }]);

    expect([vacia.estado, mala.estado]).toEqual([400, 400]);
  });
});

describe('avisos de baja del libro', () => {
  const eliminar = (id: string) => e.propietario().delete(`${RUTA_DOCUMENTOS}/${id}`);
  const anular = (id: string) =>
    e.propietario().post(`${RUTA_DOCUMENTOS}/${id}/anular`, { causa: 'error_de_captura', motivo: 'Duplicada' });

  it('anular en el libro un documento de la bandeja anula su gasto', async () => {
    const { documentoId, gastoId } = await e.enLaBandeja();

    const respuesta = await anular(documentoId);

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(await gastoEnBase(gastoId)).toMatchObject({ estado: 'anulado' });
    expect((await auditoriaDelGasto(gastoId)).map(({ accion }) => accion)).toEqual(['anular']);
  });

  it('eliminar en el libro un documento ya asignado borra su gasto y deja la auditoría', async () => {
    const { documentoId, gastoId } = await e.enLaBandeja();
    await e.asignar(e.usuarios.asignador, anticipoId, [{ gastoId }]);

    const respuesta = await eliminar(documentoId);

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(await gastoEnBase(gastoId)).toBeUndefined();
    const [auditado] = await auditoriaDelGasto(gastoId);
    expect(auditado).toMatchObject({ accion: 'eliminar', anterior: { anticipoId } });
  });
});

describe('bancarización compartida', () => {
  it('lo asignado en anticipos al proveedor en el mes cuenta para el umbral del libro', async () => {
    const { proveedorId } = await registrarProveedor(e.anticipos.cuenta, 'Maderas Aparte');
    const delProveedor = (total: string) => ({
      proveedorId,
      nitEmisor: nitValido('2000001'),
      lineas: [{ conceptoId: e.anticipos.conceptoDeGastoId, total }],
    });
    const grande = await e.enLaBandeja(delProveedor('28000.00'));
    const chico = await e.enLaBandeja(delProveedor('3000.00'));
    const anticipo = await e.anticipo('40000.00');
    /** Con retención se asigna con la excepción (el motivo solo va donde aplica). */
    const asignar = async (gastoId: string) => {
      const fila = (await e.bandeja()).cuerpo.find((g: { id: string }) => g.id === gastoId);
      const motivo = fila.conRetencion ? { motivoConRetencion: 'Proveedor de contado' } : {};
      return e.asignar(e.usuarios.conExcepcion, anticipo, [{ gastoId, ...motivo }]);
    };

    const primero = await asignar(grande.gastoId);
    const segundo = await asignar(chico.gastoId);

    expect(primero.cuerpo.avisos).toEqual([]);
    expect(primero.cuerpo.gastos[0].sinBancarizar).toBe(false);
    expect(segundo.estado, JSON.stringify(segundo.cuerpo)).toBe(201);
    const aviso: string = segundo.cuerpo.avisos[0] ?? '';
    expect(aviso).not.toBe('');
    expect(aviso).toMatch(/Bancarización|datos fiscales/);
    expect(segundo.cuerpo.gastos[0].sinBancarizar).toBe(aviso.startsWith('Bancarización'));
    expect((await gastoEnBase(chico.gastoId)).sin_bancarizar).toBe(aviso.startsWith('Bancarización'));
  });
});
