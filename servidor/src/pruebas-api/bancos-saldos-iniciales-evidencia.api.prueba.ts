/**
 * BS-9: la evidencia de la apertura por API (subir, abrir, reemplazar y quitar; tipos y huella; auditoría `quitar`; el
 * hallazgo `sin_evidencia`; carga cerrada; permisos y otra empresa).
 */
import { createHash } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { hayQpdf } from '../modulos/core/archivos/pruebas/soporte-de-qpdf.js';
import type { ClienteApi } from './soporte/cliente-api.js';
import { empresaConInicio, guardarSaldo, fichaDe, RUTA_DE_APERTURA } from './soporte/apertura-por-api.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearCuentaSinSaldo } from './soporte/escenarios-de-apertura.js';
import { enDisco, pdf } from './soporte/escenarios-de-estado-de-cuenta.js';
import { crearUsuarioConPermisos, type CuentaDePrueba } from './soporte/escenarios.js';
import { crearImagenPng, type Imagen } from './soporte/imagenes.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let otra: CuentaDePrueba;
const usuario = () => cuenta.propietario;

const rutaDe = (cuentaId: string) => `${RUTA_DE_APERTURA}/${cuentaId}/evidencia`;
const subir = (quien: ClienteApi, cuentaId: string, archivo: Imagen) =>
  quien.subirImagen('PUT', rutaDe(cuentaId), archivo);

async function cuentaConSaldo(): Promise<string> {
  const id = await crearCuentaSinSaldo(usuario());
  expect((await guardarSaldo(usuario(), id, '1000.00')).estado).toBe(200);
  return id;
}

/** Los archivos de evidencia de la empresa, vistos como propietario de la base (sin RLS). */
const archivosDeEvidencia = (empresaId: string) =>
  comoPropietario<{ id: string; ruta_original: string }>(
    "select id, ruta_original from core.archivos where recurso_dueno = 'bancos.saldos-iniciales' and empresa_id = $1",
    [empresaId],
  );

async function hallazgosSinEvidencia(cuentaId: string): Promise<number> {
  const revision = await usuario().get(`${RUTA_DE_APERTURA}/revision-de-cierre`);
  expect(revision.estado).toBe(200);
  const lista = revision.cuerpo as Array<{ codigo: string; cuentaBancariaId: string }>;
  return lista.filter((h) => h.codigo === 'sin_evidencia' && h.cuentaBancariaId === cuentaId).length;
}

beforeAll(async () => {
  cuenta = await empresaConInicio(entorno, { nombre: 'Evidencia apertura', usuario: 'propietarioevidenciaaper' });
  otra = await empresaConInicio(entorno, { nombre: 'Otra evidencia', usuario: 'otraevidenciaaper' });
});

