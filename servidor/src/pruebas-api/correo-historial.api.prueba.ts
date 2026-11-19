import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { sembrarCorreo } from './soporte/correos-de-prueba.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let otra: CuentaDePrueba;
let soloVer: ClienteApi;

const sembrar = (datos: Omit<Parameters<typeof sembrarCorreo>[0], 'cuentaId' | 'empresaId'>) =>
  sembrarCorreo({ cuentaId: cuenta.cuentaId, empresaId: cuenta.empresaId, ...datos });

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Historial', usuario: 'chistorial' });
  otra = await darDeAltaCuenta(entorno, { nombre: 'Ajena', usuario: 'cajena' });
  soloVer = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Lector',
    apellidos: 'Correos',
    permisos: ['correos.ver'],
  });
});

describe('historial de correos', () => {
  it('pide sesión y el permiso de cada acción', async () => {
    const id = await sembrar({ estado: 'pendiente' });

    expect((await entorno.nuevoCliente().get('/api/correos')).estado).toBe(401);
    expect((await soloVer.get('/api/correos')).estado).toBe(200);
    expect((await soloVer.post(`/api/correos/${id}/cancelar`, { motivo: 'x' })).estado).toBe(403);
    expect((await soloVer.post(`/api/correos/${id}/reintentar`, {})).estado).toBe(403);
  });

  it('lista con filtros y no muestra el cuerpo ni el código técnico del error', async () => {
    await sembrar({ estado: 'fallido', asunto: 'Falló uno', codigoDeError: 'ETIMEDOUT' });
    await sembrar({ estado: 'enviado', tipo: 'bancos.aviso_de_cheque', asunto: 'Enviado otro' });

    const fallidos = await cuenta.propietario.get('/api/correos?estado=fallido');
    const porTipo = await cuenta.propietario.get('/api/correos?tipo=bancos.aviso_de_cheque');
    const futuro = await cuenta.propietario.get('/api/correos?desde=2999-01-01');

    expect(fallidos.cuerpo.elementos.map((c: { asunto: string }) => c.asunto)).toContain('Falló uno');
    expect(fallidos.cuerpo.elementos.every((c: { estado: string }) => c.estado === 'fallido')).toBe(true);
    expect(porTipo.cuerpo.elementos).toHaveLength(1);
    expect(porTipo.cuerpo.elementos[0].destinatarios).toEqual([
      { direccion: 'proveedor@ejemplo.com', nombre: null, clase: 'para', resultado: null },
    ]);
    expect(futuro.cuerpo.total).toBe(0);
    expect(JSON.stringify(fallidos.cuerpo)).not.toMatch(/ETIMEDOUT|cuerpoTexto|Texto del aviso/);
  });

  it('pagina el historial', async () => {
    const primera = await cuenta.propietario.get('/api/correos?limite=2&pagina=1');
    const segunda = await cuenta.propietario.get('/api/correos?limite=2&pagina=2');

    expect(primera.cuerpo).toMatchObject({ pagina: 1, limite: 2 });
    expect(primera.cuerpo.elementos).toHaveLength(2);
    expect(segunda.cuerpo.elementos[0].id).not.toBe(primera.cuerpo.elementos[0].id);
  });

  it('no mezcla las cuentas: lo ajeno ni se lista ni se abre', async () => {
    const ajeno = await sembrarCorreo({ cuentaId: otra.cuentaId, empresaId: otra.empresaId, asunto: 'De la otra' });

    const lista = await cuenta.propietario.get('/api/correos?limite=200');
    const ficha = await cuenta.propietario.get(`/api/correos/${ajeno}`);

    expect(JSON.stringify(lista.cuerpo)).not.toContain('De la otra');
    expect(ficha.estado).toBe(404);
  });

  it('la ficha trae el texto, y nulo si ya se depuró', async () => {
    const reciente = await sembrar({ estado: 'enviado' });
    const viejo = await sembrar({ estado: 'enviado', depurado: true });

    const abierto = await cuenta.propietario.get(`/api/correos/${reciente}`);
    const depurado = await cuenta.propietario.get(`/api/correos/${viejo}`);

    expect(abierto.cuerpo).toMatchObject({ cuerpoTexto: 'Texto del aviso', contenidoDepurado: false });
    expect(depurado.cuerpo).toMatchObject({ cuerpoTexto: null, contenidoDepurado: true });
  });
});

