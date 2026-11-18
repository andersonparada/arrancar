/**
 * EM-2.5: el balance de apertura firmado (solo PDF, opcional): subir, reemplazar y quitar con la carga abierta; con la
 * carga cerrada solo se sube si falta; la foto se rechaza sin dejar nada; el cierre guarda su huella; seguridad.
 */
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { configuracion } from '../configuracion.js';
import { pdfDePrueba } from '../modulos/core/archivos/pruebas/pdfs-de-prueba.js';
import { hayQpdf, transformarConQpdf } from '../modulos/core/archivos/pruebas/soporte-de-qpdf.js';
import { dependenciasCompartidas } from '../modulos/core/compartido/infraestructura/dependencias-compartidas.js';
import type { ClienteApi } from './soporte/cliente-api.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import { crearImagenPng, type Imagen } from './soporte/imagenes.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let otraEmpresaId: string;
let ajena: CuentaDePrueba;
let soloCierra: ClienteApi;
let soloVeCierres: ClienteApi;

const base = (empresaId: string) => `/api/empresas/${empresaId}/carga-inicial`;
const rutaDelBalance = (empresaId: string) => `${base(empresaId)}/balance-de-apertura`;
const pdf = (nombre = 'balance.pdf', paginas = 1): Imagen => ({
  nombreArchivo: nombre,
  tipoMime: 'application/pdf',
  contenido: pdfDePrueba({ paginas }),
});
const subir = (usuario: ClienteApi, empresaId: string, archivo: Imagen) =>
  usuario.subirImagen('POST', rutaDelBalance(empresaId), archivo);
const cerrar = (empresaId: string) => cuenta.propietario.post(`${base(empresaId)}/cerrar`, {});
const reabrir = (empresaId: string) =>
  cuenta.propietario.post(`${base(empresaId)}/reabrir`, { motivo: 'Cambiar el balance adjunto' });
const archivosDeBalance = (empresaId: string) =>
  comoPropietario<{ id: string; ruta_original: string; sha256: string }>(
    `select id, ruta_original, sha256 from core.archivos where recurso_dueno = 'empresas.cargas-iniciales' and empresa_id = $1`,
    [empresaId],
  );
function archivosEnDisco(): number {
  const contar = (carpeta: string): number =>
    readdirSync(carpeta, { withFileTypes: true }).reduce(
      (total, entrada) => total + (entrada.isDirectory() ? contar(resolve(carpeta, entrada.name)) : 1),
      0,
    );
  return contar(resolve(configuracion.RUTA_ALMACENAMIENTO));
}

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Balance', usuario: 'propietariobalance' });
  ajena = await darDeAltaCuenta(entorno, { nombre: 'Balance ajena', usuario: 'propietariobalanceajena' });
  otraEmpresaId = (await cuenta.propietario.post('/api/empresas', { nombre: 'Parcela Balance' })).cuerpo.id;
  soloCierra = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Cierra',
    apellidos: 'Balance',
    permisos: ['empresas.ver', 'empresas.carga-inicial.cerrar'],
  });
  soloVeCierres = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Ve',
    apellidos: 'Balance',
    permisos: ['empresas.ver', 'empresas.carga-inicial.ver-cierres'],
  });
  for (const empresaId of [cuenta.empresaId, otraEmpresaId]) {
    await cuenta.propietario.put(base(empresaId), { fechaDeInicio: '2026-01-01' });
  }
});

