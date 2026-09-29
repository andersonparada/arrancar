import { sql } from 'drizzle-orm';
import pg from 'pg';
import { beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../configuracion.js';
import { enTransaccionSegura } from '../modulos/core/compartido/pruebas/en-transaccion-segura.js';
import { mediador } from '../modulos/core/mediador/contexto.js';
import { bd } from '../modulos/core/base-datos/conexion.js';
import { UnidadDeTrabajoPostgres } from '../modulos/core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import type { ClienteApi } from './soporte/cliente-api.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let otraEmpresaId: string;
let contable: ClienteApi;

const ruta = (empresaId: string, parte: string) => `/api/empresas/${empresaId}/${parte}`;

async function comoPropietario<Resultado>(consulta: string, valores: unknown[]): Promise<Resultado[]> {
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  const { rows } = await conexion.query(consulta, valores);
  await conexion.end();
  return rows;
}

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Datos', usuario: 'propietariodatos' });
  const otra = await cuenta.propietario.post('/api/empresas', { nombre: 'Parcela Los Pinos' });
  otraEmpresaId = otra.cuerpo.id;
  contable = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Conta',
    apellidos: 'Ble',
    permisos: ['empresas.ver', 'empresas.crear', 'empresas.editar', 'empresas.carga-inicial.cerrar'],
  });
});

describe('datos fiscales', () => {
  it('sin guardar nada vienen en blanco', async () => {
    const respuesta = await cuenta.propietario.get(ruta(cuenta.empresaId, 'datos-fiscales'));

    expect(respuesta.estado).toBe(200);
    expect(respuesta.cuerpo).toEqual({ empresaId: cuenta.empresaId, razonSocial: null, nombreComercial: null });
  });

  it('se guardan y se corrigen en la empresa activa', async () => {
    const guardados = await cuenta.propietario.put(ruta(cuenta.empresaId, 'datos-fiscales'), {
      razonSocial: '  Ganadera Datos, S. A.  ',
      nombreComercial: '',
    });
    const leidos = await cuenta.propietario.get(ruta(cuenta.empresaId, 'datos-fiscales'));

    expect(guardados.estado).toBe(200);
    expect(leidos.cuerpo).toMatchObject({ razonSocial: 'Ganadera Datos, S. A.', nombreComercial: null });
  });

  it('también se editan en otra empresa de la cuenta que no es la activa', async () => {
    const guardados = await cuenta.propietario.put(ruta(otraEmpresaId, 'datos-fiscales'), {
      razonSocial: 'Parcelas Los Pinos, S. A.',
      nombreComercial: 'Los Pinos',
    });
    const activa = await cuenta.propietario.get(ruta(cuenta.empresaId, 'datos-fiscales'));

    expect(guardados.estado).toBe(200);
    expect(guardados.cuerpo).toMatchObject({ empresaId: otraEmpresaId, nombreComercial: 'Los Pinos' });
    expect(activa.cuerpo.razonSocial).toBe('Ganadera Datos, S. A.');
  });

  it('la fecha de inicio también se registra en otra empresa de la cuenta', async () => {
    const respuesta = await cuenta.propietario.put(ruta(otraEmpresaId, 'carga-inicial'), {
      fechaDeInicio: '2026-04-01',
    });

    expect(respuesta.cuerpo).toMatchObject({ empresaId: otraEmpresaId, fechaDeInicio: '2026-04-01', cerrada: false });
  });

  it('rechaza textos de más de 200 caracteres', async () => {
    const respuesta = await cuenta.propietario.put(ruta(cuenta.empresaId, 'datos-fiscales'), {
      razonSocial: 'x'.repeat(201),
    });

    expect(respuesta.estado).toBe(400);
  });

  it('una empresa que no existe o de otra cuenta responde 404', async () => {
    const ajena = await darDeAltaCuenta(entorno, { nombre: 'Ajena', usuario: 'propietarioajeno' });

    expect((await cuenta.propietario.get(ruta(crypto.randomUUID(), 'datos-fiscales'))).estado).toBe(404);
    expect((await cuenta.propietario.get(ruta(ajena.empresaId, 'datos-fiscales'))).estado).toBe(404);
    expect(
      (await cuenta.propietario.put(ruta(ajena.empresaId, 'carga-inicial'), { fechaDeInicio: '2026-01-01' })).estado,
    ).toBe(404);
  });
});

