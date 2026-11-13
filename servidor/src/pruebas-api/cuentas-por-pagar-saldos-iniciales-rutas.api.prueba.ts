/**
 * Rutas de los saldos iniciales (U8-4): cada una con y sin su permiso, la carga y su lista, los errores por campo, el
 * único del documento, la auditoría de corregir y eliminar, y la carga inicial cerrada.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import '../modulos/core/contratos/cuentas-por-pagar.contratos.js';
import type { ClienteApi } from './soporte/cliente-api.js';
import { MODULOS_DE_CUENTAS_POR_PAGAR } from './soporte/cuentas-por-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { consultar, prepararEscenario, type EscenarioDeDocumentos } from './soporte/escenario-de-documentos.js';
import { crearUsuarioConPermisos, darDeAltaCuenta } from './soporte/escenarios.js';

const RUTA = '/api/cuentas-por-pagar/saldos-iniciales';
const CARGA = (empresaId: string) => `/api/empresas/${empresaId}/carga-inicial`;
const PERMISOS = 'cuentas-por-pagar.saldos-iniciales';
const entorno = usarEntornoApi();
let escenario: EscenarioDeDocumentos;
let soloVer: ClienteApi;
let soloCrear: ClienteApi;
let soloEditar: ClienteApi;
let soloEliminar: ClienteApi;

const propietario = () => escenario.cuenta.propietario;
const solicitud = (cambios: Record<string, unknown> = {}) => ({
  proveedorId: escenario.proveedorId,
  tipo: 'factura',
  serie: 'a',
  numero: '1001',
  fechaEmision: '2025-12-20',
  vencimiento: '2026-01-20',
  total: '1120.00',
  retenciones: '120.00',
  retencionesPorPracticar: '20.00',
  saldoPendiente: '700.00',
  referencia: 'CXP-0045',
  tieneActivoFijo: false,
  ...cambios,
});
const crear = async (cambios: Record<string, unknown> = {}) => {
  const respuesta = await propietario().post(RUTA, solicitud(cambios));
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
  return respuesta.cuerpo.id as string;
};
const auditoriaDe = (accion: string) =>
  consultar<{ registro_id: string; motivo: string | null; anterior: { numero: string } }>(
    'select registro_id, motivo, anterior from core.auditoria where recurso = $1 and accion = $2 and cuenta_id = $3',
    [PERMISOS, accion, escenario.cuenta.cuentaId],
  );

beforeAll(async () => {
  escenario = await prepararEscenario(entorno, 'cxpsaldosrutas', MODULOS_DE_CUENTAS_POR_PAGAR);
  const usuario = (nombres: string, permiso: string) =>
    crearUsuarioConPermisos(entorno, escenario.cuenta, {
      nombres,
      apellidos: 'Saldos',
      permisos: [`${PERMISOS}.${permiso}`],
    });
  soloVer = await usuario('Solo ver', 'ver');
  soloCrear = await usuario('Solo crear', 'crear');
  soloEditar = await usuario('Solo editar', 'editar');
  soloEliminar = await usuario('Solo eliminar', 'eliminar');
});

describe('permisos de las rutas', () => {
  it('sin sesión responde 401 y en una cuenta sin el módulo, 403', async () => {
    const sinModulo = await darDeAltaCuenta(entorno, {
      nombre: 'Sin cxp',
      usuario: 'sincxpsaldos',
      modulos: ['terceros'],
    });

    expect((await entorno.nuevoCliente().get(RUTA)).estado).toBe(401);
    expect((await sinModulo.propietario.get(RUTA)).estado).toBe(403);
  });

  it('cada ruta rechaza con 403 a quien tiene solo el permiso de otra acción', async () => {
    const id = crypto.randomUUID();
    const respuestas = [
      await soloCrear.get(RUTA),
      await soloCrear.get(`${RUTA}/${id}`),
      await soloVer.post(RUTA, solicitud()),
      await soloVer.put(`${RUTA}/${id}`, solicitud()),
      await soloEditar.delete(`${RUTA}/${id}`, { motivo: 'Error' }),
      await soloEliminar.put(`${RUTA}/${id}`, solicitud()),
    ];

    expect(respuestas.map((respuesta) => respuesta.estado)).toEqual([403, 403, 403, 403, 403, 403]);
    expect(respuestas[2]!.cuerpo.error.codigo).toBe('sin_permiso');
  });

  it('con su permiso, cada ruta llega al caso de uso (la ficha que no existe responde 404)', async () => {
    const id = crypto.randomUUID();

    expect((await soloVer.get(RUTA)).estado).toBe(200);
    expect((await soloVer.get(`${RUTA}/${id}`)).estado).toBe(404);
    expect((await soloEditar.put(`${RUTA}/${id}`, solicitud())).estado).toBe(422);
    expect((await soloEliminar.delete(`${RUTA}/${id}`, { motivo: 'Error' })).estado).toBe(422);
  });
});

describe('la carga y la fecha de inicio', () => {
  it('sin fecha de inicio no se carga y la lista lo dice', async () => {
    const respuesta = await soloCrear.post(RUTA, solicitud());
    const lista = await soloVer.get(RUTA);

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('fecha_de_inicio_sin_registrar');
    expect(lista.cuerpo).toMatchObject({ carga: { fechaDeInicio: null, cerrada: false }, elementos: [], total: 0 });
  });

  it('con fecha de inicio carga un saldo (201), que sale en la lista y la ficha', async () => {
    await propietario().put(CARGA(escenario.cuenta.empresaId), { fechaDeInicio: '2026-01-01' });

    const respuesta = await soloCrear.post(RUTA, solicitud({ numero: '2001' }));
    const id = respuesta.cuerpo.id as string;
    const lista = await soloVer.get(`${RUTA}?proveedorId=${escenario.proveedorId}`);
    const ficha = await soloVer.get(`${RUTA}/${id}`);

    expect(respuesta.estado).toBe(201);
    expect(respuesta.cuerpo).toMatchObject({
      serie: 'A',
      numero: '2001',
      saldoPendiente: '700.00',
      anterioresAlInicio: '300.00',
      estado: 'registrado',
      puedeCorregir: true,
      puedeEliminar: true,
    });
    expect(lista.cuerpo.carga).toEqual({ fechaDeInicio: '2026-01-01', cerrada: false });
    expect(lista.cuerpo.elementos.map((e: { id: string }) => e.id)).toContain(id);
    expect(ficha.cuerpo).toEqual(respuesta.cuerpo);
  });
});

describe('errores por campo', () => {
  const campoDelError = async (cambios: Record<string, unknown>) => {
    const respuesta = await propietario().post(RUTA, solicitud(cambios));
    return {
      estado: respuesta.estado,
      codigo: respuesta.cuerpo.error.codigo,
      campo: respuesta.cuerpo.error.detalles?.campo,
    };
  };

  it('las reglas del dominio responden 400 con el campo', async () => {
    expect(await campoDelError({ numero: '3001', fechaEmision: '2026-01-01' })).toEqual({
      estado: 400,
      codigo: 'emision_no_anterior_al_inicio',
      campo: 'fechaEmision',
    });
    expect(await campoDelError({ numero: '3010', fechaEmision: '2015-12-31' })).toEqual({
      estado: 400,
      codigo: 'emision_demasiado_antigua',
      campo: 'fechaEmision',
    });
    expect((await propietario().post(RUTA, solicitud({ numero: '3011', fechaEmision: '2016-01-01' }))).estado).toBe(
      201,
    );
    expect(await campoDelError({ numero: '3002', saldoPendiente: '1100.00' })).toMatchObject({
      codigo: 'saldo_pendiente_invalido',
      campo: 'saldoPendiente',
    });
    expect(await campoDelError({ numero: '3003', proveedorId: crypto.randomUUID() })).toMatchObject({
      codigo: 'proveedor_no_disponible',
      campo: 'proveedorId',
    });
  });

  it('la forma inválida responde 400 y no llega al caso de uso', async () => {
    const dinero = await propietario().post(RUTA, solicitud({ total: '12,5' }));
    const tipo = await propietario().post(RUTA, solicitud({ tipo: 'cheque' }));
    const id = await propietario().get(`${RUTA}/no-es-uuid`);

    expect([dinero.estado, tipo.estado, id.estado]).toEqual([400, 400, 400]);
  });

  it('el mismo documento dos veces responde 409 con el mensaje del único', async () => {
    await crear({ numero: '4001' });

    const repetido = await propietario().post(RUTA, solicitud({ numero: '4001', tipo: 'factura_especial' }));

    expect(repetido.estado).toBe(409);
    expect(repetido.cuerpo.error.mensaje).toContain('ya está en Cuentas por pagar');
    expect(repetido.cuerpo.error.detalles).toEqual({ campo: 'numero' });
  });

  it('un vencimiento anterior a la emisión trae el campo, y el dinero de los mensajes lleva miles', async () => {
    const vencimiento = await propietario().post(
      RUTA,
      solicitud({ numero: '4002', vencimiento: '2025-12-01', fechaEmision: '2025-12-20' }),
    );
    const exceso = await propietario().post(RUTA, solicitud({ numero: '4003', saldoPendiente: '99999.00' }));

    expect(vencimiento.estado).toBe(400);
    expect(vencimiento.cuerpo.error.detalles).toEqual({ campo: 'vencimiento' });
    expect(exceso.cuerpo.error.mensaje).toMatch(/\(Q[\d,]+\.\d{2}\)/);
  });
});

describe('corregir, eliminar y la carga cerrada', () => {
  it('corregir (200) deja la auditoría con cómo estaba', async () => {
    const id = await crear({ numero: '5001' });

    const corregido = await soloEditar.put(`${RUTA}/${id}`, solicitud({ numero: '5001', saldoPendiente: '650.00' }));
    const auditoria = (await auditoriaDe('corregir')).filter((fila) => fila.registro_id === id);

    expect(corregido.estado).toBe(200);
    expect(corregido.cuerpo.saldoPendiente).toBe('650.00');
    expect(auditoria).toHaveLength(1);
    expect(auditoria[0]!.anterior.numero).toBe('5001');
  });

  it('eliminar (204) pide motivo, deja la auditoría y la ficha desaparece', async () => {
    const id = await crear({ numero: '6001' });

    const sinMotivo = await soloEliminar.delete(`${RUTA}/${id}`, { motivo: '  ' });
    const eliminado = await soloEliminar.delete(`${RUTA}/${id}`, { motivo: 'Se cargó por error' });
    const auditoria = (await auditoriaDe('eliminar')).filter((fila) => fila.registro_id === id);

    expect(sinMotivo.estado).toBe(400);
    expect(eliminado.estado).toBe(204);
    expect((await soloVer.get(`${RUTA}/${id}`)).estado).toBe(404);
    expect(auditoria).toMatchObject([{ motivo: 'Se cargó por error', anterior: { numero: '6001' } }]);
  });

  it('con la carga cerrada no se carga, ni se corrige, ni se elimina, y la lista no deja corregir', async () => {
    const id = await crear({ numero: '7001' });
    await propietario().post(`${CARGA(escenario.cuenta.empresaId)}/cerrar`, {});

    const cargar = await propietario().post(RUTA, solicitud({ numero: '7002' }));
    const corregir = await propietario().put(`${RUTA}/${id}`, solicitud({ numero: '7001' }));
    const eliminar = await propietario().delete(`${RUTA}/${id}`, { motivo: 'Tarde' });
    const lista = await propietario().get(`${RUTA}?limite=200`);

    expect([cargar.estado, corregir.estado, eliminar.estado]).toEqual([422, 422, 422]);
    expect(cargar.cuerpo.error.codigo).toBe('carga_inicial_cerrada_para_saldos');
    expect(lista.cuerpo.carga.cerrada).toBe(true);
    expect(lista.cuerpo.elementos.every((e: { puedeCorregir: boolean }) => !e.puedeCorregir)).toBe(true);
  });
});