describe.skipIf(!hayQpdf)('con la carga abierta', () => {
  it('sube un PDF real: el DTO describe el balance sin ruta ni id, y el archivo tiene dueño', async () => {
    const respuesta = await subir(cuenta.propietario, cuenta.empresaId, pdf('balance.pdf', 2));
    const archivos = await archivosDeBalance(cuenta.empresaId);

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo.balanceDeApertura).toEqual({
      tamanoBytes: expect.any(Number),
      paginas: 2,
      sha256: archivos[0]!.sha256,
      nombreOriginal: 'balance.pdf',
      subidoEn: expect.any(String),
      subidoPorNombre: 'Dueño Balance',
    });
    expect(JSON.stringify(respuesta.cuerpo)).not.toContain(archivos[0]!.id);
    expect(JSON.stringify(respuesta.cuerpo)).not.toContain(archivos[0]!.ruta_original);
    expect((await cuenta.propietario.get(base(cuenta.empresaId))).cuerpo.balanceDeApertura.paginas).toBe(2);
  });

  it('GET /archivos/:id con ese id responde 404 y el PDF solo se abre por la ruta de Empresas, con sus cabeceras', async () => {
    const [archivo] = await archivosDeBalance(cuenta.empresaId);

    const porArchivos = await cuenta.propietario.get(`/api/archivos/${archivo!.id}`);
    const abierto = await cuenta.propietario.get(rutaDelBalance(cuenta.empresaId));

    expect(porArchivos.estado).toBe(404);
    expect(abierto.estado).toBe(200);
    expect(abierto.cabeceras['content-type']).toContain('application/pdf');
    expect(abierto.cabeceras['content-disposition']).toBe('inline; filename="balance-de-apertura-2026-01-01.pdf"');
    expect(abierto.cabeceras['cache-control']).toBe('private, no-store');
    expect(String(abierto.cuerpo).startsWith('%PDF')).toBe(true);
  });

  it('reemplazar borra el anterior (fila y disco) y audita `quitar` con cómo era', async () => {
    const [anterior] = await archivosDeBalance(cuenta.empresaId);

    const respuesta = await subir(cuenta.propietario, cuenta.empresaId, pdf('nuevo.pdf', 3));
    const archivos = await archivosDeBalance(cuenta.empresaId);
    const [auditoria] = await comoPropietario<{ anterior: { balanceDeApertura: { paginas: number } } }>(
      `select anterior from core.auditoria where recurso = 'empresas.cargas-iniciales' and accion = 'quitar' and empresa_id = $1`,
      [cuenta.empresaId],
    );

    expect(respuesta.cuerpo.balanceDeApertura).toMatchObject({ paginas: 3, nombreOriginal: 'nuevo.pdf' });
    expect(archivos).toHaveLength(1);
    expect(archivos[0]!.id).not.toBe(anterior!.id);
    expect(auditoria!.anterior.balanceDeApertura.paginas).toBe(2);
  });

  it('quitar borra el archivo y audita; sin balance responde 404', async () => {
    const quitado = await cuenta.propietario.delete(rutaDelBalance(cuenta.empresaId));
    const otraVez = await cuenta.propietario.delete(rutaDelBalance(cuenta.empresaId));
    const abrir = await cuenta.propietario.get(rutaDelBalance(cuenta.empresaId));

    expect(quitado.cuerpo.balanceDeApertura).toBeNull();
    expect(await archivosDeBalance(cuenta.empresaId)).toEqual([]);
    expect(otraVez.estado).toBe(404);
    expect(abrir.estado).toBe(404);
    const auditorias = await comoPropietario(
      `select 1 from core.auditoria where recurso = 'empresas.cargas-iniciales' and accion = 'quitar' and empresa_id = $1`,
      [cuenta.empresaId],
    );
    expect(auditorias).toHaveLength(2);
  });

  it('se sube a una empresa que no es la activa, y otra empresa o una ajena responde 404', async () => {
    const enOtra = await subir(cuenta.propietario, otraEmpresaId, pdf());
    const enAjena = await subir(cuenta.propietario, ajena.empresaId, pdf());
    const abrirAjena = await cuenta.propietario.get(rutaDelBalance(ajena.empresaId));

    expect(enOtra.estado).toBe(200);
    expect(enOtra.cuerpo.empresaId).toBe(otraEmpresaId);
    expect((await archivosDeBalance(otraEmpresaId)).length).toBe(1);
    expect(enAjena.estado).toBe(404);
    expect(abrirAjena.estado).toBe(404);
  });
});

