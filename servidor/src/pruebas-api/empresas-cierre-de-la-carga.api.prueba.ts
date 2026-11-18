import { readFileSync } from 'node:fs';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { RevisionDeCierreDeModulo } from '../modulos/core/contratos/empresas.contratos.js';
import { definicionesModulos } from '../modulos/indice.js';
import { mediador } from '../modulos/core/mediador/contexto.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import type { ClienteApi } from './soporte/cliente-api.js';

const MIGRACION = new URL('../modulos/empresas/migraciones/0010_em2_cierre_de_la_carga.sql', import.meta.url);
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let otraEmpresaId: string;
let soloVer: ClienteApi;
let respuesta: RevisionDeCierreDeModulo | null;
let preguntadas: string[];
let fallo: Error | null;

const ruta = (empresaId: string, parte: string) => `/api/empresas/${empresaId}/carga-inicial/${parte}`;
const fijarFecha = (empresaId: string, fechaDeInicio: string) =>
  cuenta.propietario.put(`/api/empresas/${empresaId}/carga-inicial`, { fechaDeInicio });
const auditoriaDelCierre = (empresaId: string) =>
  comoPropietario<{ accion: string; motivo: string | null; anterior: Record<string, any> }>(
    `select accion, motivo, anterior from core.auditoria
     where recurso = 'empresas.cargas-iniciales' and accion = 'cerrar' and empresa_id = $1 order by creado_en`,
    [empresaId],
  );

const pideMotivo = (cifra = '100.00'): RevisionDeCierreDeModulo => ({
  nombreDelModulo: 'Terceros de prueba',
  resumen: '1 registro',
  ruta: null,
  hallazgos: [{ codigo: 'no_cuadra', nivel: 'pide_motivo', mensaje: 'No cuadra', registro: null }],
  cifras: [{ clave: 'total', etiqueta: 'Total', tipo: 'monto', valor: cifra, registro: null }],
});

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Cierre', usuario: 'propietariocierre', modulos: ['terceros'] });
  otraEmpresaId = (await cuenta.propietario.post('/api/empresas', { nombre: 'Parcela Cierre' })).cuerpo.id;
  soloVer = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Solo',
    apellidos: 'Ve',
    permisos: ['empresas.ver', 'empresas.editar'],
  });
  // El módulo de terceros no responde esta pregunta: aquí hace de doble de un módulo con saldos iniciales.
  mediador.responder('terceros', 'empresas.revisar_cierre_de_carga', async ({ empresaId }, operador) => {
    preguntadas.push(`${empresaId}:${operador.empresaId}`);
    if (fallo) throw fallo;
    return respuesta;
  });
});

beforeEach(() => {
  respuesta = null;
  preguntadas = [];
  fallo = null;
});

describe('revisión antes de cerrar', () => {
  it('sin fecha de inicio responde 422 y sin el permiso de cerrar, 403 (aunque pueda editar)', async () => {
    expect((await cuenta.propietario.get(ruta(otraEmpresaId, 'revision-de-cierre'))).cuerpo.error.codigo).toBe(
      'fecha_de_inicio_requerida',
    );
    expect((await soloVer.get(ruta(cuenta.empresaId, 'revision-de-cierre'))).estado).toBe(403);
  });

  it('trae a la empresa primero, a los módulos activos que respondan y una huella', async () => {
    await fijarFecha(otraEmpresaId, '2026-03-15');
    respuesta = pideMotivo();

    const { estado, cuerpo } = await cuenta.propietario.get(ruta(otraEmpresaId, 'revision-de-cierre'));

    expect(estado).toBe(200);
    expect(cuerpo.modulos.map((m: { nombreDelModulo: string }) => m.nombreDelModulo)).toEqual([
      'Empresa',
      'Terceros de prueba',
    ]);
    expect(cuerpo.modulos[0].hallazgos.map((h: { codigo: string }) => h.codigo)).toEqual([
      'fecha_de_inicio_no_es_dia_1',
      'sin_balance_de_apertura',
    ]);
    expect(cuerpo).toMatchObject({ diferencias: 1, avisos: 2, pideMotivo: true, carga: { cerrada: false } });
    expect(cuerpo.huella).toMatch(/^[0-9a-f]{64}$/);
    expect(preguntadas).toEqual([`${otraEmpresaId}:${otraEmpresaId}`]);
  });
});

