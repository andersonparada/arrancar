import ExcelJS from 'exceljs';
import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA = '/api/bancos/cuentas-bancarias';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let otraCuenta: CuentaDePrueba;

/** Lo que el registro necesita elegir, registrado en la cuenta del usuario. */
async function crearReferencias(usuario: ClienteApi) {
  const banco = await usuario.post('/api/bancos/bancos', {
    nombre: 'Registro de prueba',
    observaciones: 'Una nota de prueba.',
    activo: true,
  });
  return { bancoId: banco.cuerpo.id as string };
}

let referencias: Awaited<ReturnType<typeof crearReferencias>>;
let referenciasAjenas: Awaited<ReturnType<typeof crearReferencias>>;

let consecutivo = 0;

/** Cada cuenta lleva un nombre y un número propios: ambos son únicos. */
const datos = (cambios: Record<string, unknown> = {}) => ({
  nombre: `Registro de prueba ${++consecutivo}`,
  numero: `Registro de prueba ${consecutivo}`,
  tipo: 'monetaria',
  observaciones: 'Una nota de prueba.',
  activo: true,
  ...referencias,
  ...cambios,
});

beforeAll(async () => {
  const modulos = ['bancos'];
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Generada', usuario: 'propietariogenerado', modulos });
  otraCuenta = await darDeAltaCuenta(entorno, { nombre: 'Ajena', usuario: 'propietarioajeno', modulos });
  referencias = await crearReferencias(cuenta.propietario);
  referenciasAjenas = await crearReferencias(otraCuenta.propietario);
});

describe('cuentas bancarias por API', () => {
  it('se registran, se listan y se cambian', async () => {
    const creado = await cuenta.propietario.post(RUTA, datos());
    const id = creado.cuerpo.id;
    const cambiado = await cuenta.propietario.put(
      `${RUTA}/${id}`,
      datos({ nombre: 'Registro cambiado', numero: 'Registro cambiado' }),
    );

    expect(creado.estado).toBe(201);
    expect((await cuenta.propietario.get(`${RUTA}/${id}`)).cuerpo).toEqual(cambiado.cuerpo);
    expect((await cuenta.propietario.get(RUTA)).cuerpo).toEqual([cambiado.cuerpo]);
    expect(cambiado.cuerpo.nombre).toBe('Registro cambiado');
  });

  it('se inactivan sin perder sus datos', async () => {
    const cambios = datos();
    const creado = await cuenta.propietario.post(RUTA, cambios);
    const inactivo = await cuenta.propietario.put(`${RUTA}/${creado.cuerpo.id}`, { ...cambios, activo: false });

    expect(inactivo.cuerpo).toEqual({ ...creado.cuerpo, activo: false });
  });

  it('no acepta un banco de otra cuenta', async () => {
    const conAjeno = await cuenta.propietario.post(RUTA, datos({ bancoId: referenciasAjenas.bancoId }));

    expect(conAjeno.estado).toBe(404);
  });

  it('otra cuenta no los ve', async () => {
    const ajeno = await otraCuenta.propietario.post(RUTA, datos(referenciasAjenas));

    expect((await cuenta.propietario.get(`${RUTA}/${ajeno.cuerpo.id}`)).estado).toBe(404);
    expect((await otraCuenta.propietario.get(RUTA)).cuerpo).toEqual([ajeno.cuerpo]);
  });

  it('lo exportado se puede revisar para importarlo de nuevo', async () => {
    await cuenta.propietario.post(RUTA, datos());
    const exportado = await cuenta.propietario.get(`${RUTA}/exportar`);

    const revision = await cuenta.propietario.subirImagen('POST', `${RUTA}/importar?ensayo=true`, {
      nombreArchivo: 'cuentas-bancarias.xlsx',
      tipoMime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      contenido: exportado.cuerpo,
    });

    expect(exportado.estado).toBe(200);
    expect(revision.cuerpo).toMatchObject({ guardado: false, filas: expect.any(Number) });
  });

  it('para registrar hace falta el permiso de gestionar', async () => {
    const lector = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Solo',
      apellidos: 'Lectura',
      permisos: ['bancos.cuentas-bancarias.ver'],
    });

    expect((await lector.get(RUTA)).estado).toBe(200);
    expect((await lector.post(RUTA, datos())).estado).toBe(403);
    expect((await lector.get(`${RUTA}/exportar`)).estado).toBe(403);
    expect((await lector.get(`${RUTA}/plantilla`)).estado).toBe(403);
  });
});

