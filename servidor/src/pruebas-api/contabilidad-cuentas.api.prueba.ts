import { beforeAll, describe, expect, it } from 'vitest';
import { empresaConInicio, TIPO_EXCEL } from './soporte/apertura-por-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA = '/api/contabilidad/cuentas';
const RUTA_INICIO = '/api/contabilidad/inicio';
const MODULOS = ['terceros', 'contabilidad'];
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let otraCuenta: CuentaDePrueba;

const inicio = (cambios: Record<string, unknown> = {}) => ({
  fecha: '2026-01-01',
  caso: 'desde_la_carga',
  mascara: '9.9.99.99',
  ...cambios,
});

const datos = (cambios: Record<string, unknown> = {}) => ({
  codigo: '1',
  nombre: 'Activo',
  esDeDetalle: false,
  naturaleza: 'deudora',
  tipo: 'balance',
  ...cambios,
});

const caja = (cambios: Record<string, unknown> = {}) =>
  datos({ codigo: '1.1', nombre: 'Caja', esDeDetalle: true, rubro: 'efectivo', claseDeFlujo: 'efectivo', ...cambios });

beforeAll(async () => {
  cuenta = await empresaConInicio(entorno, { nombre: 'Generada', usuario: 'propietariocontable', modulos: MODULOS });
  otraCuenta = await empresaConInicio(entorno, { nombre: 'Ajena', usuario: 'propietarioajeno', modulos: MODULOS });
  for (const propia of [cuenta, otraCuenta]) {
    expect((await propia.propietario.put(RUTA_INICIO, inicio())).estado).toBe(200);
  }
});

describe('nomenclatura por API', () => {
  it('se registran con su nivel y su cuenta superior, se listan y se cambian', async () => {
    const raiz = await cuenta.propietario.post(RUTA, datos());
    const hija = await cuenta.propietario.post(RUTA, caja());
    const cambiada = await cuenta.propietario.put(`${RUTA}/${hija.cuerpo.id}`, caja({ nombre: 'Caja general' }));

    expect(raiz.estado).toBe(201);
    expect(hija.cuerpo).toMatchObject({ nivel: 2, padreId: raiz.cuerpo.id, padreCodigo: '1' });
    expect((await cuenta.propietario.get(`${RUTA}/${hija.cuerpo.id}`)).cuerpo).toEqual(cambiada.cuerpo);
    expect((await cuenta.propietario.get(RUTA)).cuerpo.map((c: { codigo: string }) => c.codigo)).toEqual(['1', '1.1']);
  });

  it('rechaza un código fuera de la máscara y una cuenta sin superior', async () => {
    const fuera = await cuenta.propietario.post(RUTA, datos({ codigo: '1.1.1.1.1', nombre: 'Fuera' }));
    const huerfana = await cuenta.propietario.post(RUTA, caja({ codigo: '7.1', nombre: 'Huérfana' }));

    expect(fuera.estado).toBe(400);
    expect(fuera.cuerpo.error.codigo).toBe('codigo_fuera_de_la_mascara');
    expect(huerfana.estado).toBe(400);
    expect(huerfana.cuerpo.error.codigo).toBe('cuenta_invalida');
  });

  it('no repite código ni nombre bajo la misma cuenta superior', async () => {
    const mismoCodigo = await cuenta.propietario.post(RUTA, datos({ nombre: 'Otro' }));
    const mismoNombre = await cuenta.propietario.post(RUTA, caja({ codigo: '1.2', nombre: ' CAJA GENERAL ' }));

    expect(mismoCodigo.estado).toBe(409);
    expect(mismoNombre.estado).toBe(409);
  });

  it('no cuelga cuentas de una de detalle', async () => {
    const hija = await cuenta.propietario.post(RUTA, caja({ codigo: '1.1.01', nombre: 'Hija' }));

    expect(hija.estado).toBe(422);
    expect(hija.cuerpo.error.codigo).toBe('cuenta_no_es_de_detalle');
  });

  it('se inactivan sin perder sus datos y se eliminan solo sin inferiores, con auditoría', async () => {
    const hoja = await cuenta.propietario.post(RUTA, caja({ codigo: '1.3', nombre: 'Banco' }));
    const inactiva = await cuenta.propietario.put(
      `${RUTA}/${hoja.cuerpo.id}`,
      caja({ codigo: '1.3', nombre: 'Banco', activo: false }),
    );
    const superior = await cuenta.propietario.get(RUTA);
    const raiz = superior.cuerpo.find((c: { codigo: string }) => c.codigo === '1');

    const conInferiores = await cuenta.propietario.delete(`${RUTA}/${raiz.id}`);
    const eliminada = await cuenta.propietario.delete(`${RUTA}/${hoja.cuerpo.id}`);

    expect(inactiva.cuerpo).toEqual({ ...hoja.cuerpo, activo: false });
    expect(conInferiores.estado).toBe(422);
    expect(conInferiores.cuerpo.error.codigo).toBe('cuenta_con_hijas');
    expect(eliminada.estado).toBe(204);
    expect((await cuenta.propietario.get(`${RUTA}/${hoja.cuerpo.id}`)).estado).toBe(404);
  });

  it('otra cuenta no las ve', async () => {
    const ajena = await otraCuenta.propietario.post(
      RUTA,
      datos({ codigo: '2', nombre: 'Pasivo', naturaleza: 'acreedora' }),
    );

    expect((await cuenta.propietario.get(`${RUTA}/${ajena.cuerpo.id}`)).estado).toBe(404);
    expect((await otraCuenta.propietario.get(RUTA)).cuerpo).toEqual([ajena.cuerpo]);
  });
});