describe('subir y abrir la evidencia', () => {
  it('acepta una foto (queda webp), la ficha la muestra sin ruta ni id y el hallazgo sin_evidencia desaparece', async () => {
    const cuentaId = await cuentaConSaldo();
    expect(await hallazgosSinEvidencia(cuentaId)).toBe(1);

    const subida = await subir(usuario(), cuentaId, await crearImagenPng(80, 60));

    expect(subida.estado, JSON.stringify(subida.cuerpo)).toBe(200);
    expect(subida.cuerpo).toMatchObject({ tipoMime: 'image/webp', paginas: null });
    expect(Object.keys(subida.cuerpo)).not.toContain('id');
    const ficha = await fichaDe(usuario(), cuentaId);
    expect(ficha.tieneEvidencia).toBe(true);
    expect(ficha.evidencia).toMatchObject({ tipoMime: 'image/webp' });
    expect(await hallazgosSinEvidencia(cuentaId)).toBe(0);
  });

  it('la sirve con cabeceras seguras y un nombre armado por el servidor', async () => {
    const cuentaId = await cuentaConSaldo();
    await subir(usuario(), cuentaId, await crearImagenPng());

    const abierta = await usuario().get(rutaDe(cuentaId));

    expect(abierta.estado).toBe(200);
    expect(abierta.cabeceras['content-type']).toContain('image/webp');
    expect(abierta.cabeceras['content-disposition']).toBe('inline; filename="evidencia-de-apertura.webp"');
    expect(abierta.cabeceras['cache-control']).toBe('private, no-store');
    expect(abierta.cabeceras['x-content-type-options']).toBe('nosniff');
  });

  it.skipIf(!hayQpdf)('acepta un PDF real y su huella es la del archivo recibido', async () => {
    const cuentaId = await cuentaConSaldo();
    const original = pdf('../../mi conciliacion.pdf');

    const subida = await subir(usuario(), cuentaId, original);

    expect(subida.estado, JSON.stringify(subida.cuerpo)).toBe(200);
    expect(subida.cuerpo).toMatchObject({
      tipoMime: 'application/pdf',
      paginas: 1,
      nombreOriginal: 'mi conciliacion.pdf',
    });
    expect(subida.cuerpo.sha256).toBe(createHash('sha256').update(original.contenido).digest('hex'));
    const abierta = await usuario().get(rutaDe(cuentaId));
    expect(abierta.cabeceras['content-disposition']).toBe('inline; filename="evidencia-de-apertura.pdf"');
  });

  it('sin archivo el GET responde 404; algo que no es PDF ni foto, 400; sin saldo inicial, 404', async () => {
    const cuentaId = await cuentaConSaldo();
    expect((await usuario().get(rutaDe(cuentaId))).estado).toBe(404);

    const texto = { nombreArchivo: 'a.pdf', tipoMime: 'application/pdf', contenido: Buffer.from('no soy un pdf') };
    expect((await subir(usuario(), cuentaId, texto)).estado).toBe(400);

    const sinSaldo = await crearCuentaSinSaldo(usuario());
    expect((await subir(usuario(), sinSaldo, await crearImagenPng())).estado).toBe(404);
  });

  it('el archivo no se sirve por /archivos/:id', async () => {
    const cuentaId = await cuentaConSaldo();
    await subir(usuario(), cuentaId, await crearImagenPng());
    const [archivo] = await archivosDeEvidencia(cuenta.empresaId);

    expect((await usuario().get(`/api/archivos/${archivo!.id}`)).estado).toBe(404);
  });
});

describe('reemplazar, quitar y eliminar el saldo inicial', () => {
  it('reemplazar borra el anterior (fila y disco) y audita quitar con sus datos', async () => {
    const cuentaId = await cuentaConSaldo();
    const primera = await subir(usuario(), cuentaId, await crearImagenPng(50, 50));
    const [antes] = await comoPropietario<{ id: string; ruta_original: string }>(
      "select id, ruta_original from core.archivos where recurso_dueno = 'bancos.saldos-iniciales' and empresa_id = $1 order by creado_en desc limit 1",
      [cuenta.empresaId],
    );

    const segunda = await subir(usuario(), cuentaId, await crearImagenPng(90, 90));

    expect(segunda.estado).toBe(200);
    expect(await comoPropietario('select id from core.archivos where id = $1', [antes!.id])).toHaveLength(0);
    expect(enDisco(antes!.ruta_original)).toBe(false);
    const auditoria = await comoPropietario<{ anterior: { evidencia: { sha256: string } } }>(
      "select anterior from core.auditoria where recurso = 'bancos.saldos-iniciales' and accion = 'quitar' and registro_id = (select id::text from bancos.saldos_iniciales where cuenta_bancaria_id = $1)",
      [cuentaId],
    );
    expect(auditoria).toHaveLength(1);
    expect(auditoria[0]!.anterior.evidencia.sha256).toBe(primera.cuerpo.sha256);
  });

  it('quitar responde 204, borra el archivo, audita y el hallazgo vuelve; quitar de nuevo, 404', async () => {
    const cuentaId = await cuentaConSaldo();
    await subir(usuario(), cuentaId, await crearImagenPng());

    const quitada = await usuario().delete(rutaDe(cuentaId));

    expect(quitada.estado).toBe(204);
    expect((await fichaDe(usuario(), cuentaId)).tieneEvidencia).toBe(false);
    expect(await hallazgosSinEvidencia(cuentaId)).toBe(1);
    expect((await usuario().delete(rutaDe(cuentaId))).estado).toBe(404);
    const auditoria = await comoPropietario(
      "select 1 from core.auditoria where recurso = 'bancos.saldos-iniciales' and accion = 'quitar' and registro_id = (select id::text from bancos.saldos_iniciales where cuenta_bancaria_id = $1)",
      [cuentaId],
    );
    expect(auditoria).toHaveLength(1);
  });

  it('eliminar el saldo inicial borra también el archivo de la evidencia', async () => {
    const cuentaId = await cuentaConSaldo();
    await subir(usuario(), cuentaId, await crearImagenPng());
    const antes = (await archivosDeEvidencia(cuenta.empresaId)).length;

    const eliminado = await usuario().delete(`${RUTA_DE_APERTURA}/${cuentaId}`, { motivo: 'Se cargó en otra cuenta' });

    expect(eliminado.estado, JSON.stringify(eliminado.cuerpo)).toBe(204);
    expect(await archivosDeEvidencia(cuenta.empresaId)).toHaveLength(antes - 1);
  });
});

