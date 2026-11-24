/**
 * AFI-4: el escaneo firmado de la boleta de traslado (I-8 b): subir y reemplazar (foto o PDF), abrirlo con cabeceras
 * seguras, auditoría `adjuntar`, archivos inválidos, boleta inexistente o anulada, permisos y otra cuenta.
 */
import { createHash } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { configuracion } from '../configuracion.js';
import { hayQpdf } from '../modulos/core/archivos/pruebas/soporte-de-qpdf.js';
import type { ClienteApi } from './soporte/cliente-api.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUbicaciones, datosDeActivo } from './soporte/escenario-de-activos.js';
import { prepararBandeja, type EscenarioDeBandeja } from './soporte/escenario-de-bandeja-de-activos.js';
import { instalarDestinoFalso } from './soporte/escenario-de-documentos.js';
import { enDisco, pdf } from './soporte/escenarios-de-estado-de-cuenta.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import { crearArchivoDeTexto, crearImagenPng } from './soporte/imagenes.js';

const TRASLADOS = '/api/activos-fijos/traslados';
const entorno = usarEntornoApi();
let e: EscenarioDeBandeja;
let ajena: CuentaDePrueba;
let ubicacion: { localidadId: string; departamentoId: string };

const rutaDe = (grupoId: string) => `${TRASLADOS}/${grupoId}/firmada`;

/** Una boleta vigente con un activo nuevo; devuelve el `grupoId`. */
async function boletaVigente(): Promise<string> {
  const activo = await e.cuenta.propietario.post(
    '/api/activos-fijos/activos',
    datosDeActivo(e.claseVehiculosId, { fechaDeAdquisicion: '2026-09-01' }),
  );
  expect(activo.estado, JSON.stringify(activo.cuerpo)).toBe(201);
  const traslado = await e.cuenta.propietario.post(TRASLADOS, {
    fecha: '2026-10-05',
    ...ubicacion,
    responsable: 'Marta López',
    recibidoPor: 'Marta López',
    motivo: 'Entrega para su uso',
    renglones: [{ activoId: activo.cuerpo.id }],
  });
  expect(traslado.estado, JSON.stringify(traslado.cuerpo)).toBe(201);
  return traslado.cuerpo.grupoId as string;
}

const archivosDeBoletas = () =>
  comoPropietario<{ id: string; ruta_original: string }>(
    "select id, ruta_original from core.archivos where recurso_dueno = 'activos-fijos.traslados' and empresa_id = $1 order by creado_en",
    [e.cuenta.empresaId],
  );

const auditoriaDe = (grupoId: string) =>
  comoPropietario<{ anterior: { firmada: { sha256: string } | null } }>(
    "select anterior from core.auditoria where recurso = 'activos-fijos.traslados' and accion = 'adjuntar' and registro_id = $1 order by creado_en",
    [grupoId],
  );

const subir = (quien: ClienteApi, grupoId: string, archivo: Parameters<ClienteApi['subirImagen']>[2]) =>
  quien.subirImagen('POST', rutaDe(grupoId), archivo);

beforeAll(async () => {
  instalarDestinoFalso();
  e = await prepararBandeja(entorno, 'afiboletafirmada');
  ubicacion = await crearUbicaciones(e.cuenta);
  ajena = await darDeAltaCuenta(entorno, {
    nombre: 'Boleta firmada ajena',
    usuario: 'propietarioboletafirmadaajeno',
    modulos: ['terceros', 'libro-de-compras', 'activos-fijos'],
  });
});

afterAll(() => vi.restoreAllMocks());

