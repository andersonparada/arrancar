/**
 * La excepción de retención de Caja chica (CC-f = A′, §5.4 g): una factura con retención queda en la bandeja y solo entra a
 * un fondo si quien la asigna tiene `caja-chica.comprobantes.con-retencion` y escribe un motivo; quien la asigna queda como
 * quien la autorizó. Devolverla a la bandeja y reasignarla pide otra vez el permiso y el motivo.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { RUTA_DE_ACCESOS } from './soporte/caja-chica-fondos.js';
import {
  auditoriaDelComprobante,
  comprobanteEnBase,
  EscenarioDeComprobantes,
  LINEA_CON_RETENCION,
  RUTA_DE_CAJA_CHICA,
  usuarioIdDe,
} from './soporte/caja-chica-comprobantes.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let e: EscenarioDeComprobantes;
let sinExcepcion: ClienteApi;
let conExcepcion: ClienteApi;
let fondoId: string;

const MOTIVO = 'El proveedor del pueblo solo vende en efectivo';

beforeAll(async () => {
  e = await EscenarioDeComprobantes.preparar(entorno, 'cajachicaretencion');
  const cuenta = e.caja.cuenta;
  const permisos = ['caja-chica.fondos.ver', 'caja-chica.comprobantes.crear'];
  sinExcepcion = await crearUsuarioConPermisos(entorno, cuenta, { nombres: 'Sin', apellidos: 'Excepcion', permisos });
  conExcepcion = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Con',
    apellidos: 'Excepcion',
    permisos: [...permisos, 'caja-chica.comprobantes.con-retencion'],
  });
  const fondo = await e.abrirFondo('Caja de las retenciones', { monto: '20000.00', topePorComprobante: '10000.00' });
  fondoId = fondo.id;
  for (const nombres of ['Sin', 'Con']) {
    const id = await usuarioIdDe(cuenta.empresaId, nombres);
    await e.propietario().put(`${RUTA_DE_ACCESOS}/${id}`, { fondoIds: [fondoId] });
  }
});

/** Registra una factura con retención (Q5,600.00 con la empresa como agente de IVA: retiene Q90.00) y devuelve su fila de la bandeja. */
async function facturaConRetencion(cambios: Record<string, unknown> = {}) {
  const { documentoId, avisos } = await e.registrarEnElLibro({ total: LINEA_CON_RETENCION, ...cambios });
  return { documentoId, avisos, comprobante: await e.enLaBandeja(documentoId) };
}

describe('recibir una factura con retención', () => {
  it('queda en la bandeja aunque traiga la referencia del fondo, con su retención y el neto, y el libro recibe el aviso', async () => {
    const { avisos, comprobante } = await facturaConRetencion({ referenciaDeDestino: fondoId });

    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toMatch(
      /^Quedó en la bandeja de Caja chica: lleva retención de Q\s90\.00 \(la entera la empresa\)/,
    );
    expect(comprobante).toMatchObject({
      fondoId: null,
      conRetencion: true,
      montoRetenido: '90.00',
      monto: '5510.00',
      motivoConRetencion: null,
      puedeAsignarConRetencion: true,
      documento: { total: '5600.00' },
    });
  });

  it('la bandeja dice quién puede asignarla con retención: solo quien tiene el permiso de excepción', async () => {
    const { documentoId } = await facturaConRetencion();

    const sin = (await e.bandeja(sinExcepcion)).find((fila) => fila.documentoDeCompraId === documentoId);
    const con = (await e.bandeja(conExcepcion)).find((fila) => fila.documentoDeCompraId === documentoId);

    expect(sin).toMatchObject({ conRetencion: true, puedeAsignarConRetencion: false });
    expect(con).toMatchObject({ conRetencion: true, puedeAsignarConRetencion: true });
  });
});

