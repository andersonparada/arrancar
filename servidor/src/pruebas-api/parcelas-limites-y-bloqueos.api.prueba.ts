import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../configuracion.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import { filasDeExcel, importarExcel, libroConFilas } from './soporte/apertura-por-api.js';
import {
  RUTA_DE_PARCELAS as RUTA,
  crearLocalidadDePrueba,
  cuerpoDeMedicion,
  cuerpoDeParcela,
  tipoDeParcelaDePrueba,
} from './soporte/escenario-de-parcelas.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let base: { localidadId: string; tipoId: string };
let propietario: pg.Client;
let contador = 0;

const crear = async (cambios: Record<string, unknown> = {}) => {
  contador += 1;
  const creada = await cuenta.propietario.post(
    RUTA,
    cuerpoDeParcela(base, { codigo: `LB-${contador}`, nombre: `Limites ${contador}`, ...cambios }),
  );
  expect(creada.estado).toBe(201);
  return creada.cuerpo.id as string;
};

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Limites y bloqueos',
    usuario: 'propietarioparcelaslimites',
    modulos: ['terceros', 'parcelas'],
  });
  base = {
    localidadId: await crearLocalidadDePrueba(cuenta.propietario, 'LIM-1'),
    tipoId: await tipoDeParcelaDePrueba(cuenta.propietario),
  };
  propietario = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await propietario.connect();
});

afterAll(async () => {
  await propietario.end();
});

describe('cifras y fechas que la base no admite', () => {
  it('rechaza con 400 las varas fuera de 1 a 100, una superficie enorme y una fecha futura', async () => {
    const id = await crear();
    const cuerda = (varasPorLadoDeCuerda: number) =>
      cuerpoDeMedicion({ unidadOriginal: 'cuerda', varasPorLadoDeCuerda, cantidadOriginal: '1' });

    const respuestas = [
      await cuenta.propietario.post(`${RUTA}/${id}/mediciones`, cuerda(101)),
      await cuenta.propietario.post(`${RUTA}/${id}/mediciones`, cuerda(-25)),
      await cuenta.propietario.post(
        `${RUTA}/${id}/mediciones`,
        cuerpoDeMedicion({ unidadOriginal: 'caballeria', cantidadOriginal: '9999999999' }),
      ),
      await cuenta.propietario.post(`${RUTA}/${id}/mediciones`, cuerpoDeMedicion({ vigenteDesde: '2099-01-01' })),
    ];

    expect(respuestas.map(({ estado }) => estado)).toEqual([400, 400, 400, 400]);
    expect(respuestas.map(({ cuerpo }) => cuerpo.error.codigo)).toEqual([
      'superficie_invalida',
      'superficie_invalida',
      'superficie_invalida',
      'medicion_con_fecha_futura',
    ]);
  });

  it('no crea parcelas en una localidad inactiva', async () => {
    const localidadId = await crearLocalidadDePrueba(cuenta.propietario, 'LIM-2');
    const actual = (await cuenta.propietario.get(`/api/empresas/localidades/${localidadId}`)).cuerpo;
    const { id, ...datos } = actual;
    await cuenta.propietario.put(`/api/empresas/localidades/${localidadId}`, { ...datos, activo: false });

    const rechazada = await cuenta.propietario.post(
      RUTA,
      cuerpoDeParcela({ ...base, localidadId }, { codigo: 'LB-I' }),
    );

    expect(id).toBe(localidadId);
    expect(rechazada.estado).toBe(400);
    expect(rechazada.cuerpo.error.codigo).toBe('localidad_inactiva');
  });

  it('un inmueble repetido se rechaza con 400 en la API y por fila en el Excel', async () => {
    const finca = await cuenta.propietario.post('/api/empresas/inmuebles', {
      nombre: 'Finca repetida',
      situacionRegistral: 'posesorio',
      documentoPosesorio: 'Derechos posesorios',
      titularidad: 'propia',
    });
    const liga = { inmuebleId: finca.cuerpo.id, superficieM2: null };

    const api = await cuenta.propietario.post(RUTA, cuerpoDeParcela(base, { codigo: 'LB-R', inmuebles: [liga, liga] }));
    const libro = await libroConFilas(cuenta.propietario, RUTA, [
      {
        Localidad: 'Finca LIM-1',
        Código: 'LB-X',
        Nombre: 'Excel repetido',
        Tipo: 'Potrero',
        Tenencia: 'Propia',
        'Inmuebles (separados con «;»)': 'Finca repetida; finca repetida',
      },
    ]);
    const excel = await importarExcel(cuenta.propietario, RUTA, { contenido: libro, ensayo: true });

    expect(api.estado).toBe(400);
    expect(excel.estado).toBe(200);
    expect(excel.cuerpo).toMatchObject({ guardado: false });
    expect(JSON.stringify(excel.cuerpo)).toContain('no puede repetirse');
  });
});