describe('lo que no se acepta', () => {
  it('una foto responde balance_de_apertura_no_es_pdf y no deja archivo ni en la base ni en el disco', async () => {
    const enDiscoAntes = archivosEnDisco();
    const filasAntes = (await archivosDeBalance(cuenta.empresaId)).length;

    const respuesta = await subir(cuenta.propietario, cuenta.empresaId, await crearImagenPng(64, 48));
    await new Promise((resolver) => setTimeout(resolver, 200));

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error.codigo).toBe('balance_de_apertura_no_es_pdf');
    expect(respuesta.cuerpo.error.mensaje).toContain('escanéelo como PDF');
    expect((await archivosDeBalance(cuenta.empresaId)).length).toBe(filasAntes);
    expect(archivosEnDisco()).toBe(enDiscoAntes);
  });

  it.skipIf(!hayQpdf)('un PDF con JavaScript o con contraseña responde con los errores del core', async () => {
    const conJs = pdfDePrueba({ catalogo: '/OpenAction << /S /JavaScript /JS (app.alert(1)) >>' });
    const cifrado = transformarConQpdf(pdfDePrueba(), ['--encrypt', 'clave', 'clave', '256', '--']);

    const js = await subir(cuenta.propietario, cuenta.empresaId, { ...pdf(), contenido: conJs });
    const contrasena = await subir(cuenta.propietario, cuenta.empresaId, { ...pdf(), contenido: cifrado });

    expect([js.estado, js.cuerpo.error.codigo]).toEqual([400, 'pdf_con_contenido_activo']);
    expect([contrasena.estado, contrasena.cuerpo.error.codigo]).toEqual([400, 'pdf_con_contrasena']);
  });

  it('sin fecha de inicio no se adjunta nada', async () => {
    const nueva = (await cuenta.propietario.post('/api/empresas', { nombre: 'Sin fecha' })).cuerpo.id;

    const respuesta = await subir(cuenta.propietario, nueva, pdf());

    expect(respuesta.cuerpo.error.codigo).toBe('fecha_de_inicio_requerida');
  });
});

describe.skipIf(!hayQpdf)('con la carga cerrada', () => {
  it('con balance: la guardia corta antes de gastar qpdf, y reemplazar o quitar dan 422', async () => {
    await subir(cuenta.propietario, cuenta.empresaId, pdf('firmado.pdf'));
    const cierre = await cerrar(cuenta.empresaId);
    const revisar = vi.spyOn(dependenciasCompartidas().documentos, 'revisar');

    const reemplazo = await subir(cuenta.propietario, cuenta.empresaId, pdf('otro.pdf'));
    const quitado = await cuenta.propietario.delete(rutaDelBalance(cuenta.empresaId));
    const llamadasAQpdf = revisar.mock.calls.length;
    revisar.mockRestore();

    expect(cierre.cuerpo.cerrada).toBe(true);
    expect([reemplazo.estado, reemplazo.cuerpo.error.codigo]).toEqual([422, 'balance_de_apertura_fijo']);
    expect([quitado.estado, quitado.cuerpo.error.codigo]).toEqual([422, 'balance_de_apertura_fijo']);
    expect(llamadasAQpdf).toBe(0);
    expect(await archivosDeBalance(cuenta.empresaId)).toHaveLength(1);
  });

  it('el cierre guardó el sha256 del balance que lo respaldó, aunque después se reabra', async () => {
    const [archivo] = await archivosDeBalance(cuenta.empresaId);
    const [cierre] = await comoPropietario<{
      anterior: { balanceDeApertura: { sha256: string; nombreOriginal: string } };
    }>(`select anterior from core.auditoria where accion = 'cerrar' and empresa_id = $1`, [cuenta.empresaId]);

    expect(cierre!.anterior.balanceDeApertura).toMatchObject({
      sha256: archivo!.sha256,
      nombreOriginal: 'firmado.pdf',
    });
    const reabierta = await reabrir(cuenta.empresaId);
    expect(reabierta.cuerpo.balanceDeApertura).not.toBeNull();
  });

  it('cerrada y sin balance se puede subir uno (el firmado suele llegar después)', async () => {
    const empresaId = otraEmpresaId;
    await cuenta.propietario.delete(rutaDelBalance(empresaId));
    await cerrar(empresaId);

    const tarde = await subir(cuenta.propietario, empresaId, pdf('tarde.pdf'));

    expect(tarde.estado).toBe(200);
    expect(tarde.cuerpo).toMatchObject({ cerrada: true, balanceDeApertura: { nombreOriginal: 'tarde.pdf' } });
  });
});

describe('permisos', () => {
  it('subir y quitar piden cerrar; abrir pide ver-cierres', async () => {
    expect((await subir(soloVeCierres, cuenta.empresaId, pdf())).estado).toBe(403);
    expect((await soloVeCierres.delete(rutaDelBalance(cuenta.empresaId))).estado).toBe(403);
    expect((await soloCierra.get(rutaDelBalance(cuenta.empresaId))).estado).toBe(403);
    expect((await soloVeCierres.get(rutaDelBalance(cuenta.empresaId))).estado).not.toBe(403);
  });
});