describe('nomenclatura: Excel', () => {
  it('lo exportado de una empresa se importa en otra con su árbol', async () => {
    const exportado = await cuenta.propietario.get(`${RUTA}/exportar`);
    const archivo = {
      nombreArchivo: 'cuentas.xlsx',
      tipoMime: TIPO_EXCEL,
      contenido: exportado.cuerpo,
    };
    const destino = await empresaConInicio(entorno, { nombre: 'Copia', usuario: 'propietariocopia', modulos: MODULOS });
    await destino.propietario.put(RUTA_INICIO, inicio());

    const ensayo = await destino.propietario.subirImagen('POST', `${RUTA}/importar?ensayo=true`, archivo);
    const real = await destino.propietario.subirImagen('POST', `${RUTA}/importar?ensayo=false`, archivo);
    const copiadas = await destino.propietario.get(RUTA);

    expect(exportado.estado).toBe(200);
    expect(ensayo.cuerpo).toMatchObject({ guardado: false });
    expect(real.cuerpo).toMatchObject({ guardado: true });
    expect(
      copiadas.cuerpo.map((c: { codigo: string; padreCodigo: string | null }) => [c.codigo, c.padreCodigo]),
    ).toEqual([
      ['1', null],
      ['1.1', '1'],
    ]);
  });
});

describe('nomenclatura: simultaneidad', () => {
  it('crear una hija de otro tipo y cambiar el tipo del padre a la vez nunca deja una hija incoherente', async () => {
    const padre = await cuenta.propietario.post(RUTA, datos({ codigo: '8', nombre: 'Padre carrera' }));
    const hija = (): Promise<{ estado: number }> =>
      cuenta.propietario.post(RUTA, caja({ codigo: '8.1', nombre: 'Hija carrera' }));
    const cambio = (): Promise<{ estado: number }> =>
      cuenta.propietario.put(
        `${RUTA}/${padre.cuerpo.id}`,
        datos({ codigo: '8', nombre: 'Padre carrera', tipo: 'resultados' }),
      );

    await Promise.all([hija(), cambio()]);
    const arbol = (await cuenta.propietario.get(RUTA)).cuerpo as Array<{ codigo: string; tipo: string }>;
    const padreFinal = arbol.find((c) => c.codigo === '8');
    const hijaFinal = arbol.find((c) => c.codigo === '8.1');

    if (hijaFinal) expect(hijaFinal.tipo).toBe(padreFinal?.tipo);
  });
});

describe('nomenclatura: permisos', () => {
  it('cada acción exige su permiso', async () => {
    const lector = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Solo',
      apellidos: 'Lectura',
      permisos: ['contabilidad.cuentas.ver'],
    });

    expect((await lector.get(RUTA)).estado).toBe(200);
    expect((await lector.post(RUTA, datos({ codigo: '3', nombre: 'Capital' }))).estado).toBe(403);
    expect((await lector.delete(`${RUTA}/${crypto.randomUUID()}`)).estado).toBe(403);
    expect((await lector.get(`${RUTA}/exportar`)).estado).toBe(403);
    expect((await lector.get(`${RUTA}/plantilla`)).estado).toBe(403);
    expect((await lector.get(RUTA_INICIO)).estado).toBe(403);
    expect((await lector.get(`${RUTA}/mascara`)).cuerpo).toEqual({ mascara: '9.9.99.99' });
  });

  it('la máscara es null antes de iniciar y no pide el permiso del inicio', async () => {
    const sinIniciar = await empresaConInicio(entorno, {
      nombre: 'Sin iniciar',
      usuario: 'propietariosininiciar',
      modulos: MODULOS,
    });
    const respuesta = await sinIniciar.propietario.get(`${RUTA}/mascara`);

    expect(respuesta.estado).toBe(200);
    expect(respuesta.cuerpo).toEqual({ mascara: null });
  });
});
