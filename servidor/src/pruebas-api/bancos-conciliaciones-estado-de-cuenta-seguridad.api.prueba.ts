import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  CONTRASENA_DE_PRUEBA,
  crearUsuarioConPermisos,
  darDeAltaCuenta,
  type CuentaDePrueba,
} from './soporte/escenarios.js';
import {
  archivosDelEstadoDeCuenta,
  enDisco,
  iniciarConciliacionConSaldo,
} from './soporte/escenarios-de-estado-de-cuenta.js';
import { crearImagenPng } from './soporte/imagenes.js';

const entorno = usarEntornoApi();
const FRONTERA = '----frontera-de-prueba';
let cuenta: CuentaDePrueba;
let propietario: ClienteApi;
let autoriza: ClienteApi;
let subidor: ClienteApi;

const rutaDe = (id: string) => `/api/bancos/conciliaciones/${id}`;
const rutaDelArchivo = (id: string) => `${rutaDe(id)}/estado-de-cuenta`;
const iniciar = (nombre: string) => iniciarConciliacionConSaldo(propietario, nombre);

type Parte = { campo: string; contenido: Buffer | string; nombreArchivo?: string };

/** Arma un multipart a mano con las partes en el orden dado. */
function multipart(partes: Parte[]): Buffer {
  const trozos = partes.flatMap(({ campo, contenido, nombreArchivo }) => {
    const archivo = nombreArchivo ? `; filename="${nombreArchivo}"` : '';
    const tipo = nombreArchivo ? 'Content-Type: image/png\r\n' : '';
    return [
      Buffer.from(`--${FRONTERA}\r\nContent-Disposition: form-data; name="${campo}"${archivo}\r\n${tipo}\r\n`),
      Buffer.from(contenido),
      Buffer.from('\r\n'),
    ];
  });
  return Buffer.concat([...trozos, Buffer.from(`--${FRONTERA}--\r\n`)]);
}

const enviar = (id: string, partes: Parte[]) =>
  subidor.enviarCrudo(rutaDelArchivo(id), multipart(partes), `multipart/form-data; boundary=${FRONTERA}`);

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Seguridad estado',
    usuario: 'segestadocuenta',
    modulos: ['bancos'],
  });
  propietario = cuenta.propietario;
  autoriza = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Autoriza',
    apellidos: 'Seguridad',
    permisos: ['bancos.conciliaciones.ver', 'bancos.conciliaciones.autorizar'],
  });
  subidor = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Sube',
    apellidos: 'Seguridad',
    permisos: ['bancos.conciliaciones.ver', 'bancos.conciliaciones.conciliar'],
  });
});

describe('forma de la subida (multipart)', () => {
  it('rechaza dos archivos, campos de texto antes o después y un campo con otro nombre (400)', async () => {
    const id = await iniciar('Multipart');
    const png = (await crearImagenPng()).contenido;
    const archivo: Parte = { campo: 'archivo', contenido: png, nombreArchivo: 'a.png' };
    const casos: Parte[][] = [
      [archivo, { ...archivo, nombreArchivo: 'b.png' }],
      [{ campo: 'nota', contenido: 'hola' }, archivo],
      [archivo, { campo: 'nota', contenido: 'hola' }],
      [{ ...archivo, campo: 'otro' }],
    ];

    for (const partes of casos) {
      const respuesta = await enviar(id, partes);
      expect(respuesta.estado, JSON.stringify(partes.map((p) => p.campo))).toBe(400);
      expect(respuesta.cuerpo.error.mensaje).toMatch(/[Ee]nvíe un solo archivo/);
    }
    expect((await propietario.get(rutaDe(id))).cuerpo.estadoDeCuenta).toBeNull();
  });

  it('un cuerpo que no es multipart responde 400 en español', async () => {
    const id = await iniciar('No multipart');

    const respuesta = await subidor.post(rutaDelArchivo(id), { hola: 'mundo' });

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error.codigo).toBe('subida_no_es_de_archivo');
  });

  it('sin archivo responde 400 y 15 MB + 1 byte responde 413', async () => {
    const id = await iniciar('Tamaño');

    const vacia = await enviar(id, []);
    expect(vacia.estado).toBe(400);
    const grande = await enviar(id, [
      { campo: 'archivo', contenido: Buffer.alloc(15 * 1024 * 1024 + 1), nombreArchivo: 'grande.png' },
    ]);
    expect(grande.estado).toBe(413);
    expect(grande.cuerpo.error.codigo).toBe('documento_demasiado_grande');
  });
});

describe('otra empresa de la misma cuenta y cabeceras', () => {
  it('con otra empresa activa, el mismo usuario recibe 404 en GET, POST y DELETE', async () => {
    const id = await iniciar('Entre empresas');
    await propietario.subirImagen('POST', rutaDelArchivo(id), await crearImagenPng());
    const nueva = await propietario.post('/api/empresas', { nombre: 'Hermana del estado' });
    expect(nueva.estado).toBe(201);
    const otro = entorno.nuevoCliente();
    await otro.iniciarSesion(cuenta.usuario, CONTRASENA_DE_PRUEBA);
    await otro.get('/api/sesion');
    expect((await otro.put('/api/sesion/empresa-activa', { empresaId: nueva.cuerpo.id })).estado).toBe(200);

    expect((await otro.get(rutaDelArchivo(id))).estado).toBe(404);
    expect((await otro.subirImagen('POST', rutaDelArchivo(id), await crearImagenPng())).estado).toBe(404);
    expect((await otro.delete(rutaDelArchivo(id))).estado).toBe(404);
  });

  it('el GET sale con frame-ancestors y X-Frame-Options del mismo origen', async () => {
    const id = await iniciar('Cabeceras');
    await propietario.subirImagen('POST', rutaDelArchivo(id), await crearImagenPng());

    const abierto = await propietario.get(rutaDelArchivo(id));

    expect(abierto.cabeceras['content-security-policy']).toContain("frame-ancestors 'self'");
    expect(abierto.cabeceras['x-frame-options']).toBe('SAMEORIGIN');
  });
});