describe('número de cuenta único por banco', () => {
  it('«001-23 45» choca con «0012345» en el mismo banco y empresa', async () => {
    await cuenta.propietario.post(RUTA, datos({ numero: '0012345' }));
    const repetida = await cuenta.propietario.post(RUTA, datos({ numero: '001-23 45' }));

    expect(repetida.estado).toBe(422);
    expect(repetida.cuerpo.error.codigo).toBe('numero_de_cuenta_repetido');
  });

  it('al cambiar una cuenta tampoco puede quedar con el número de otra', async () => {
    await cuenta.propietario.post(RUTA, datos({ numero: 'AB-777' }));
    const otra = await cuenta.propietario.post(RUTA, datos({ numero: '888' }));
    const cambiada = await cuenta.propietario.put(`${RUTA}/${otra.cuerpo.id}`, datos({ numero: 'ab 777' }));

    expect(cambiada.estado).toBe(422);
  });

  it('una cuenta puede conservar su número al guardarse de nuevo', async () => {
    const creada = await cuenta.propietario.post(RUTA, datos({ numero: '55-66' }));
    const guardada = await cuenta.propietario.put(`${RUTA}/${creada.cuerpo.id}`, datos({ numero: '5566' }));

    expect(guardada.estado).toBe(200);
    expect(guardada.cuerpo.numero).toBe('5566');
  });

  it('el mismo número no choca en otro banco', async () => {
    const banco = await cuenta.propietario.post('/api/bancos/bancos', { nombre: 'Otro banco', activo: true });
    const otroBanco = { bancoId: banco.cuerpo.id as string };
    await cuenta.propietario.post(RUTA, datos({ numero: '99-11' }));
    const enOtroBanco = await cuenta.propietario.post(RUTA, datos({ numero: '9911', ...otroBanco }));

    expect(enOtroBanco.estado).toBe(201);
  });

  it('el mismo número no choca en otra empresa', async () => {
    await cuenta.propietario.post(RUTA, datos({ numero: '44-22' }));
    const enOtraEmpresa = await otraCuenta.propietario.post(RUTA, datos({ numero: '4422', ...referenciasAjenas }));

    expect(enOtraEmpresa.estado).toBe(201);
  });

  it('la importación de Excel rechaza un número repetido una vez normalizado', async () => {
    await cuenta.propietario.post(RUTA, datos({ numero: '12-34-56' }));
    const libro = await libroConFilaRepetida((await cuenta.propietario.get(`${RUTA}/exportar`)).cuerpo, '123456');

    const revision = await cuenta.propietario.subirImagen('POST', `${RUTA}/importar?ensayo=true`, {
      nombreArchivo: 'cuentas-bancarias.xlsx',
      tipoMime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      contenido: libro,
    });

    expect(JSON.stringify(revision.cuerpo)).toContain('Ya existe la cuenta 123456 en ese banco.');
  });
});

/** Deja solo la última cuenta exportada, con otro nombre y el número dado, como si fuera una fila nueva. */
async function libroConFilaRepetida(exportado: Buffer, numero: string): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(exportado as unknown as ExcelJS.Buffer);
  const hoja = libro.worksheets[0];
  if (!hoja) throw new Error('El libro exportado no tiene hojas.');
  const encabezados = (hoja.getRow(1).values as unknown[]).map((valor) => String(valor ?? ''));
  const columnaNombre = encabezados.findIndex((texto) => /nombre/i.test(texto));
  const columnaNumero = encabezados.findIndex((texto) => /n[uú]mero/i.test(texto));
  const ultima = hoja.getRow(hoja.rowCount);
  const valores = (ultima.values as unknown[]).slice();
  hoja.spliceRows(2, hoja.rowCount);
  const nueva = hoja.getRow(2);
  valores.forEach((valor, columna) => columna > 0 && (nueva.getCell(columna).value = valor as ExcelJS.CellValue));
  nueva.getCell(columnaNombre).value = 'Cuenta importada repetida';
  nueva.getCell(columnaNumero).value = numero;
  return Buffer.from(await libro.xlsx.writeBuffer());
}
