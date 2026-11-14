import { beforeAll, describe, expect, it } from 'vitest';
import { hayQpdf } from '../modulos/core/archivos/pruebas/soporte-de-qpdf.js';
import type { ClienteApi } from './soporte/cliente-api.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import {
  archivosDelEstadoDeCuenta,
  enDisco,
  iniciarConciliacionConSaldo,
  pdf,
} from './soporte/escenarios-de-estado-de-cuenta.js';
import { crearImagenPng, type Imagen } from './soporte/imagenes.js';

const entorno = usarEntornoApi();
const VARIABLE = 'bancos.conciliaciones.exigir_estado_de_cuenta';
let cuenta: CuentaDePrueba;
let otra: CuentaDePrueba;
let propietario: ClienteApi;
let autoriza: ClienteApi;
let soloVer: ClienteApi;
let muchasSubidas: ClienteApi;

const rutaDe = (id: string) => `/api/bancos/conciliaciones/${id}`;
const iniciar = (nombre: string) => iniciarConciliacionConSaldo(propietario, nombre);
const subir = (usuario: ClienteApi, id: string, archivo: Imagen) =>
  usuario.subirImagen('POST', `${rutaDe(id)}/estado-de-cuenta`, archivo);
async function exigirArchivo(valor: boolean): Promise<void> {
  await entorno.soporte.put('/api/sesion/empresa-activa', { empresaId: cuenta.empresaId });
  const cambio = await entorno.soporte.put(`/api/configuracion/${VARIABLE}`, { nivel: 'empresa', valor });
  expect(cambio.estado).toBe(204);
}

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Estado de cuenta',
    usuario: 'propestadocuenta',
    modulos: ['bancos'],
  });
  otra = await darDeAltaCuenta(entorno, { nombre: 'Otra de estado', usuario: 'otraestadocuenta', modulos: ['bancos'] });
  propietario = cuenta.propietario;
  autoriza = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Autoriza',
    apellidos: 'Estado',
    permisos: ['bancos.conciliaciones.ver', 'bancos.conciliaciones.autorizar'],
  });
  soloVer = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Solo',
    apellidos: 'Ver',
    permisos: ['bancos.conciliaciones.ver'],
  });
  muchasSubidas = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Muchas',
    apellidos: 'Subidas',
    permisos: ['bancos.conciliaciones.ver', 'bancos.conciliaciones.conciliar'],
  });
});