describe('carga inicial', () => {
  it('sin registrar viene sin fecha y abierta', async () => {
    const respuesta = await cuenta.propietario.get(ruta(cuenta.empresaId, 'carga-inicial'));

    expect(respuesta.cuerpo).toMatchObject({ fechaDeInicio: null, cerrada: false });
  });

  it('exige una fecha real y no deja cerrar sin fecha de inicio', async () => {
    const invalida = await cuenta.propietario.put(ruta(cuenta.empresaId, 'carga-inicial'), {
      fechaDeInicio: '2026-02-30',
    });
    const sinFecha = await cuenta.propietario.post(ruta(cuenta.empresaId, 'carga-inicial/cerrar'), {});

    expect(invalida.estado).toBe(400);
    expect(sinFecha.estado).toBe(422);
    expect(sinFecha.cuerpo.error.codigo).toBe('fecha_de_inicio_requerida');
  });

  it('registra la fecha, se corrige, se cierra y queda fija', async () => {
    const ruta_ = ruta(cuenta.empresaId, 'carga-inicial');
    await cuenta.propietario.put(ruta_, { fechaDeInicio: '2026-01-01' });
    const corregida = await cuenta.propietario.put(ruta_, { fechaDeInicio: '2026-02-01' });
    const cerrada = await cuenta.propietario.post(`${ruta_}/cerrar`, {});
    const cambio = await cuenta.propietario.put(ruta_, { fechaDeInicio: '2026-03-01' });
    const otraVez = await cuenta.propietario.post(`${ruta_}/cerrar`, {});

    expect(corregida.cuerpo).toMatchObject({ fechaDeInicio: '2026-02-01', cerrada: false });
    expect(cerrada.cuerpo).toMatchObject({ fechaDeInicio: '2026-02-01', cerrada: true, cerradaPor: 'Dueño Datos' });
    expect(cambio.estado).toBe(422);
    expect(cambio.cuerpo.error.codigo).toBe('carga_inicial_cerrada');
    expect(otraVez.estado).toBe(422);
  });

  it('reabrir pide motivo y deja la auditoría con cómo estaba', async () => {
    const ruta_ = ruta(cuenta.empresaId, 'carga-inicial/reabrir');

    const sinMotivo = await cuenta.propietario.post(ruta_, { motivo: '  ' });
    const reabierta = await cuenta.propietario.post(ruta_, { motivo: 'Faltó el saldo de una cuenta' });
    const otraVez = await cuenta.propietario.post(ruta_, { motivo: 'Otra vez' });
    const auditoria = await comoPropietario<{ accion: string; motivo: string; anterior: { cerrada: boolean } }>(
      `select accion, motivo, anterior from core.auditoria where recurso = 'empresas.cargas-iniciales' and empresa_id = $1`,
      [cuenta.empresaId],
    );

    expect(sinMotivo.estado).toBe(400);
    expect(reabierta.cuerpo).toMatchObject({ fechaDeInicio: '2026-02-01', cerrada: false, cerradaEn: null });
    expect(otraVez.estado).toBe(422);
    expect(auditoria).toEqual([
      expect.objectContaining({
        accion: 'reabrir',
        motivo: 'Faltó el saldo de una cuenta',
        anterior: expect.objectContaining({ cerrada: true }),
      }),
    ]);
  });
});