describe('carga cerrada, permisos y otra empresa', () => {
  it('con la carga cerrada subir y quitar se rechazan (422) y la evidencia sigue', async () => {
    const cerrada = await empresaConInicio(entorno, { nombre: 'Evidencia cerrada', usuario: 'propevidenciacerrada' });
    const yo = cerrada.propietario;
    const cuentaId = await crearCuentaSinSaldo(yo);
    await guardarSaldo(yo, cuentaId, { saldoSegunEstadoDeCuenta: '100.00', saldoSegunLibrosAnteriores: '100.00' });
    expect((await subir(yo, cuentaId, await crearImagenPng())).estado).toBe(200);
    const cierre = await yo.post(`/api/empresas/${cerrada.empresaId}/carga-inicial/cerrar`, {});
    expect(cierre.estado, JSON.stringify(cierre.cuerpo)).toBe(200);

    const subida = await subir(yo, cuentaId, await crearImagenPng());
    const quitada = await yo.delete(rutaDe(cuentaId));

    for (const intento of [subida, quitada]) {
      expect(intento.estado).toBe(422);
      expect(intento.cuerpo.error.codigo).toBe('carga_inicial_cerrada');
    }
    expect((await yo.get(rutaDe(cuentaId))).estado).toBe(200);
  });

  it('abrir exige ver y subir o quitar exigen editar (403)', async () => {
    const cuentaId = await cuentaConSaldo();
    await subir(usuario(), cuentaId, await crearImagenPng());
    const con = (nombres: string, accion: string) =>
      crearUsuarioConPermisos(entorno, cuenta, {
        nombres,
        apellidos: 'Evidencia',
        permisos: [`bancos.saldos-iniciales.${accion}`],
      });
    const [soloVer, soloEditar, soloCrear] = [
      await con('Solo ver', 'ver'),
      await con('Solo editar', 'editar'),
      await con('Solo crear', 'crear'),
    ];

    expect((await soloVer.get(rutaDe(cuentaId))).estado).toBe(200);
    expect((await subir(soloVer, cuentaId, await crearImagenPng())).estado).toBe(403);
    expect((await soloVer.delete(rutaDe(cuentaId))).estado).toBe(403);
    expect((await soloEditar.get(rutaDe(cuentaId))).estado).toBe(403);
    expect((await subir(soloCrear, cuentaId, await crearImagenPng())).estado).toBe(403);
    expect((await soloEditar.delete(rutaDe(cuentaId))).estado).toBe(204);
  });

  it('otra empresa recibe 404 al abrir, subir y quitar', async () => {
    const cuentaId = await cuentaConSaldo();
    await subir(usuario(), cuentaId, await crearImagenPng());

    expect((await otra.propietario.get(rutaDe(cuentaId))).estado).toBe(404);
    expect((await subir(otra.propietario, cuentaId, await crearImagenPng())).estado).toBe(404);
    expect((await otra.propietario.delete(rutaDe(cuentaId))).estado).toBe(404);
  });
});
