import { beforeAll, describe, expect, it } from 'vitest';
import {
  excelDePrueba,
  parteDeCeros,
  tiposConMacros,
} from '../modulos/core/intercambio/infraestructura/zip/zip-de-prueba.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA = '/api/bancos/bancos/importar?ensayo=true';
const TIPO_EXCEL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;

const subir = (contenido: Buffer) =>
  cuenta.propietario.subirImagen('POST', RUTA, { nombreArchivo: 'datos.xlsx', tipoMime: TIPO_EXCEL, contenido });

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Importadora',
    usuario: 'propietarioimportador',
    modulos: ['bancos'],
  });
});

describe('seguridad de la importación de Excel por API', () => {
  it('un xlsx bomba se rechaza con 413', async () => {
    const respuesta = await subir(excelDePrueba([parteDeCeros('xl/worksheets/sheet1.xml', 30)]));

    expect(respuesta.estado).toBe(413);
    expect(respuesta.cuerpo.error.codigo).toBe('excel_demasiado_grande_al_descomprimir');
  });

  it('un Excel con macros se rechaza con 400', async () => {
    const respuesta = await subir(excelDePrueba([], tiposConMacros()));

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error.codigo).toBe('excel_con_contenido_no_permitido');
  });

  it('un archivo que no es Excel se rechaza con 400', async () => {
    const respuesta = await subir(Buffer.from('no soy un zip'));

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error.codigo).toBe('archivo_no_es_excel');
  });

  it('un archivo de más de 5 MB se rechaza con 413', async () => {
    const respuesta = await subir(Buffer.alloc(5 * 1024 * 1024 + 1024, 1));

    expect(respuesta.estado).toBe(413);
    expect(respuesta.cuerpo.error.codigo).toBe('archivo_demasiado_grande');
  });

  it('la solicitud 11 de importar en un minuto recibe 429', async () => {
    const otra = await darDeAltaCuenta(entorno, { nombre: 'Tasa', usuario: 'propietariotasa', modulos: ['bancos'] });
    const importar = () =>
      otra.propietario.subirImagen('POST', RUTA, {
        nombreArchivo: 'a.xlsx',
        tipoMime: TIPO_EXCEL,
        contenido: Buffer.from('x'),
      });

    const estados = [];
    for (let i = 0; i < 11; i++) estados.push((await importar()).estado);

    expect(estados).toEqual([...Array(10).fill(400), 429]);
    expect((await importar()).cuerpo.error.codigo).toBe('demasiadas_importaciones');
  });
});