describe('subir y abrir el estado de cuenta', () => {
  it.skipIf(!hayQpdf)(
    'acepta un PDF real y lo sirve con cabeceras seguras y un nombre armado por el servidor',
    async () => {
      const id = await iniciar('PDF real');

      const subida = await subir(propietario, id, pdf('../../mi estado.pdf'));

      expect(subida.estado).toBe(200);
      expect(subida.cuerpo.estadoDeCuenta).toMatchObject({
        tipoMime: 'application/pdf',
        paginas: 1,
        nombreOriginal: 'mi estado.pdf',
      });
      expect(subida.cuerpo.estadoDeCuenta.sha256).toHaveLength(64);
      expect(Object.keys(subida.cuerpo.estadoDeCuenta)).not.toContain('id');
      const abierto = await autoriza.get(`${rutaDe(id)}/estado-de-cuenta`);
      expect(abierto.estado).toBe(200);
      expect(abierto.cabeceras['content-type']).toContain('application/pdf');
      expect(abierto.cabeceras['content-disposition']).toBe('inline; filename="estado-de-cuenta-2026-01.pdf"');
      expect(abierto.cabeceras['cache-control']).toBe('private, no-store');
      expect(abierto.cabeceras['x-content-type-options']).toBe('nosniff');
    },
  );

  it('acepta una foto (queda como webp) y la lista marca tieneEstadoDeCuenta', async () => {
    const id = await iniciar('Foto');
    const cuentaBancariaId = (await propietario.get(rutaDe(id))).cuerpo.cuentaBancariaId;

    const subida = await subir(propietario, id, await crearImagenPng(80, 60));

    expect(subida.estado).toBe(200);
    expect(subida.cuerpo.estadoDeCuenta).toMatchObject({ tipoMime: 'image/webp', paginas: null });
    const abierto = await propietario.get(`${rutaDe(id)}/estado-de-cuenta`);
    expect(abierto.cabeceras['content-disposition']).toBe('inline; filename="estado-de-cuenta-2026-01.webp"');
    const lista = await propietario.get(`/api/bancos/cuentas-bancarias/${cuentaBancariaId}/conciliaciones`);
    expect(lista.cuerpo[0].tieneEstadoDeCuenta).toBe(true);
  });

  it('sin archivo el GET responde 404; un archivo que no es PDF ni foto, 400', async () => {
    const id = await iniciar('Sin archivo');
    expect((await propietario.get(`${rutaDe(id)}/estado-de-cuenta`)).estado).toBe(404);

    const texto = { nombreArchivo: 'a.pdf', tipoMime: 'application/pdf', contenido: Buffer.from('no soy un pdf') };
    expect((await subir(propietario, id, texto)).estado).toBe(400);
  });

  it('otra empresa recibe 404 al abrir, subir y quitar', async () => {
    const id = await iniciar('Ajena');
    await subir(propietario, id, await crearImagenPng());

    expect((await otra.propietario.get(`${rutaDe(id)}/estado-de-cuenta`)).estado).toBe(404);
    expect((await subir(otra.propietario, id, await crearImagenPng())).estado).toBe(404);
    expect((await otra.propietario.delete(`${rutaDe(id)}/estado-de-cuenta`)).estado).toBe(404);
  });

  it('exige ver para abrir (403) y conciliar para subir y quitar (403)', async () => {
    const id = await iniciar('Permisos');
    await subir(propietario, id, await crearImagenPng());
    const sinNada = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Sin',
      apellidos: 'Nada',
      permisos: ['bancos.cuentas-bancarias.ver'],
    });

    expect((await sinNada.get(`${rutaDe(id)}/estado-de-cuenta`)).estado).toBe(403);
    expect((await soloVer.get(`${rutaDe(id)}/estado-de-cuenta`)).estado).toBe(200);
    expect((await subir(soloVer, id, await crearImagenPng())).estado).toBe(403);
    expect((await subir(autoriza, id, await crearImagenPng())).estado).toBe(403);
    expect((await autoriza.delete(`${rutaDe(id)}/estado-de-cuenta`)).estado).toBe(403);
  });

  it('GET /archivos/:id no sirve el archivo del estado de cuenta', async () => {
    const id = await iniciar('Sin acceso directo');
    await subir(propietario, id, await crearImagenPng());
    const [archivo] = await archivosDelEstadoDeCuenta(cuenta.empresaId);

    expect((await propietario.get(`/api/archivos/${archivo!.id}`)).estado).toBe(404);
  });

  it('en una conciliación elaborada no se sube ni se quita (422)', async () => {
    const id = await iniciar('Elaborada');
    await subir(propietario, id, await crearImagenPng());
    await exigirArchivo(true);
    expect((await propietario.post(`${rutaDe(id)}/terminar`, {})).estado).toBe(200);

    const rechazada = await subir(propietario, id, await crearImagenPng());
    expect(rechazada.estado).toBe(422);
    expect(rechazada.cuerpo.error.codigo).toBe('conciliacion_no_esta_en_proceso');
    expect((await propietario.delete(`${rutaDe(id)}/estado-de-cuenta`)).estado).toBe(422);
  });
});

describe('reemplazar y quitar', () => {
  it('reemplazar borra el anterior (fila y disco) y deja la auditoría con su huella', async () => {
    const id = await iniciar('Reemplazo');
    const primera = await subir(propietario, id, await crearImagenPng(50, 50));
    const [antes] = await comoPropietario<{ id: string; ruta_original: string }>(
      "select id, ruta_original from core.archivos where recurso_dueno = 'bancos.conciliaciones' and nombre_original = 'prueba.png' order by creado_en desc limit 1",
      [],
    );
    expect(enDisco(antes!.ruta_original)).toBe(true);

    const segunda = await subir(propietario, id, await crearImagenPng(90, 90));

    expect(segunda.estado).toBe(200);
    const filas = await comoPropietario<{ id: string }>('select id from core.archivos where id = $1', [antes!.id]);
    expect(filas).toHaveLength(0);
    expect(enDisco(antes!.ruta_original)).toBe(false);
    const auditoria = await comoPropietario<{ anterior: { estadoDeCuenta: { sha256: string } } }>(
      "select anterior from core.auditoria where recurso = 'bancos.conciliaciones' and accion = 'quitar' and registro_id = $1",
      [id],
    );
    expect(auditoria).toHaveLength(1);
    expect(auditoria[0]!.anterior.estadoDeCuenta.sha256).toBe(primera.cuerpo.estadoDeCuenta.sha256);
  });

  it('quitar borra el archivo y audita; quitar de nuevo responde 404', async () => {
    const id = await iniciar('Quitar');
    await subir(propietario, id, await crearImagenPng());

    const quitado = await propietario.delete(`${rutaDe(id)}/estado-de-cuenta`);

    expect(quitado.estado).toBe(200);
    expect(quitado.cuerpo.estadoDeCuenta).toBeNull();
    expect((await propietario.delete(`${rutaDe(id)}/estado-de-cuenta`)).estado).toBe(404);
    const auditoria = await comoPropietario(
      "select 1 from core.auditoria where recurso = 'bancos.conciliaciones' and accion = 'quitar' and registro_id = $1",
      [id],
    );
    expect(auditoria).toHaveLength(1);
  });

  it('dos subidas a la vez dejan un solo archivo', async () => {
    const id = await iniciar('A la vez');
    const antes = (await archivosDelEstadoDeCuenta(cuenta.empresaId)).length;

    const [uno, dos] = await Promise.all([
      subir(propietario, id, await crearImagenPng(40, 40)),
      subir(propietario, id, await crearImagenPng(60, 60)),
    ]);

    expect([uno.estado, dos.estado]).toEqual([200, 200]);
    const despues = await archivosDelEstadoDeCuenta(cuenta.empresaId);
    expect(despues).toHaveLength(antes + 1);
    expect(despues.every((a) => enDisco(a.ruta_original))).toBe(true);
  });
});

