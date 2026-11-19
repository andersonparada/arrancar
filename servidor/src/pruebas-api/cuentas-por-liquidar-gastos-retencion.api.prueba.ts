/**
 * La excepción de retención de los anticipos (CL-3, §7.2): una factura con retención se recibe siempre y queda en la bandeja,
 * aunque traiga la referencia del anticipo; solo se asigna con el permiso de excepción y un motivo, y queda quién la autorizó.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { auditoriaDelGasto, EscenarioDeGastos, gastoEnBase } from './soporte/cuentas-por-liquidar-gastos.js';
import { usarEntornoApi } from './soporte/entorno-api.js';

const entorno = usarEntornoApi();
let e: EscenarioDeGastos;
let anticipoId: string;

beforeAll(async () => {
  e = await EscenarioDeGastos.preparar(entorno, 'cxlretencion');
  anticipoId = await e.anticipo();
});

describe('recibir una factura con retención', () => {
  it('desde la ficha (con la referencia del anticipo) queda en la bandeja con el aviso y sin motivo', async () => {
    const respuesta = await e.conRetencion({ referenciaDeDestino: anticipoId });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(respuesta.cuerpo.avisos.join(' ')).toContain('Quedó en la bandeja de Cuentas por liquidar');
    expect(respuesta.cuerpo.avisos.join(' ')).toContain('Q90.00');
    const gastoId = await e.gastoDelDocumento(respuesta.cuerpo.documento.id);
    expect(await gastoEnBase(gastoId)).toMatchObject({
      anticipo_id: null,
      monto: '5510.00',
      monto_retenido: '90.00',
      con_retencion: true,
      motivo_con_retencion: null,
      asignado_por: null,
    });
    expect(await e.gastosDe(anticipoId)).toEqual([]);
  });

  it('la bandeja la marca con retención y dice si quien mira la puede asignar', async () => {
    const { gastoId } = await e.enLaBandeja({}, true);

    const conPermiso = await e.bandeja(e.usuarios.conExcepcion, '?conRetencion=true');
    const sinPermiso = await e.bandeja(e.usuarios.asignador, '?conRetencion=true');
    const sinRetencion = await e.bandeja(e.propietario(), '?conRetencion=false');

    const fila = (cuerpo: Array<{ id: string }>) => cuerpo.find((g) => g.id === gastoId);
    expect(fila(conPermiso.cuerpo)).toMatchObject({
      conRetencion: true,
      montoRetenido: '90.00',
      monto: '5510.00',
      puedeAsignarConRetencion: true,
    });
    expect(fila(sinPermiso.cuerpo)).toMatchObject({ puedeAsignarConRetencion: false });
    expect(fila(sinRetencion.cuerpo)).toBeUndefined();
    expect(sinRetencion.cuerpo.every((g: { conRetencion: boolean }) => !g.conRetencion)).toBe(true);
  });
});

describe('asignar con la excepción', () => {
  it('sin el permiso es 403 y la factura sigue en la bandeja', async () => {
    const { gastoId } = await e.enLaBandeja({}, true);

    const respuesta = await e.asignar(e.usuarios.asignador, anticipoId, [
      { gastoId, motivoConRetencion: 'El proveedor solo cobra en efectivo' },
    ]);

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(403);
    expect(respuesta.cuerpo.error.codigo).toBe('retencion_sin_permiso');
    expect(respuesta.cuerpo.error.mensaje).toContain('Q90.00');
    expect((await gastoEnBase(gastoId)).anticipo_id).toBeNull();
    expect(await auditoriaDelGasto(gastoId)).toEqual([]);
  });

  it('con el permiso y sin motivo se rechaza', async () => {
    const { gastoId } = await e.enLaBandeja({}, true);

    const respuesta = await e.asignar(e.usuarios.conExcepcion, anticipoId, [{ gastoId }]);

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(400);
    expect(respuesta.cuerpo.error.codigo).toBe('motivo_con_retencion_obligatorio');
    expect((await gastoEnBase(gastoId)).anticipo_id).toBeNull();
  });

  it('con el permiso y el motivo queda asignada, con quién autorizó y la auditoría `autorizar`', async () => {
    const { gastoId } = await e.enLaBandeja({}, true);

    const respuesta = await e.asignar(e.usuarios.conExcepcion, anticipoId, [
      { gastoId, motivoConRetencion: '  El proveedor solo cobra en efectivo  ' },
    ]);

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(respuesta.cuerpo.gastos[0]).toMatchObject({
      anticipoId,
      monto: '5510.00',
      motivoConRetencion: 'El proveedor solo cobra en efectivo',
    });
    const guardado = await gastoEnBase(gastoId);
    const [auditado] = await auditoriaDelGasto(gastoId);
    expect(guardado).toMatchObject({
      anticipo_id: anticipoId,
      motivo_con_retencion: 'El proveedor solo cobra en efectivo',
    });
    expect(guardado.asignado_por).toBe(auditado!.usuario_id);
    expect(auditado).toMatchObject({
      accion: 'autorizar',
      motivo: 'El proveedor solo cobra en efectivo',
      anterior: { anticipoId: null, conRetencion: true, motivoConRetencion: null },
    });
  });

  it('una tanda es todo o nada: con una factura con retención sin permiso no se asigna ninguna', async () => {
    const normal = await e.enLaBandeja();
    const conRetencion = await e.enLaBandeja({}, true);

    const respuesta = await e.asignar(e.usuarios.asignador, anticipoId, [
      { gastoId: normal.gastoId },
      { gastoId: conRetencion.gastoId },
    ]);

    expect(respuesta.estado).toBe(403);
    expect((await gastoEnBase(normal.gastoId)).anticipo_id).toBeNull();
    expect((await gastoEnBase(conRetencion.gastoId)).anticipo_id).toBeNull();
  });

  it('un motivo de retención en un documento sin retención se rechaza y no se guarda', async () => {
    const { gastoId } = await e.enLaBandeja();

    const respuesta = await e.asignar(e.usuarios.conExcepcion, anticipoId, [
      { gastoId, motivoConRetencion: 'Por si acaso' },
    ]);

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error.codigo).toBe('motivo_con_retencion_no_aplica');
    expect((await gastoEnBase(gastoId)).motivo_con_retencion).toBeNull();
  });
});

describe('devolver y reasignar', () => {
  it('devolverla a la bandeja limpia el motivo y quién asignó, y reasignarla pide otra vez el motivo', async () => {
    const { gastoId } = await e.enLaBandeja({}, true);
    await e.asignar(e.usuarios.conExcepcion, anticipoId, [{ gastoId, motivoConRetencion: 'Urgente' }]);

    const quitada = await e.quitar(e.usuarios.quitador, gastoId, 'Era de otro anticipo');
    const reasignada = await e.asignar(e.usuarios.conExcepcion, anticipoId, [{ gastoId }]);

    expect(quitada.estado, JSON.stringify(quitada.cuerpo)).toBe(200);
    expect(await gastoEnBase(gastoId)).toMatchObject({
      anticipo_id: null,
      motivo_con_retencion: null,
      asignado_por: null,
      estado: 'vigente',
    });
    expect(reasignada.cuerpo.error.codigo).toBe('motivo_con_retencion_obligatorio');
    expect((await auditoriaDelGasto(gastoId)).map(({ accion, motivo }) => [accion, motivo])).toEqual([
      ['autorizar', 'Urgente'],
      ['corregir', 'Era de otro anticipo'],
    ]);
  });
});
