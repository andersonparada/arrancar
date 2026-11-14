import { lstat, mkdir, mkdtemp, readFile, rm, symlink, utimes, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, beforeEach, afterEach, describe, expect, it } from 'vitest';
import { configuracion } from '../../../../configuracion.js';
import { definicionesModulos } from '../../../indice.js';
import { bd, grupoConexiones } from '../../base-datos/conexion.js';
import { migrarModulos } from '../../base-datos/migrador.js';
import { cuentas } from '../../cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { empresas } from '../../cuentas/infraestructura/persistencia/empresas.tablas.js';
import { DepurarArchivosHuerfanos } from '../aplicacion/casos-uso/depurar-archivos-huerfanos.js';
import { ExploradorDeArchivosLocal, RaizDeArchivosInsegura } from './explorador-de-archivos-local.js';
import { CerrojoDeDepuracionPostgres } from './persistencia/cerrojo-de-depuracion.drizzle.js';
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
    cerrojo: new CerrojoDeDepuracionPostgres(grupoConexiones),
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

const nuevoNombre = (extension = 'pdf') => `${crypto.randomUUID()}.${extension}`;

describe('depuración de archivos huérfanos (disco y base reales)', () => {
  it('no borra un archivo registrado de otra empresa (la función ve todas las empresas)', async () => {
    const ruta = `${empresaB}/2026/10/${nuevoNombre()}`;
    await crearArchivo(ruta);
    await registrar(empresaB, ruta);

    await depurador().ejecutar();

    expect(existsSync(join(raiz, ruta))).toBe(true);
  });

  it('no borra la miniatura de una imagen registrada', async () => {
    const base = crypto.randomUUID();
    const [original, miniatura] = [`${empresaA}/2026/10/${base}.webp`, `${empresaA}/2026/10/${base}_min.webp`];
    await crearArchivo(original);
    await crearArchivo(miniatura);
    await registrar(empresaA, original, miniatura);

    await depurador().ejecutar();

    expect(existsSync(join(raiz, miniatura))).toBe(true);
  });

  it('borra el suelto viejo, pero no el suelto nuevo ni las carpetas', async () => {
    const [viejo, nuevo] = [`${empresaA}/2026/10/${nuevoNombre()}`, `${empresaA}/2026/11/${nuevoNombre()}`];
    await crearArchivo(viejo);
    await crearArchivo(nuevo, 60 * 60 * 1000);

    const resultado = await depurador().ejecutar();

    expect(resultado?.borrados).toBe(1);
    expect(existsSync(join(raiz, viejo))).toBe(false);
    expect(existsSync(join(raiz, nuevo))).toBe(true);
    expect(existsSync(join(raiz, `${empresaA}/2026/10`))).toBe(true);
  });

  it('no toca lo que no tiene la forma de las rutas de la aplicación (el logo de la instalación)', async () => {
    await crearArchivo('instalacion/logo.png');
    await crearArchivo(`${empresaA}/2026/10/notas.txt`);
    await crearArchivo('suelto.pdf');

    const resultado = await depurador().ejecutar();

    expect(resultado).toMatchObject({ revisados: 0, borrados: 0 });
    expect(existsSync(join(raiz, 'instalacion/logo.png'))).toBe(true);
    expect(existsSync(join(raiz, `${empresaA}/2026/10/notas.txt`))).toBe(true);
    expect(existsSync(join(raiz, 'suelto.pdf'))).toBe(true);
  });

  it('no sigue enlaces simbólicos: ni los borra ni toca su destino fuera de la raíz', async () => {
    const secreto = join(afuera, 'secreto.txt');
    await writeFile(secreto, 'no se toca');
    const viejo = new Date(Date.now() - DOS_DIAS_EN_MS);
    await utimes(secreto, viejo, viejo);
    await symlink(secreto, join(raiz, nuevoNombre()));
    await symlink(afuera, join(raiz, 'enlace-a-carpeta'));

    const resultado = await depurador().ejecutar();

    expect(resultado?.revisados).toBe(0);
    expect(await readFile(secreto, 'utf8')).toBe('no se toca');
    expect((await lstat(join(raiz, 'enlace-a-carpeta'))).isSymbolicLink()).toBe(true);
  });

  it('el explorador se niega a borrar fuera de la raíz, un enlace o por una carpeta cambiada por un enlace', async () => {
    const explorador = new ExploradorDeArchivosLocal(raiz);
    const ajeno = join(afuera, nuevoNombre());
    await writeFile(ajeno, 'x');
    await symlink(ajeno, join(raiz, nuevoNombre()));
    await mkdir(join(raiz, empresaA, '2026'), { recursive: true });
    await symlink(afuera, join(raiz, empresaA, '2026', '10'));

    await expect(explorador.borrar('../fuera-de-la-raiz.txt')).rejects.toThrow();
    await expect(explorador.borrar(`${empresaA}/2026/10/${basename(ajeno)}`)).rejects.toThrow('cambió');
    expect(existsSync(ajeno)).toBe(true);
  });

  it('borrar algo que ya no estaba no es un error', async () => {
    await expect(
      new ExploradorDeArchivosLocal(raiz).borrar(`${empresaA}/2026/10/${nuevoNombre()}`),
    ).resolves.toBeUndefined();
  });

  it('se niega a trabajar con la raíz del disco o con la carpeta del programa o una de sus padres', () => {
    expect(() => new ExploradorDeArchivosLocal('/')).toThrow(RaizDeArchivosInsegura);
    expect(() => new ExploradorDeArchivosLocal('/srv/app', '/srv/app')).toThrow(RaizDeArchivosInsegura);
    expect(() => new ExploradorDeArchivosLocal('/srv', '/srv/app')).toThrow(RaizDeArchivosInsegura);
    expect(() => new ExploradorDeArchivosLocal('/srv/app/archivos', '/srv/app')).not.toThrow();
  });

  it('la función rechaza más de 500 rutas', async () => {
    const rutas = Array.from({ length: 501 }, (_, i) => `r${i}`);
    await expect(new RegistroDeRutasDrizzle(bd).registradas(rutas)).rejects.toThrow();
  });

  it('si el dueño de la función queda sujeto a RLS, la función falla en vez de devolver vacío', async () => {
    // El dueño de las migraciones es superusuario y no ve RLS: se simula un dueño común, todo dentro de una transacción.
    await propietario.query('begin');
    try {
      await propietario.query('create role dueno_sin_privilegios_de_prueba');
      await propietario.query('grant usage, create on schema core to dueno_sin_privilegios_de_prueba');
      await propietario.query('grant select on core.archivos to dueno_sin_privilegios_de_prueba');
      await propietario.query(
        'alter function core.rutas_de_archivos_registradas(text[]) owner to dueno_sin_privilegios_de_prueba',
      );
      await expect(propietario.query("select * from core.rutas_de_archivos_registradas(array['x'])")).rejects.toThrow(
        /row-level security/,
      );
    } finally {
      await propietario.query('rollback');
    }
  });

  it('con el cerrojo ocupado por otra conexión, la corrida se salta', async () => {
    const otra = await grupoConexiones.connect();
    try {
      await otra.query('select pg_advisory_lock($1)', [7_301_913_001]);
      await crearArchivo(`${empresaA}/2026/10/${nuevoNombre()}`);
      expect(await depurador().ejecutar()).toBeNull();
    } finally {
      await otra.query('select pg_advisory_unlock($1)', [7_301_913_001]);
      otra.release();
    }
    expect((await depurador().ejecutar())?.borrados).toBe(1);
  });
});