describe('cancelar un correo', () => {
  it('cancela un pendiente y lo deja en la auditoría con el motivo', async () => {
    const id = await sembrar({ estado: 'pendiente', asunto: 'Por cancelar' });

    const respuesta = await cuenta.propietario.post(`/api/correos/${id}/cancelar`, { motivo: '  Se pagó por error ' });

    expect(respuesta.estado).toBe(200);
    expect(respuesta.cuerpo).toMatchObject({ estado: 'cancelado', motivoDeCancelacion: 'Se pagó por error' });
    const [auditado] = await comoPropietario<{ accion: string; motivo: string; anterior: { estado: string } }>(
      `select accion, motivo, anterior from core.auditoria where recurso = 'core.correos_salientes' and registro_id = $1`,
      [id],
    );
    expect(auditado).toMatchObject({
      accion: 'anular',
      motivo: 'Se pagó por error',
      anterior: { estado: 'pendiente' },
    });
    expect(JSON.stringify(auditado)).not.toContain('Texto del aviso');
  });

  it('un correo que ya salió o ya se canceló no se cancela', async () => {
    const enviado = await sembrar({ estado: 'enviado' });

    const respuesta = await cuenta.propietario.post(`/api/correos/${enviado}/cancelar`, { motivo: 'Tarde' });

    expect(respuesta.estado).toBe(409);
    expect(respuesta.cuerpo.error.codigo).toBe('correo_no_pendiente');
  });

  it('exige el motivo y no deja cancelar el de otra cuenta', async () => {
    const id = await sembrar({ estado: 'pendiente' });
    const ajeno = await sembrarCorreo({ cuentaId: otra.cuentaId, empresaId: otra.empresaId });

    const sinMotivo = await cuenta.propietario.post(`/api/correos/${id}/cancelar`, { motivo: '   ' });
    const deOtra = await cuenta.propietario.post(`/api/correos/${ajeno}/cancelar`, { motivo: 'Intento' });

    expect(sinMotivo.estado).toBe(400);
    expect(deOtra.estado).toBe(404);
    const [fila] = await comoPropietario<{ estado: string }>(
      'select estado from core.correos_salientes where id = $1',
      [ajeno],
    );
    expect(fila?.estado).toBe('pendiente');
  });
});

describe('reintentar un correo', () => {
  it('un fallido vuelve a la bandeja con los intentos en cero y queda en la auditoría', async () => {
    const id = await sembrar({ estado: 'fallido', codigoDeError: 'ETIMEDOUT' });

    const respuesta = await cuenta.propietario.post(`/api/correos/${id}/reintentar`, {});

    expect(respuesta.estado).toBe(200);
    expect(respuesta.cuerpo).toMatchObject({ estado: 'pendiente', intentos: 0 });
    const [fila] = await comoPropietario<{ ultimo_error_codigo: string | null }>(
      'select ultimo_error_codigo from core.correos_salientes where id = $1',
      [id],
    );
    expect(fila?.ultimo_error_codigo).toBeNull();
    const auditado = await comoPropietario<{ accion: string }>(
      `select accion from core.auditoria where recurso = 'core.correos_salientes' and registro_id = $1`,
      [id],
    );
    expect(auditado.map((a) => a.accion)).toEqual(['reabrir']);
  });

  it('un fallido con el contenido ya depurado no se reintenta', async () => {
    const id = await sembrar({ estado: 'fallido', depurado: true });

    const respuesta = await cuenta.propietario.post(`/api/correos/${id}/reintentar`, {});

    expect(respuesta.estado).toBe(409);
    expect(respuesta.cuerpo.error.codigo).toBe('correo_sin_contenido');
  });

  it('solo se reintenta lo que falló', async () => {
    const pendiente = await sembrar({ estado: 'pendiente' });

    const respuesta = await cuenta.propietario.post(`/api/correos/${pendiente}/reintentar`, {});

    expect(respuesta.estado).toBe(409);
    expect(respuesta.cuerpo.error.codigo).toBe('correo_no_reintentable');
  });
});

describe('bandeja global de Soporte', () => {
  it('solo la ve el superacceso', async () => {
    expect((await cuenta.propietario.get('/api/soporte/correo/bandeja')).estado).toBe(403);
    expect((await entorno.nuevoCliente().get('/api/soporte/correo/bandeja')).estado).toBe(401);
  });

  it('cuenta por estado todas las empresas y lista fallidos sin direcciones ni textos', async () => {
    await sembrarCorreo({
      cuentaId: otra.cuentaId,
      empresaId: otra.empresaId,
      estado: 'fallido',
      codigoDeError: '550',
    });

    const respuesta = await entorno.soporte.get('/api/soporte/correo/bandeja');

    expect(respuesta.estado).toBe(200);
    expect(Object.keys(respuesta.cuerpo.conteos).sort()).toEqual([
      'cancelado',
      'enviado',
      'enviando',
      'fallido',
      'pendiente',
    ]);
    expect(respuesta.cuerpo.conteos.fallido).toBeGreaterThanOrEqual(2);
    expect(respuesta.cuerpo.pendienteMasAntiguoDesde).not.toBeNull();
    const deLaOtra = respuesta.cuerpo.fallidosRecientes.find((f: { codigo: string }) => f.codigo === '550');
    expect(deLaOtra).toMatchObject({ empresa: expect.any(String), tipo: 'cuentas-por-pagar.aviso_de_pago' });
    expect(JSON.stringify(respuesta.cuerpo)).not.toMatch(/proveedor@ejemplo|Texto del aviso/);
  });
});