describe('asignarla al fondo', () => {
  it('sin el permiso de excepción responde 403 y la factura sigue en la bandeja (y con ella, toda la tanda)', async () => {
    const { comprobante } = await facturaConRetencion();
    const sinRetencion = await e.registrarEnElLibro();
    const idSinRetencion = (await e.enLaBandeja(sinRetencion.documentoId)).id;

    const respuesta = await e.asignar(
      fondoId,
      [{ comprobanteId: idSinRetencion }, { comprobanteId: comprobante.id, motivoConRetencion: MOTIVO }],
      sinExcepcion,
    );

    expect(respuesta.estado).toBe(403);
    expect(respuesta.cuerpo.error.codigo).toBe('retencion_sin_permiso');
    expect(respuesta.cuerpo.error.mensaje).toMatch(/lleva retención de Q\s90\.00/);
    expect((await comprobanteEnBase(comprobante.id)).fondo_id).toBeNull();
    expect((await comprobanteEnBase(idSinRetencion)).fondo_id).toBeNull();
  });

  it('con el permiso y sin motivo se rechaza, y un motivo en una factura sin retención tampoco se guarda', async () => {
    const { comprobante } = await facturaConRetencion();
    const limpia = await e.registrarEnElLibro();
    const idLimpia = (await e.enLaBandeja(limpia.documentoId)).id;

    const sinMotivo = await e.asignar(fondoId, [{ comprobanteId: comprobante.id }], conExcepcion);
    const motivoEnBlanco = await e.asignar(
      fondoId,
      [{ comprobanteId: comprobante.id, motivoConRetencion: '   ' }],
      conExcepcion,
    );
    const motivoQueNoAplica = await e.asignar(
      fondoId,
      [{ comprobanteId: idLimpia, motivoConRetencion: MOTIVO }],
      conExcepcion,
    );

    expect(sinMotivo.estado).toBe(400);
    expect(sinMotivo.cuerpo.error.codigo).toBe('motivo_con_retencion_obligatorio');
    expect(motivoEnBlanco.cuerpo.error.codigo).toBe('motivo_con_retencion_obligatorio');
    expect(motivoQueNoAplica.cuerpo.error.codigo).toBe('motivo_con_retencion_sin_retencion');
    expect((await comprobanteEnBase(comprobante.id)).fondo_id).toBeNull();
    expect((await comprobanteEnBase(idLimpia)).fondo_id).toBeNull();
  });

  it('con el permiso y el motivo queda asignada: por el neto, a nombre de quien la autorizó y con su auditoría', async () => {
    const { comprobante } = await facturaConRetencion();
    const autorizadorId = await usuarioIdDe(e.caja.cuenta.empresaId, 'Con');
    const antes = (await e.delFondo(fondoId)).totales.pendiente;

    const resultado = await e.asignarBien(
      fondoId,
      [{ comprobanteId: comprobante.id, motivoConRetencion: MOTIVO }],
      conExcepcion,
    );

    expect(resultado.comprobantes[0]).toMatchObject({
      fondoId,
      monto: '5510.00',
      motivoConRetencion: MOTIVO,
      asignadoPor: autorizadorId,
    });
    const enBase = await comprobanteEnBase(comprobante.id);
    expect(enBase).toMatchObject({ fondo_id: fondoId, asignado_por: autorizadorId, motivo_con_retencion: MOTIVO });
    const auditoria = await auditoriaDelComprobante(comprobante.id);
    expect(auditoria).toMatchObject([{ accion: 'autorizar', motivo: MOTIVO }]);
    expect(auditoria[0]!.anterior).toMatchObject({ fondoId: null, conRetencion: true, montoRetenido: '90.00' });
    const despues = (await e.delFondo(fondoId)).totales.pendiente;
    expect(Number(despues) - Number(antes)).toBe(5510);
  });

  it('devolverla a la bandeja limpia la excepción; reasignarla pide otra vez el permiso y un motivo', async () => {
    const { comprobante } = await facturaConRetencion();
    await e.asignarBien(fondoId, [{ comprobanteId: comprobante.id, motivoConRetencion: MOTIVO }], conExcepcion);

    const devuelta = await conExcepcion.post(
      `${RUTA_DE_CAJA_CHICA}/comprobantes/${comprobante.id}/devolver-a-la-bandeja`,
      {
        motivo: 'Se asignó al fondo equivocado',
      },
    );

    expect(devuelta.estado, JSON.stringify(devuelta.cuerpo)).toBe(200);
    expect(devuelta.cuerpo).toMatchObject({
      fondoId: null,
      motivoConRetencion: null,
      asignadoEn: null,
      asignadoPor: null,
    });
    expect((await auditoriaDelComprobante(comprobante.id)).map(({ accion }) => accion)).toEqual([
      'autorizar',
      'corregir',
    ]);
    const sinPermiso = await e.asignar(
      fondoId,
      [{ comprobanteId: comprobante.id, motivoConRetencion: MOTIVO }],
      sinExcepcion,
    );
    const sinMotivo = await e.asignar(fondoId, [{ comprobanteId: comprobante.id }], conExcepcion);
    expect(sinPermiso.cuerpo.error.codigo).toBe('retencion_sin_permiso');
    expect(sinMotivo.cuerpo.error.codigo).toBe('motivo_con_retencion_obligatorio');
    await e.asignarBien(fondoId, [{ comprobanteId: comprobante.id, motivoConRetencion: 'Otro motivo' }], conExcepcion);
    expect((await auditoriaDelComprobante(comprobante.id)).map(({ accion }) => accion)).toEqual([
      'autorizar',
      'corregir',
      'autorizar',
    ]);
  });
});
