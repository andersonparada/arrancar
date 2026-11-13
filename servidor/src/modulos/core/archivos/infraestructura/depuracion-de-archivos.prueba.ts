import { lstat, mkdir, mkdtemp, readFile, rm, symlink, utimes, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, beforeEach, afterEach, describe, expect, it } from 'vitest';
import { configuracion } from '../../../../configuracion.js';
import { definicionesModulos } from '../../../indice.js';
import { bd, grupoConexiones } from '../../base-datos/conexion.js';
import { migrarModulos } from '../../base-datos/migrador.js';
import { cuentas } from '../../cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { empresas } from '../../cuentas/infraestructura/persistencia/empresas.tablas.js';
import { DepurarArchivosHuerfanos } from '../aplicacion/casos-uso/depurar-archivos-huerfanos.js';
import { ExploradorDeArchivosLocal } from './explorador-de-archivos-local.js';
import { RegistroDeRutasDrizzle } from './persistencia/registro-de-rutas.drizzle.js';

const DOS_DIAS_EN_MS = 2 * 24 * 60 * 60 * 1000;
let propietario: pg.Client;
let empresaA: string;
let empresaB: string;
let raiz: string;
let afuera: string;

async function crearArchivo(ruta: string, edadEnMs = DOS_DIAS_EN_MS): Promise<void> {
  const destino = join(raiz, ruta);
  await mkdir(dirname(destino), { recursive: true });
  await writeFile(destino, 'contenido');
  const fecha = new Date(Date.now() - edadEnMs);
  await utimes(destino, fecha, fecha);
}

async function registrar(empresaId: string, rutaOriginal: string, rutaMiniatura?: string): Promise<void> {
  await propietario.query(
    `insert into core.archivos (empresa_id, ruta_original, ruta_miniatura, clase, tipo_mime, tamano_bytes, ancho, alto)
     values ($1, $2, $3, $4, 'application/octet-stream', 9, $5, $5)`,
    [empresaId, rutaOriginal, rutaMiniatura ?? null, rutaMiniatura ? 'imagen' : 'documento', rutaMiniatura ? 10 : null],
  );
}

function depurador(): DepurarArchivosHuerfanos {
  return new DepurarArchivosHuerfanos({
    explorador: new ExploradorDeArchivosLocal(raiz),
    registro: new RegistroDeRutasDrizzle(bd),
    registroDeTexto: { info: () => undefined, advertencia: () => undefined },
  });
}

beforeAll(async () => {
  await migrarModulos(configuracion.DATABASE_URL_PROPIETARIO!, definicionesModulos);
  propietario = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await propietario.connect();
  await propietario.query('truncate core.cuentas, core.usuarios cascade');
  const [cuenta] = await bd.insert(cuentas).values({ nombre: 'Cuenta de huérfanos' }).returning();
  const [a] = await bd.insert(empresas).values({ cuentaId: cuenta!.id, nombre: 'Empresa A' }).returning();
  const [b] = await bd.insert(empresas).values({ cuentaId: cuenta!.id, nombre: 'Empresa B' }).returning();
  empresaA = a!.id;
  empresaB = b!.id;
});

beforeEach(async () => {
  raiz = await mkdtemp(join(tmpdir(), 'arrancar-raiz-'));
  afuera = await mkdtemp(join(tmpdir(), 'arrancar-afuera-'));
});

afterEach(async () => {
  await propietario.query('delete from core.archivos');
  await rm(raiz, { recursive: true, force: true });
  await rm(afuera, { recursive: true, force: true });
});

afterAll(async () => {
  await propietario.end();
  await grupoConexiones.end();
});

describe('depuración de archivos huérfanos (disco y base reales)', () => {
  it('no borra un archivo registrado de otra empresa (la función ve todas las empresas)', async () => {
    await crearArchivo(`${empresaB}/2026/10/de-otra-empresa.pdf`);
    await registrar(empresaB, `${empresaB}/2026/10/de-otra-empresa.pdf`);

    await depurador().ejecutar();

    expect(existsSync(join(raiz, `${empresaB}/2026/10/de-otra-empresa.pdf`))).toBe(true);
  });

  it('no borra la miniatura de una imagen registrada', async () => {
    await crearArchivo(`${empresaA}/2026/10/foto.webp`);
    await crearArchivo(`${empresaA}/2026/10/foto_min.webp`);
    await registrar(empresaA, `${empresaA}/2026/10/foto.webp`, `${empresaA}/2026/10/foto_min.webp`);

    await depurador().ejecutar();

    expect(existsSync(join(raiz, `${empresaA}/2026/10/foto_min.webp`))).toBe(true);
  });

  it('borra el suelto viejo, pero no el suelto nuevo ni las carpetas', async () => {
    await crearArchivo(`${empresaA}/2026/10/suelto-viejo.pdf`);
    await crearArchivo(`${empresaA}/2026/11/suelto-nuevo.pdf`, 60 * 60 * 1000);

    const resultado = await depurador().ejecutar();

    expect(resultado.borrados).toBe(1);
    expect(existsSync(join(raiz, `${empresaA}/2026/10/suelto-viejo.pdf`))).toBe(false);
    expect(existsSync(join(raiz, `${empresaA}/2026/11/suelto-nuevo.pdf`))).toBe(true);
    expect(existsSync(join(raiz, `${empresaA}/2026/10`))).toBe(true);
  });

  it('no sigue enlaces simbólicos: ni los borra ni toca su destino fuera de la raíz', async () => {
    const secreto = join(afuera, 'secreto.txt');
    await writeFile(secreto, 'no se toca');
    const viejo = new Date(Date.now() - DOS_DIAS_EN_MS);
    await utimes(secreto, viejo, viejo);
    await symlink(secreto, join(raiz, 'enlace-a-archivo.pdf'));
    await symlink(afuera, join(raiz, 'enlace-a-carpeta'));

    const resultado = await depurador().ejecutar();

    expect(resultado.revisados).toBe(0);
    expect(await readFile(secreto, 'utf8')).toBe('no se toca');
    expect((await lstat(join(raiz, 'enlace-a-archivo.pdf'))).isSymbolicLink()).toBe(true);
    expect((await lstat(join(raiz, 'enlace-a-carpeta'))).isSymbolicLink()).toBe(true);
  });

  it('el explorador se niega a borrar fuera de la raíz o un enlace', async () => {
    const explorador = new ExploradorDeArchivosLocal(raiz);
    await writeFile(join(afuera, 'ajeno.txt'), 'x');
    await symlink(join(afuera, 'ajeno.txt'), join(raiz, 'enlace.pdf'));

    await expect(explorador.borrar('../fuera-de-la-raiz.txt')).rejects.toThrow();
    await expect(explorador.borrar('enlace.pdf')).rejects.toThrow();
    expect(existsSync(join(afuera, 'ajeno.txt'))).toBe(true);
  });

  it('la función rechaza más de 500 rutas', async () => {
    const rutas = Array.from({ length: 501 }, (_, i) => `r${i}`);
    await expect(new RegistroDeRutasDrizzle(bd).registradas(rutas)).rejects.toThrow();
  });
});
