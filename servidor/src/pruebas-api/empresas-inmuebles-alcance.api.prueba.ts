import ExcelJS from 'exceljs';
import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA = '/api/empresas/inmuebles';
const TIPO_EXCEL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let otraCuenta: CuentaDePrueba;
let encargado: ClienteApi;
let localidadDelPropietario: string;
let localidadDelEncargado: string;
let localidadAjena: string;

const permisosDe = (recurso: string, acciones: string[]) => acciones.map((accion) => `empresas.${recurso}.${accion}`);

const datos = (cambios: Record<string, unknown> = {}) => ({
  nombre: 'Finca',
  situacionRegistral: 'inscrito',
  registro: 'general',
  numeroDeFinca: '1',
  folio: '2',
  libro: '3',
  departamentoRegistral: '01',
  titularidad: 'propia',
  ...cambios,
});

async function crearLocalidad(usuario: ClienteApi, codigo: string): Promise<string> {
  const tipos = (await usuario.get('/api/empresas/tipos-de-localidad')).cuerpo as Array<{ id: string }>;
  const creada = await usuario.post('/api/empresas/localidades', {
    codigo,
    nombre: `Localidad ${codigo}`,
    tipoId: tipos[0]!.id,
    codigoEstablecimientoSat: null,
    nombreComercialSat: null,
    departamentoCodigo: null,
    municipioCodigo: null,
    direccion: null,
    activo: true,
  });
  return creada.cuerpo.id as string;
}

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Con alcance', usuario: 'propietarioalcance' });
  otraCuenta = await darDeAltaCuenta(entorno, { nombre: 'Ajena', usuario: 'propietarioajeno' });
  encargado = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Encargado',
    apellidos: 'Sinvertodas',
    permisos: [
      ...permisosDe('inmuebles', ['ver', 'crear', 'editar', 'eliminar', 'exportar']),
      ...permisosDe('localidades', ['ver', 'crear']),
      ...permisosDe('tipos-de-localidad', ['ver']),
    ],
  });
  localidadDelPropietario = await crearLocalidad(cuenta.propietario, 'PRO-1');
  localidadDelEncargado = await crearLocalidad(encargado, 'ENC-1');
  localidadAjena = await crearLocalidad(otraCuenta.propietario, 'AJE-1');
});

describe('inmuebles con alcance por localidad', () => {
  it('quien no ve todas las localidades ve los de toda la empresa y los de las suyas', async () => {
    const general = await cuenta.propietario.post(RUTA, datos({ nombre: 'General', numeroDeFinca: '10' }));
    const suyo = await cuenta.propietario.post(
      RUTA,
      datos({ nombre: 'Suyo', numeroDeFinca: '11', localidadId: localidadDelEncargado }),
    );
    const ajeno = await cuenta.propietario.post(
      RUTA,
      datos({ nombre: 'Ajeno', numeroDeFinca: '12', localidadId: localidadDelPropietario }),
    );

    const visibles = ((await encargado.get(RUTA)).cuerpo as Array<{ id: string }>).map(({ id }) => id);

    expect(visibles).toContain(general.cuerpo.id);
    expect(visibles).toContain(suyo.cuerpo.id);
    expect(visibles).not.toContain(ajeno.cuerpo.id);
    expect((await encargado.get(`${RUTA}/${ajeno.cuerpo.id}`)).estado).toBe(404);
  });

  it('no ve, registra ni elimina valores de un inmueble de una localidad que no ve', async () => {
    const ajeno = await cuenta.propietario.post(
      RUTA,
      datos({ nombre: 'Valores ajenos', numeroDeFinca: '23', localidadId: localidadDelPropietario }),
    );
    const url = `${RUTA}/${ajeno.cuerpo.id}/valores`;
    const valor = {
      fuente: 'matricula_fiscal',
      vigenteDesde: '2026-01-01',
      origen: 'autoavaluo',
      valorTotal: '1000.00',
    };
    const registrado = await cuenta.propietario.post(url, valor);

    const lista = await encargado.get(url);
    const registro = await encargado.post(url, { ...valor, vigenteDesde: '2027-01-01' });
    const baja = await encargado.delete(`${url}/${registrado.cuerpo.id}`);

    expect([lista.estado, registro.estado, baja.estado]).toEqual([404, 404, 404]);
    expect((await cuenta.propietario.get(url)).cuerpo).toHaveLength(1);
  });

  it('no crea, mueve, cambia, inactiva ni elimina en una localidad que no ve', async () => {
    const propio = await encargado.post(RUTA, datos({ nombre: 'Del encargado', numeroDeFinca: '20' }));
    const ajeno = await cuenta.propietario.post(
      RUTA,
      datos({ nombre: 'Del propietario', numeroDeFinca: '21', localidadId: localidadDelPropietario }),
    );

    const creado = await encargado.post(
      RUTA,
      datos({ nombre: 'Nuevo ajeno', numeroDeFinca: '22', localidadId: localidadDelPropietario }),
    );
    const movido = await encargado.put(
      `${RUTA}/${propio.cuerpo.id}`,
      datos({ nombre: 'Del encargado', numeroDeFinca: '20', localidadId: localidadDelPropietario }),
    );

    expect([propio.estado, creado.estado, movido.estado]).toEqual([201, 404, 404]);
    expect((await encargado.put(`${RUTA}/${ajeno.cuerpo.id}`, datos({ numeroDeFinca: '21' }))).estado).toBe(404);
    expect((await encargado.post(`${RUTA}/${ajeno.cuerpo.id}/inactivar`, {})).estado).toBe(404);
    expect((await encargado.delete(`${RUTA}/${ajeno.cuerpo.id}`)).estado).toBe(404);
  });

  it('crea y mueve dentro de sus localidades', async () => {
    const creado = await encargado.post(
      RUTA,
      datos({ nombre: 'En su localidad', numeroDeFinca: '30', localidadId: localidadDelEncargado }),
    );
    const sinLocalidad = await encargado.put(
      `${RUTA}/${creado.cuerpo.id}`,
      datos({ nombre: 'En su localidad', numeroDeFinca: '30' }),
    );

    expect(creado.estado).toBe(201);
    expect(creado.cuerpo.localidadNombre).toBe('Localidad ENC-1');
    expect(sinLocalidad.cuerpo.localidadId).toBeNull();
  });

  it('no acepta una localidad de otra cuenta', async () => {
    const conAjena = await cuenta.propietario.post(
      RUTA,
      datos({ nombre: 'Con ajena', numeroDeFinca: '40', localidadId: localidadAjena }),
    );

    expect(conAjena.estado).toBe(404);
  });

  it('una localidad con inmuebles no se elimina (se inactiva)', async () => {
    const localidad = await crearLocalidad(cuenta.propietario, 'USO-1');
    await cuenta.propietario.post(
      RUTA,
      datos({ nombre: 'Usa la localidad', numeroDeFinca: '50', localidadId: localidad }),
    );

    const baja = await cuenta.propietario.delete(`/api/empresas/localidades/${localidad}`);

    expect(baja.estado).toBe(409);
  });

  it('una empresa con inmuebles, sin movimientos, se puede eliminar', async () => {
    const nueva = await cuenta.propietario.post('/api/empresas', { nombre: 'Finca Desechable' });
    await cuenta.propietario.put('/api/sesion/empresa-activa', { empresaId: nueva.cuerpo.id });
    const local = await crearLocalidad(cuenta.propietario, 'DES-1');
    const inmueble = await cuenta.propietario.post(
      RUTA,
      datos({ nombre: 'Desechable', numeroDeFinca: '60', localidadId: local }),
    );

    await comoPropietario('delete from core.empresas where id = $1', [nueva.cuerpo.id]);
    const quedan = await comoPropietario('select 1 from empresas.inmuebles where id = $1', [inmueble.cuerpo.id]);

    expect(inmueble.estado).toBe(201);
    expect(quedan).toEqual([]);
    await cuenta.propietario.put('/api/sesion/empresa-activa', { empresaId: cuenta.empresaId });
  });
});