describe('Excel con varas por lado y útil igual a la total', () => {
  it('ida y vuelta: la cuerda de 40 varas conserva su medida y la útil igual a la total se reimporta', async () => {
    await crear({
      codigo: 'XV-1',
      medicion: cuerpoDeMedicion({
        cantidadOriginal: '10.1299',
        unidadOriginal: 'cuerda',
        varasPorLadoDeCuerda: 40,
        cantidadUtil: '10.1299',
      }),
    });

    const exportado = (await cuenta.propietario.get(`${RUTA}/exportar`)).cuerpo as Buffer;
    const filas = await filasDeExcel(exportado);
    const encabezados = filas[0]!.map((celda) => String(celda).replace(/\s*\*$/, ''));
    const fila = filas.find((celda) => celda.includes('XV-1'))!;
    const revision = await importarExcel(cuenta.propietario, RUTA, { contenido: exportado, ensayo: true });

    expect(fila[encabezados.indexOf('Varas por lado de la cuerda')]).toBe(40);
    expect(fila[encabezados.indexOf('Superficie útil (misma unidad)')]).toBe(10.1299);
    expect(revision.cuerpo).toMatchObject({ guardado: false, errores: expect.anything() });
    expect(JSON.stringify(revision.cuerpo)).not.toContain('superficie_util_mayor_que_total');
  });

  it('importa una medición en cuerdas con las varas de la celda, y sin ellas usa las de la empresa', async () => {
    const fila = (codigo: string, extra: Record<string, unknown>) => ({
      Localidad: 'Finca LIM-1',
      Código: codigo,
      Nombre: `Excel ${codigo}`,
      Tipo: 'Potrero',
      Tenencia: 'Propia',
      Superficie: 10,
      'Unidad de la superficie': 'Cuerdas',
      ...extra,
    });
    const libro = await libroConFilas(cuenta.propietario, RUTA, [
      fila('XV-40', { 'Varas por lado de la cuerda': 40 }),
      fila('XV-25', {}),
    ]);

    await importarExcel(cuenta.propietario, RUTA, { contenido: libro, ensayo: false });
    const guardadas = (await cuenta.propietario.get(`${RUTA}?texto=XV-`)).cuerpo as Array<Record<string, unknown>>;
    const m2 = (codigo: string) => guardadas.find((parcela) => parcela.codigo === codigo)?.superficieTotalM2;

    expect(m2('XV-40')).toBe('11179.79');
    expect(m2('XV-25')).toBe('4367.11');
  });
});

describe('bloqueo de la parcela', () => {
  /** Cuánto se espera para dar por detenida una operación que espera el candado. */
  const ESPERA_MS = 800;

  /** Lanza la operación mientras otra transacción tiene la fila de la parcela bloqueada: debe esperar. */
  async function esperaElCandado(parcelaId: string, operacion: () => Promise<{ estado: number }>) {
    await propietario.query('begin');
    await propietario.query('select 1 from parcelas.parcelas where id = $1 for update', [parcelaId]);
    const pendiente = operacion();
    const primero = await Promise.race([
      pendiente.then(() => 'terminó'),
      new Promise((resolver) => setTimeout(() => resolver('esperó'), ESPERA_MS)),
    ]);
    await propietario.query('commit');
    return { primero, estado: (await pendiente).estado };
  }

  it.each([
    [
      'editar',
      (id: string) => cuenta.propietario.put(`${RUTA}/${id}`, cuerpoDeParcela(base, { nombre: 'Otro nombre' })),
    ],
    ['inactivar', (id: string) => cuenta.propietario.post(`${RUTA}/${id}/inactivar`, {})],
    ['registrar una medición', (id: string) => cuenta.propietario.post(`${RUTA}/${id}/mediciones`, cuerpoDeMedicion())],
    [
      'crear una hija',
      (id: string) =>
        cuenta.propietario.post(
          RUTA,
          cuerpoDeParcela(base, { codigo: `H-${id.slice(0, 8)}`, nombre: `Hija ${id}`, parcelaMadreId: id }),
        ),
    ],
  ])('al %s espera a que la otra transacción suelte la parcela', async (_accion, operacion) => {
    const id = await crear();

    const { primero, estado } = await esperaElCandado(id, () => operacion(id));

    expect(primero).toBe('esperó');
    expect([200, 201]).toContain(estado);
  });

  it('editar el nombre mientras se miden varias fechas no pisa la superficie vigente', async () => {
    const id = await crear();
    const mediciones = ['2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01'].map((vigenteDesde, i) =>
      cuenta.propietario.post(
        `${RUTA}/${id}/mediciones`,
        cuerpoDeMedicion({ vigenteDesde, cantidadOriginal: `${i + 1}` }),
      ),
    );
    const ediciones = [1, 2, 3].map((n) =>
      cuenta.propietario.put(`${RUTA}/${id}`, cuerpoDeParcela(base, { nombre: `Renombrada ${n}` })),
    );

    await Promise.all([...mediciones, ...ediciones]);
    const ficha = (await cuenta.propietario.get(`${RUTA}/${id}`)).cuerpo;

    expect(ficha.superficieTotalM2).toBe('27949.49');
  });
});