describe('permisos de la carga inicial', () => {
  it('quien crea y edita empresas pero no tiene el permiso de cerrar recibe 403', async () => {
    const sinCerrar = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Sin',
      apellidos: 'Cierre',
      permisos: ['empresas.ver', 'empresas.crear', 'empresas.editar'],
    });

    const respuesta = await sinCerrar.post(ruta(cuenta.empresaId, 'carga-inicial/cerrar'), {});

    expect(respuesta.estado).toBe(403);
  });

  it('con el permiso cierra, pero no puede reabrir', async () => {
    const ruta_ = ruta(cuenta.empresaId, 'carga-inicial');
    await contable.put(ruta_, { fechaDeInicio: '2026-03-01' });

    const cerrada = await contable.post(`${ruta_}/cerrar`, {});
    const reabierta = await contable.post(`${ruta_}/reabrir`, { motivo: 'Quiero corregir' });

    expect(cerrada.estado).toBe(200);
    expect(reabierta.estado).toBe(403);
  });

  it('el permiso de reabrir se asigna como cualquier otro y con él se reabre', async () => {
    const rol = await cuenta.propietario.post('/api/roles', {
      nombre: 'Reabre cargas',
      permisos: ['empresas.ver', 'empresas.carga-inicial.reabrir'],
    });
    const asignables = await cuenta.propietario.get('/api/permisos');

    expect(rol.estado).toBe(201);
    expect(JSON.stringify(asignables.cuerpo)).toContain('empresas.carga-inicial.reabrir');
  });
});

describe('órdenes del mediador y seguridad por filas', () => {
  const unidadDeTrabajo = new UnidadDeTrabajoPostgres(bd);

  async function operadorDeLaEmpresa(empresaId: string) {
    const [soporte] = await comoPropietario<{ id: string }>(`select id from core.usuarios where es_superacceso`, []);
    return { empresaId, cuentaId: cuenta.cuentaId, usuarioId: soporte!.id, esSuperacceso: true };
  }

  it('otro módulo obtiene la carga inicial y los datos de la empresa por el mediador', async () => {
    const operador = await operadorDeLaEmpresa(cuenta.empresaId);

    const { carga, datos } = await unidadDeTrabajo.ejecutar(operador, async () => ({
      carga: await mediador.enviar(operador, 'empresas.obtener_carga_inicial', { empresaId: cuenta.empresaId }),
      datos: await mediador.enviar(operador, 'empresas.obtener_datos_de_empresa', { empresaId: cuenta.empresaId }),
    }));

    expect(carga).toEqual({ fechaDeInicio: '2026-03-01', cerrada: true });
    expect(datos).toEqual({
      nombre: 'Rancho de Datos',
      nit: null,
      razonSocial: 'Ganadera Datos, S. A.',
      nombreComercial: null,
    });
  });

  it('pedir la de otra empresa dentro de la transacción de la activa es un error de programación', async () => {
    const operador = await operadorDeLaEmpresa(cuenta.empresaId);

    const pedir = unidadDeTrabajo.ejecutar(operador, () =>
      mediador.enviar(operador, 'empresas.obtener_carga_inicial', { empresaId: otraEmpresaId }),
    );

    await expect(pedir).rejects.toThrow(/no puede cambiar de empresa/);
  });

  it('cada empresa solo ve sus propias filas', async () => {
    const operador = await operadorDeLaEmpresa(otraEmpresaId);
    const filasVisibles = (tabla: string) =>
      enTransaccionSegura(operador, (tx) =>
        tx.execute<{ empresa_id: string }>(sql.raw(`select empresa_id from empresas.${tabla}`)),
      );

    const fiscales = await filasVisibles('datos_fiscales');
    const cargas = await filasVisibles('cargas_iniciales');

    expect(fiscales.rows.map((f) => f.empresa_id)).toEqual([otraEmpresaId]);
    expect(cargas.rows.map((f) => f.empresa_id)).toEqual([otraEmpresaId]);
  });

  it('al borrar la empresa se borran sus datos fiscales y su carga inicial', async () => {
    await comoPropietario('delete from core.empresas where id = $1', [otraEmpresaId]);

    const restantes = await comoPropietario<{ total: string }>(
      `select (select count(*) from empresas.datos_fiscales where empresa_id = $1)
            + (select count(*) from empresas.cargas_iniciales where empresa_id = $1) as total`,
      [otraEmpresaId],
    );

    expect(Number(restantes[0]!.total)).toBe(0);
  });
});