describe('cerrar con motivo y auditoría', () => {
  it('con diferencias pide motivo (422 con la revisión) y con el motivo cierra y audita todo', async () => {
    await fijarFecha(otraEmpresaId, '2026-04-01');
    respuesta = pideMotivo('250.00');

    const sinMotivo = await cuenta.propietario.post(ruta(otraEmpresaId, 'cerrar'), {});
    const conMotivo = await cuenta.propietario.post(ruta(otraEmpresaId, 'cerrar'), { motivo: '  Falta el estado  ' });
    const auditoria = await auditoriaDelCierre(otraEmpresaId);

    expect(sinMotivo.estado).toBe(422);
    expect(sinMotivo.cuerpo.error).toMatchObject({ codigo: 'motivo_de_cierre_requerido' });
    expect(sinMotivo.cuerpo.error.detalles.diferencias).toBe(1);
    expect(conMotivo.cuerpo).toMatchObject({ empresaId: otraEmpresaId, cerrada: true });
    expect(auditoria).toHaveLength(1);
    expect(auditoria[0]).toMatchObject({ motivo: 'Falta el estado' });
    expect(auditoria[0]!.anterior).toMatchObject({
      version: 1,
      carga: { empresaId: otraEmpresaId, fechaDeInicio: '2026-04-01' },
      balanceDeApertura: null,
      revision: { diferencias: 1, avisos: 1 },
    });
    expect(auditoria[0]!.anterior.revision.modulos[1].cifras[0]).toMatchObject({ clave: 'total', valor: '250.00' });
  });

  it('cerrar de nuevo, con la carga ya cerrada, responde 422', async () => {
    const otraVez = await cuenta.propietario.post(ruta(otraEmpresaId, 'cerrar'), { motivo: 'Otra vez' });

    expect(otraVez.cuerpo.error.codigo).toBe('carga_inicial_cerrada');
    expect(await auditoriaDelCierre(otraEmpresaId)).toHaveLength(1);
  });

  it('sin hallazgos que pidan motivo cierra sin cuerpo y audita motivo nulo; la empresa activa también', async () => {
    await fijarFecha(cuenta.empresaId, '2026-01-01');

    const cerrada = await cuenta.propietario.post(ruta(cuenta.empresaId, 'cerrar'));
    const auditoria = await auditoriaDelCierre(cuenta.empresaId);

    expect(cerrada.cuerpo).toMatchObject({ cerrada: true });
    expect(auditoria).toEqual([expect.objectContaining({ motivo: null })]);
  });

  it('un motivo de 501 caracteres o de solo espacios responde 400', async () => {
    await cuenta.propietario.post(`/api/empresas/${cuenta.empresaId}/carga-inicial/reabrir`, { motivo: 'Corregir' });

    const largo = await cuenta.propietario.post(ruta(cuenta.empresaId, 'cerrar'), { motivo: 'x'.repeat(501) });
    const espacios = await cuenta.propietario.post(ruta(cuenta.empresaId, 'cerrar'), { motivo: '   ' });

    expect(largo.estado).toBe(400);
    expect(largo.cuerpo.error.codigo).toBe('motivo_de_cierre_invalido');
    expect(espacios.estado).toBe(400);
  });

  it('con una huella vieja rechaza y deja la carga abierta; con la nueva cierra', async () => {
    respuesta = pideMotivo('10.00');
    const { cuerpo: vista } = await cuenta.propietario.get(ruta(cuenta.empresaId, 'revision-de-cierre'));
    respuesta = pideMotivo('11.00');

    const vieja = await cuenta.propietario.post(ruta(cuenta.empresaId, 'cerrar'), {
      motivo: 'Motivo',
      huella: vista.huella,
    });
    const nueva = await cuenta.propietario.post(ruta(cuenta.empresaId, 'cerrar'), {
      motivo: 'Motivo',
      huella: vieja.cuerpo.error.detalles.huella,
    });

    expect(vieja.estado).toBe(422);
    expect(vieja.cuerpo.error.codigo).toBe('revision_de_cierre_desactualizada');
    expect(nueva.cuerpo).toMatchObject({ cerrada: true });
  });

  it('si un módulo falla al revisar, no se cierra ni queda auditoría', async () => {
    await cuenta.propietario.post(`/api/empresas/${cuenta.empresaId}/carga-inicial/reabrir`, { motivo: 'Corregir' });
    const antes = (await auditoriaDelCierre(cuenta.empresaId)).length;
    fallo = new Error('el módulo se cayó');

    const intento = await cuenta.propietario.post(ruta(cuenta.empresaId, 'cerrar'), {});
    const estado = await cuenta.propietario.get(`/api/empresas/${cuenta.empresaId}/carga-inicial`);

    expect(intento.estado).toBe(500);
    expect(estado.cuerpo.cerrada).toBe(false);
    expect(await auditoriaDelCierre(cuenta.empresaId)).toHaveLength(antes);
  });
});