describe('subir y abrir el escaneo firmado', () => {
  it('acepta una foto (queda webp), la boleta la muestra sin ruta ni id y la sirve con cabeceras seguras', async () => {
    const grupoId = await boletaVigente();

    const subida = await subir(e.cuenta.propietario, grupoId, await crearImagenPng(80, 60));

    expect(subida.estado, JSON.stringify(subida.cuerpo)).toBe(200);
    expect(subida.cuerpo).toMatchObject({ tipoMime: 'image/webp', paginas: null });
    expect(Object.keys(subida.cuerpo)).not.toContain('id');
    const boleta = await e.cuenta.propietario.get(`${TRASLADOS}/${grupoId}/boleta`);
    expect(boleta.cuerpo.firmada).toMatchObject({ tipoMime: 'image/webp' });
    const abierta = await e.cuenta.propietario.get(rutaDe(grupoId));
    expect(abierta.estado).toBe(200);
    expect(abierta.cabeceras['content-type']).toContain('image/webp');
    expect(abierta.cabeceras['content-disposition']).toBe('inline; filename="boleta-firmada.webp"');
    expect(abierta.cabeceras['cache-control']).toBe('private, no-store');
    expect(abierta.cabeceras['x-content-type-options']).toBe('nosniff');
  });

  it.skipIf(!hayQpdf)('acepta un PDF real y su huella es la del archivo recibido', async () => {
    const grupoId = await boletaVigente();
    const original = pdf('../../mi responsiva.pdf');

    const subida = await subir(e.cuenta.propietario, grupoId, original);

    expect(subida.estado, JSON.stringify(subida.cuerpo)).toBe(200);
    expect(subida.cuerpo).toMatchObject({
      tipoMime: 'application/pdf',
      paginas: 1,
      nombreOriginal: 'mi responsiva.pdf',
    });
    expect(subida.cuerpo.sha256).toBe(createHash('sha256').update(original.contenido).digest('hex'));
    const abierta = await e.cuenta.propietario.get(rutaDe(grupoId));
    expect(abierta.cabeceras['content-disposition']).toBe('inline; filename="boleta-firmada.pdf"');
  });

  it('el archivo no se sirve por /archivos/:id', async () => {
    const grupoId = await boletaVigente();
    await subir(e.cuenta.propietario, grupoId, await crearImagenPng());
    const archivos = await archivosDeBoletas();

    const respuesta = await e.cuenta.propietario.get(`/api/archivos/${archivos.at(-1)!.id}`);

    expect(respuesta.estado).toBe(404);
  });
});

describe('reemplazar', () => {
  it('borra el archivo anterior (fila y disco) y audita adjuntar con cómo estaba', async () => {
    const grupoId = await boletaVigente();
    const primera = await subir(e.cuenta.propietario, grupoId, await crearImagenPng(50, 50));
    const [antes] = await archivosDeBoletas().then((filas) => filas.slice(-1));

    const segunda = await subir(e.cuenta.propietario, grupoId, await crearImagenPng(90, 90));

    expect(segunda.estado).toBe(200);
    expect(await comoPropietario('select id from core.archivos where id = $1', [antes!.id])).toHaveLength(0);
    expect(enDisco(antes!.ruta_original)).toBe(false);
    const auditoria = await auditoriaDe(grupoId);
    expect(auditoria).toHaveLength(2);
    expect(auditoria[0]!.anterior.firmada).toBeNull();
    expect(auditoria[1]!.anterior.firmada!.sha256).toBe(primera.cuerpo.sha256);
  });

  it('anular la boleta no borra el escaneo firmado: sigue abriéndose', async () => {
    const grupoId = await boletaVigente();
    await subir(e.cuenta.propietario, grupoId, await crearImagenPng());

    const anulada = await e.cuenta.propietario.post(`${TRASLADOS}/${grupoId}/anular`, {
      motivo: 'Entregado por error',
    });

    expect(anulada.estado, JSON.stringify(anulada.cuerpo)).toBe(200);
    expect((await e.cuenta.propietario.get(rutaDe(grupoId))).estado).toBe(200);
  });
});