describe('concurrencia y reversión', () => {
  it('eliminar contra subir no deja filas ni archivos sueltos', async () => {
    const id = await iniciar('Eliminar contra subir');
    await propietario.subirImagen('POST', rutaDelArchivo(id), await crearImagenPng(31, 31));
    const antes = await archivosDelEstadoDeCuenta(cuenta.empresaId);

    await Promise.all([
      propietario.post(`${rutaDe(id)}/eliminar`, { motivo: 'Carrera' }),
      propietario.subirImagen('POST', rutaDelArchivo(id), await crearImagenPng(47, 47)),
    ]);

    const despues = await archivosDelEstadoDeCuenta(cuenta.empresaId);
    const conciliaciones = await comoPropietario<{ id: string }>(
      'select estado_de_cuenta_archivo_id as id from bancos.conciliaciones where estado_de_cuenta_archivo_id is not null',
      [],
    );
    const referenciados = new Set(conciliaciones.map((c) => c.id));
    expect(despues.every((a) => referenciados.has(a.id))).toBe(true);
    expect(despues.every((a) => enDisco(a.ruta_original))).toBe(true);
    for (const a of antes.filter((x) => !referenciados.has(x.id))) expect(enDisco(a.ruta_original)).toBe(false);
  });

  it('autorizar contra devolver: gana una y la otra recibe su error de estado', async () => {
    const id = await iniciar('Autorizar contra devolver');
    await propietario.subirImagen('POST', rutaDelArchivo(id), await crearImagenPng(29, 29));
    expect((await propietario.post(`${rutaDe(id)}/terminar`, {})).estado).toBe(200);

    const [autorizada, devuelta] = await Promise.all([
      autoriza.post(`${rutaDe(id)}/autorizar`, {}),
      autoriza.post(`${rutaDe(id)}/devolver`, { motivo: 'Carrera' }),
    ]);

    expect([autorizada.estado, devuelta.estado].sort()).toEqual([200, 422]);
    const final = (await propietario.get(rutaDe(id))).cuerpo.estado;
    expect(final).toBe(autorizada.estado === 200 ? 'autorizada' : 'en_proceso');
    const perdedora = autorizada.estado === 200 ? devuelta : autorizada;
    expect(perdedora.cuerpo.error.codigo).toMatch(/conciliacion_no_esta_/);
  });

  it('un reemplazo cuya transacción se deshace deja el anterior y borra el nuevo del disco', async () => {
    const id = await iniciar('Reemplazo deshecho');
    await propietario.subirImagen('POST', rutaDelArchivo(id), await crearImagenPng(23, 23));
    const antes = await archivosDelEstadoDeCuenta(cuenta.empresaId);
    await comoPropietario(
      `create or replace function bancos.falla_h2b() returns trigger language plpgsql as
       $$ begin raise exception 'falla de prueba'; end $$`,
      [],
    );
    await comoPropietario(
      'create trigger falla_h2b before update on bancos.conciliaciones for each row execute function bancos.falla_h2b()',
      [],
    );
    let respuesta;
    try {
      respuesta = await propietario.subirImagen('POST', rutaDelArchivo(id), await crearImagenPng(61, 61));
    } finally {
      await comoPropietario('drop trigger falla_h2b on bancos.conciliaciones', []);
    }

    expect(respuesta.estado).toBe(500);
    const despues = await archivosDelEstadoDeCuenta(cuenta.empresaId);
    expect(despues.map((a) => a.id).sort()).toEqual(antes.map((a) => a.id).sort());
    expect(despues.every((a) => enDisco(a.ruta_original))).toBe(true);
    expect((await propietario.get(rutaDe(id))).cuerpo.estadoDeCuenta).not.toBeNull();
  });
});

describe('límite de subidas común a fotos y estados de cuenta', () => {
  it('15 fotos y 16 estados de cuenta en un minuto: la 31 responde 429', async () => {
    const id = await iniciar('Límite común');
    const imagen = await crearImagenPng(16, 16);
    const subidor = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Limite',
      apellidos: 'Aparte',
      permisos: ['bancos.conciliaciones.ver', 'bancos.conciliaciones.conciliar'],
    });
    const estados: number[] = [];

    for (let i = 0; i < 15; i++) estados.push((await subidor.subirImagen('POST', '/api/archivos', imagen)).estado);
    for (let i = 0; i < 16; i++) estados.push((await subidor.subirImagen('POST', rutaDelArchivo(id), imagen)).estado);

    expect(estados.slice(0, 15)).toEqual(Array(15).fill(201));
    expect(estados.slice(15, 30)).toEqual(Array(15).fill(200));
    expect(estados[30]).toBe(429);
  });
});