describe('terminar y eliminar con el estado de cuenta', () => {
  it('con la variable en true (por omisión) sin archivo responde 400; en false pasa', async () => {
    const id = await iniciar('Variable');
    await exigirArchivo(true);

    const rechazada = await propietario.post(`${rutaDe(id)}/terminar`, {});
    expect(rechazada.estado).toBe(400);
    expect(rechazada.cuerpo.error.codigo).toBe('falta_el_estado_de_cuenta');

    await exigirArchivo(false);
    expect((await propietario.post(`${rutaDe(id)}/terminar`, {})).cuerpo.estado).toBe('elaborada');
  });

  it('una elaborada sin archivo se autoriza aunque la variable se encienda después', async () => {
    const id = await iniciar('Autorizar sin archivo');
    await exigirArchivo(false);
    await propietario.post(`${rutaDe(id)}/terminar`, {});
    await exigirArchivo(true);

    expect((await autoriza.post(`${rutaDe(id)}/autorizar`, {})).cuerpo.estado).toBe('autorizada');
  });

  it('eliminar la conciliación borra fila y disco y la auditoría trae la huella', async () => {
    const id = await iniciar('Eliminar');
    const subida = await subir(propietario, id, await crearImagenPng(33, 22));
    const [archivo] = (await archivosDelEstadoDeCuenta(cuenta.empresaId)).filter(
      (a) => a.sha256 === subida.cuerpo.estadoDeCuenta.sha256,
    );
    expect(enDisco(archivo!.ruta_original)).toBe(true);

    const eliminada = await propietario.post(`${rutaDe(id)}/eliminar`, { motivo: 'Se repite' });

    expect(eliminada.estado).toBe(204);
    expect(await comoPropietario('select id from core.archivos where id = $1', [archivo!.id])).toHaveLength(0);
    expect(enDisco(archivo!.ruta_original)).toBe(false);
    const auditoria = await comoPropietario<{ anterior: { estadoDeCuenta: { sha256: string } } }>(
      "select anterior from core.auditoria where recurso = 'bancos.conciliaciones' and accion = 'eliminar' and registro_id = $1",
      [id],
    );
    expect(auditoria[0]!.anterior.estadoDeCuenta.sha256).toBe(subida.cuerpo.estadoDeCuenta.sha256);
  });
});

describe('límites', () => {
  it.skipIf(!hayQpdf)(
    'con la fila de revisión llena responde 429 revision_de_pdf_saturada con Retry-After',
    async () => {
      const id = await iniciar('Fila saturada');

      const respuestas = await Promise.all(Array.from({ length: 8 }, () => subir(propietario, id, pdf('a.pdf', 250))));

      const saturada = respuestas.find((r) => r.estado === 429);
      expect(saturada).toBeDefined();
      expect(saturada!.cuerpo.error.codigo).toBe('revision_de_pdf_saturada');
      expect(saturada!.cabeceras['retry-after']).toBe('30');
      expect(respuestas.some((r) => r.estado === 200)).toBe(true);
    },
  );

  it('la subida 31 del minuto responde 429', async () => {
    const id = await iniciar('Muchas subidas');
    const imagen = await crearImagenPng(16, 16);
    const estados: number[] = [];

    for (let i = 0; i < 31; i++) estados.push((await subir(muchasSubidas, id, imagen)).estado);

    expect(estados.slice(0, 30)).toEqual(Array(30).fill(200));
    expect(estados[30]).toBe(429);
  });
});