/** La plantilla con una fila: los valores se ponen por el título de su columna. */
async function libroConUnaFila(usuario: ClienteApi, valores: Record<string, unknown>): Promise<Buffer> {
  const plantilla = (await usuario.get(`${RUTA}/plantilla`)).cuerpo as Buffer;
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(plantilla as unknown as ExcelJS.Buffer);
  const hoja = libro.worksheets[0]!;
  hoja.getRow(1).eachCell((celda, columna) => {
    const valor = valores[String(celda.value).replace(/\s*\*$/, '')];
    if (valor !== undefined) hoja.getRow(2).getCell(columna).value = valor as ExcelJS.CellValue;
  });
  return Buffer.from(await libro.xlsx.writeBuffer());
}

const importar = (contenido: Buffer, ensayo: boolean) =>
  cuenta.propietario.subirImagen('POST', `${RUTA}/importar?ensayo=${ensayo}`, {
    nombreArchivo: 'inmuebles.xlsx',
    tipoMime: TIPO_EXCEL,
    contenido,
  });

const filaExcel = (nombre: string, finca: string) => ({
  Nombre: nombre,
  'Situación registral': 'Inscrito en el registro',
  Registro: 'Registro General de la Propiedad',
  'Número de finca': finca,
  Folio: '9',
  Libro: '8B',
  'Departamento del libro': '01',
  Titularidad: 'Propia',
  'Titulación supletoria en trámite': 'No',
  Localidad: 'Localidad PRO-1',
});

describe('Excel de inmuebles', () => {
  it('importa por las mismas reglas del formulario, con la localidad por su nombre', async () => {
    const libro = await libroConUnaFila(cuenta.propietario, filaExcel('Importado', '700'));

    const ensayo = await importar(libro, true);
    const real = await importar(libro, false);
    const guardado = await comoPropietario<{ localidad_id: string; activo: boolean }>(
      "select localidad_id, activo from empresas.inmuebles where nombre = 'Importado'",
      [],
    );

    expect(ensayo.cuerpo).toMatchObject({ guardado: false });
    expect(real.estado).toBe(200);
    expect(guardado).toEqual([{ localidad_id: localidadDelPropietario, activo: true }]);
  });

  it('informa por fila el inmueble inscrito sin folio y no guarda nada', async () => {
    const libro = await libroConUnaFila(cuenta.propietario, { ...filaExcel('Incompleto', '701'), Folio: '' });

    const revision = await importar(libro, false);
    const guardados = await comoPropietario("select 1 from empresas.inmuebles where nombre = 'Incompleto'", []);

    expect(revision.cuerpo.guardado).toBe(false);
    expect(JSON.stringify(revision.cuerpo)).toContain('inscrito necesita');
    expect(guardados).toEqual([]);
  });

  it('exportar y bajar la plantilla piden su permiso, y la hoja lleva el valor vigente de cada fuente', async () => {
    const exportado = await cuenta.propietario.get(`${RUTA}/exportar`);
    const sinPermiso = await encargado.get(`${RUTA}/plantilla`);
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(exportado.cuerpo as unknown as ExcelJS.Buffer);
    const titulos = String(libro.worksheets[0]!.getRow(1).values);

    expect(exportado.estado).toBe(200);
    expect(sinPermiso.estado).toBe(403);
    expect(titulos).toContain('Matrícula fiscal: valor total');
    expect(titulos).toContain('Catastro municipal: vigente desde');
  });
});