describe('migración 0010: catálogo y permisos', () => {
  it('la auditoría de las cargas iniciales está en el catálogo permanente', async () => {
    const filas = await comoPropietario<{ motivo: string }>(
      `select motivo from core.recursos_de_auditoria_permanente where recurso = 'empresas.cargas-iniciales'`,
      [],
    );

    expect(filas).toHaveLength(1);
    expect(filas[0]!.motivo).toContain('Código de Comercio, art. 382');
  });

  it('cada recurso del catálogo empieza con la clave de un módulo registrado', async () => {
    const filas = await comoPropietario<{ recurso: string }>(
      'select recurso from core.recursos_de_auditoria_permanente',
      [],
    );
    const claves = definicionesModulos.map((definicion) => definicion.clave);

    for (const { recurso } of filas) expect(claves).toContain(recurso.split('.')[0]);
  });

  it('quien podía cerrar o reabrir recibe ver-cierres y exportar, por rol y por usuario; los demás no', async () => {
    await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Cierra',
      apellidos: 'Rol',
      permisos: ['empresas.carga-inicial.cerrar'],
    });
    await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Reabre',
      apellidos: 'Rol',
      permisos: ['empresas.carga-inicial.reabrir'],
    });
    await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Soloedita',
      apellidos: 'Edita',
      permisos: ['empresas.editar'],
    });
    const [usuario] = await comoPropietario<{ id: string }>('select id from core.usuarios where usuario = $1', [
      cuenta.usuario,
    ]);
    await comoPropietario(
      `insert into core.usuario_permisos (cuenta_id, usuario_id, permiso) values ($1, $2, 'empresas.carga-inicial.cerrar')`,
      [cuenta.cuentaId, usuario!.id],
    );

    const sql = readFileSync(MIGRACION, 'utf8');
    await comoPropietario(sql, []);
    await comoPropietario(sql, []);

    const porRol = await comoPropietario<{ nombre: string; permiso: string }>(
      `select r.nombre, rp.permiso from core.rol_permisos rp join core.roles r on r.id = rp.rol_id
       where r.cuenta_id = $1 and rp.permiso in ('empresas.carga-inicial.ver-cierres', 'empresas.carga-inicial.exportar')
       order by 1, 2`,
      [cuenta.cuentaId],
    );
    const porUsuario = await comoPropietario<{ permiso: string }>(
      `select permiso from core.usuario_permisos where usuario_id = $1 and cuenta_id = $2
       and permiso in ('empresas.carga-inicial.ver-cierres', 'empresas.carga-inicial.exportar') order by 1`,
      [usuario!.id, cuenta.cuentaId],
    );

    expect(porRol.map((f) => `${f.nombre}:${f.permiso}`)).toEqual([
      'Rol de Cierra:empresas.carga-inicial.exportar',
      'Rol de Cierra:empresas.carga-inicial.ver-cierres',
      'Rol de Reabre:empresas.carga-inicial.exportar',
      'Rol de Reabre:empresas.carga-inicial.ver-cierres',
    ]);
    expect(porUsuario.map((f) => f.permiso)).toEqual([
      'empresas.carga-inicial.exportar',
      'empresas.carga-inicial.ver-cierres',
    ]);
  });
});