describe('lo que se rechaza', () => {
  it('algo que no es PDF ni foto responde 400 y no deja archivo ni auditoría', async () => {
    const grupoId = await boletaVigente();
    const antes = (await archivosDeBoletas()).length;
    const texto = { nombreArchivo: 'a.pdf', tipoMime: 'application/pdf', contenido: Buffer.from('no soy un pdf') };

    const respuesta = await subir(e.cuenta.propietario, grupoId, texto);
    const otro = await subir(e.cuenta.propietario, grupoId, crearArchivoDeTexto());

    expect([respuesta.estado, otro.estado]).toEqual([400, 400]);
    expect(await archivosDeBoletas()).toHaveLength(antes);
    expect(await auditoriaDe(grupoId)).toHaveLength(0);
  });

  it('sin archivo en la petición responde 400', async () => {
    const grupoId = await boletaVigente();

    const respuesta = await e.cuenta.propietario.enviarCrudo(
      rutaDe(grupoId),
      Buffer.from('--x--\r\n'),
      'multipart/form-data; boundary=x',
    );

    expect(respuesta.estado).toBe(400);
  });

  it('una boleta que no existe o ya está anulada responde boleta_inexistente', async () => {
    const anulada = await boletaVigente();
    await e.cuenta.propietario.post(`${TRASLADOS}/${anulada}/anular`, { motivo: 'Error de captura' });

    const deAnulada = await subir(e.cuenta.propietario, anulada, await crearImagenPng());
    const deNadie = await subir(e.cuenta.propietario, crypto.randomUUID(), await crearImagenPng());

    expect([deAnulada.estado, deNadie.estado]).toEqual([404, 404]);
    expect(deAnulada.cuerpo.error.codigo).toBe('boleta_inexistente');
    expect(deNadie.cuerpo.error.codigo).toBe('boleta_inexistente');
  });

  it('una anulación en curso gana: la subida que llega a la etapa final no deja escaneo en una boleta anulada', async () => {
    const grupoId = await boletaVigente();
    const anulando = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
    await anulando.connect();
    try {
      await anulando.query('begin');
      await anulando.query(
        "update activos_fijos.traslados set estado = 'anulado', anulado_en = now(), anulado_por = creado_por, motivo_de_anulacion = 'Prueba' where grupo_id = $1",
        [grupoId],
      );
      const subida = subir(e.cuenta.propietario, grupoId, await crearImagenPng());
      await new Promise((resolver) => setTimeout(resolver, 800));
      await anulando.query('commit');

      const respuesta = await subida;

      expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(404);
      expect(respuesta.cuerpo.error.codigo).toBe('boleta_inexistente');
    } finally {
      await anulando.end();
    }
    const filas = await comoPropietario('select 1 from activos_fijos.boletas_firmadas where grupo_id = $1', [grupoId]);
    expect(filas).toHaveLength(0);
  });

  it('abrir una boleta sin escaneo responde 404 boleta_sin_firmada', async () => {
    const grupoId = await boletaVigente();

    const respuesta = await e.cuenta.propietario.get(rutaDe(grupoId));

    expect(respuesta.estado).toBe(404);
    expect(respuesta.cuerpo.error.codigo).toBe('boleta_sin_firmada');
  });
});

describe('permisos y aislamiento', () => {
  it('subir exige traslados.crear y abrir exige activos.ver; sin sesión no hay acceso', async () => {
    const grupoId = await boletaVigente();
    const crea = await crearUsuarioConPermisos(entorno, e.cuenta, {
      nombres: 'Firmada Crea',
      apellidos: 'Solo',
      permisos: ['activos-fijos.traslados.crear'],
    });
    const ve = await crearUsuarioConPermisos(entorno, e.cuenta, {
      nombres: 'Firmada Ve',
      apellidos: 'Solo',
      permisos: ['activos-fijos.activos.ver'],
    });

    const creaSube = await subir(crea, grupoId, await crearImagenPng());
    const creaAbre = await crea.get(rutaDe(grupoId));
    const veSube = await subir(ve, grupoId, await crearImagenPng());
    const veAbre = await ve.get(rutaDe(grupoId));

    expect(creaSube.estado, JSON.stringify(creaSube.cuerpo)).toBe(200);
    expect([creaAbre.estado, veSube.estado, veAbre.estado]).toEqual([403, 403, 200]);
    expect(await auditoriaDe(grupoId)).toHaveLength(1);
  });

  it('otra cuenta no puede subir ni abrir la boleta', async () => {
    const grupoId = await boletaVigente();
    await subir(e.cuenta.propietario, grupoId, await crearImagenPng());

    const sube = await subir(ajena.propietario, grupoId, await crearImagenPng());
    const abre = await ajena.propietario.get(rutaDe(grupoId));

    expect([sube.estado, abre.estado]).toEqual([404, 404]);
  });
});
