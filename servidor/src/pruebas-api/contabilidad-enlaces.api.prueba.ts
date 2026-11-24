import { beforeAll, describe, expect, it } from 'vitest';
import { empresaConInicio, filasDeExcel, importarExcel, libroConFilas } from './soporte/apertura-por-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA = '/api/contabilidad/enlaces';
const RUTA_CUENTAS = '/api/contabilidad/cuentas';
const MODULOS = ['terceros', 'contabilidad', 'bancos', 'libro-de-compras', 'cuentas-por-pagar'];
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let otraCuenta: CuentaDePrueba;
let cuentaBancariaId: string;
let categoriaId: string;
let conceptoId: string;
const cuentas: Record<string, string> = {};

const detalle = (codigo: string, nombre: string, cambios: Record<string, unknown> = {}) => ({
  codigo,
  nombre,
  esDeDetalle: true,
  naturaleza: 'deudora',
  tipo: 'balance',
  rubro: 'efectivo',
  claseDeFlujo: 'efectivo',
  ...cambios,
});

async function crearCuentas(propia: CuentaDePrueba) {
  await propia.propietario.put('/api/contabilidad/inicio', {
    fecha: '2026-01-01',
    caso: 'desde_la_carga',
    mascara: '9.9.99.99',
  });
  await propia.propietario.post(RUTA_CUENTAS, {
    codigo: '1',
    nombre: 'Activo',
    esDeDetalle: false,
    naturaleza: 'deudora',
    tipo: 'balance',
  });
  const creadas: Record<string, string> = {};
  for (const [codigo, nombre] of [
    ['1.1', 'Banco monetario'],
    ['1.2', 'IVA crédito'],
    ['1.3', 'Proveedores'],
  ] as const) {
    const respuesta = await propia.propietario.post(RUTA_CUENTAS, detalle(codigo, nombre));
    expect(respuesta.estado).toBe(201);
    creadas[codigo] = respuesta.cuerpo.id;
  }
  return creadas;
}

async function crearLlaves() {
  const banco = await cuenta.propietario.post('/api/bancos/bancos', { nombre: 'Banco de prueba', activo: true });
  const bancaria = await cuenta.propietario.post('/api/bancos/cuentas-bancarias', {
    nombre: 'Monetaria principal',
    numero: '001-1',
    tipo: 'monetaria',
    bancoId: banco.cuerpo.id,
    activo: true,
  });
  const categoria = await cuenta.propietario.post('/api/proveedores/categorias', { nombre: 'Insumos', activo: true });
  const concepto = await cuenta.propietario.post('/api/libro-de-compras/conceptos-de-gasto', {
    nombre: 'Alimento para ganado',
    tipoPorOmision: 'bien',
    esProductoAgropecuario: true,
    esActivoFijo: false,
    activo: true,
  });
  cuentaBancariaId = bancaria.cuerpo.id;
  categoriaId = categoria.cuerpo.id;
  conceptoId = concepto.cuerpo.id;
  expect([bancaria.estado, categoria.estado, concepto.estado]).toEqual([201, 201, 201]);
}

beforeAll(async () => {
  cuenta = await empresaConInicio(entorno, { nombre: 'Generada', usuario: 'propietarioenlaces', modulos: MODULOS });
  otraCuenta = await empresaConInicio(entorno, { nombre: 'Ajena', usuario: 'propietarioajeno', modulos: MODULOS });
  Object.assign(cuentas, await crearCuentas(cuenta));
  await crearCuentas(otraCuenta);
  await crearLlaves();
});

const enlazar = (rol: string, cuentaId: string, llave: string | null = null) =>
  cuenta.propietario.put(`${RUTA}/${rol}`, { llave, cuentaId });

describe('enlaces contables por API', () => {
  it('lista los roles de los módulos activos, cada uno con lo que ofrece', async () => {
    const respuesta = await cuenta.propietario.get(RUTA);
    const roles = respuesta.cuerpo.map((rol: { rol: string }) => rol.rol);

    expect(respuesta.estado).toBe(200);
    expect(roles).toEqual(
      expect.arrayContaining(['proveedores', 'cuenta_bancaria', 'gasto_por_concepto', 'puente_de_apertura']),
    );
    expect(roles).not.toContain('activo_fijo');
    expect(respuesta.cuerpo.find((rol: { rol: string }) => rol.rol === 'cuenta_bancaria')).toMatchObject({
      nombreDeLlave: 'Cuenta bancaria',
      esDeAuxiliar: true,
      opcional: false,
      enlaces: [],
    });
    expect(respuesta.cuerpo.find((rol: { rol: string }) => rol.rol === 'iva_no_acreditable')).toMatchObject({
      opcional: true,
    });
  });

  it('las llaves salen de Bancos, Libro de compras y Cuentas por pagar', async () => {
    const llaves = async (rol: string) => (await cuenta.propietario.get(`${RUTA}/llaves/${rol}`)).cuerpo;

    expect(await llaves('cuenta_bancaria')).toEqual([
      { llave: cuentaBancariaId, nombre: 'Monetaria principal', activo: true },
    ]);
    expect(await llaves('proveedores')).toEqual([{ llave: categoriaId, nombre: 'Insumos', activo: true }]);
    expect(await llaves('gasto_por_concepto')).toEqual([
      { llave: conceptoId, nombre: 'Alimento para ganado', activo: true },
    ]);
    expect((await llaves('retencion_por_pagar')).map((l: { llave: string }) => l.llave)).toContain('iva_otro_agente');
    await cuenta.propietario.get('/api/bancos/conceptos'); // Bancos siembra sus conceptos al abrir el catálogo
    expect((await llaves('concepto_bancario')).length).toBeGreaterThan(20);
    expect(await llaves('iva_credito_fiscal')).toEqual([]);
  });

  it('enlaza, cambia y quita, y marca de control la cuenta de un auxiliar', async () => {
    const creado = await enlazar('cuenta_bancaria', cuentas['1.1']!, cuentaBancariaId);
    const cambiado = await enlazar('cuenta_bancaria', cuentas['1.3']!, cuentaBancariaId);
    const marcada = (await cuenta.propietario.get(`${RUTA_CUENTAS}/${cuentas['1.3']}`)).cuerpo;
    const quitado = await cuenta.propietario.delete(`${RUTA}/${creado.cuerpo.id}`);

    expect(creado.cuerpo).toMatchObject({
      llave: cuentaBancariaId,
      llaveNombre: 'Monetaria principal',
      cuentaCodigo: '1.1',
    });
    expect(cambiado.cuerpo).toMatchObject({ id: creado.cuerpo.id, cuentaCodigo: '1.3' });
    expect(marcada.esDeControl).toBe(true);
    expect(quitado.estado).toBe(204);
    expect((await cuenta.propietario.delete(`${RUTA}/${creado.cuerpo.id}`)).estado).toBe(404);
  });

  it('dos quitar simultáneos del mismo enlace: uno lo quita y el otro no lo encuentra', async () => {
    const enlace = await enlazar('iva_credito_fiscal', cuentas['1.2']!);
    const quitar = () => cuenta.propietario.delete(`${RUTA}/${enlace.cuerpo.id}`);

    const estados = (await Promise.all([quitar(), quitar()])).map((respuesta) => respuesta.estado);

    expect(estados.sort()).toEqual([204, 404]);
  });

  it('rechaza una llave que no existe, una llave donde no va y una cuenta de mayor', async () => {
    const inventada = await enlazar('cuenta_bancaria', cuentas['1.1']!, crypto.randomUUID());
    const sobra = await enlazar('iva_credito_fiscal', cuentas['1.2']!, 'algo');
    const raiz = (await cuenta.propietario.get(RUTA_CUENTAS)).cuerpo.find((c: { codigo: string }) => c.codigo === '1');
    const mayor = await enlazar('iva_credito_fiscal', raiz.id);

    expect([inventada.estado, inventada.cuerpo.error.codigo]).toEqual([400, 'enlace_invalido']);
    expect([sobra.estado, sobra.cuerpo.error.codigo]).toEqual([400, 'enlace_invalido']);
    expect([mayor.estado, mayor.cuerpo.error.codigo]).toEqual([422, 'cuenta_no_es_de_detalle']);
  });

  it('una cuenta enlazada no se inactiva ni se elimina; con el enlace quitado, sí', async () => {
    const enlace = await enlazar('iva_credito_fiscal', cuentas['1.2']!);
    const datos = detalle('1.2', 'IVA crédito');

    const inactivar = await cuenta.propietario.put(`${RUTA_CUENTAS}/${cuentas['1.2']}`, { ...datos, activo: false });
    const eliminar = await cuenta.propietario.delete(`${RUTA_CUENTAS}/${cuentas['1.2']}`);
    await cuenta.propietario.delete(`${RUTA}/${enlace.cuerpo.id}`);
    const despues = await cuenta.propietario.put(`${RUTA_CUENTAS}/${cuentas['1.2']}`, { ...datos, activo: false });

    expect([inactivar.estado, inactivar.cuerpo.error.codigo]).toEqual([422, 'cuenta_con_enlaces']);
    expect(eliminar.estado).toBe(409);
    expect(despues.estado).toBe(200);
  });

  it('el enlace de otra empresa no se ve ni se quita', async () => {
    const ajeno = await otraCuenta.propietario.get(RUTA);
    const suyo = await enlazar('puente_de_apertura', cuentas['1.1']!);

    expect((await otraCuenta.propietario.delete(`${RUTA}/${suyo.cuerpo.id}`)).estado).toBe(404);
    expect(ajeno.cuerpo.every((rol: { enlaces: unknown[] }) => rol.enlaces.length === 0)).toBe(true);
  });
});

describe('enlaces contables: Excel y permisos', () => {
  it('exporta, y la plantilla importa por el nombre de la llave y el código de la cuenta', async () => {
    const exportado = await cuenta.propietario.get(`${RUTA}/exportar`);
    const filas = await filasDeExcel(exportado.cuerpo);
    const contenido = await libroConFilas(cuenta.propietario, RUTA, [
      { Rol: 'Proveedores', Llave: 'insumos', Cuenta: '1.3' },
      { Rol: 'IVA crédito fiscal', Cuenta: '1.1' },
    ]);

    const ensayo = await importarExcel(cuenta.propietario, RUTA, { contenido, ensayo: true });
    const real = await importarExcel(cuenta.propietario, RUTA, { contenido, ensayo: false });
    const enlaces = (await cuenta.propietario.get(RUTA)).cuerpo.flatMap((rol: { enlaces: unknown[] }) => rol.enlaces);

    expect(filas[0]).toEqual(['Rol', 'Llave', 'Cuenta']);
    expect(filas).toContainEqual(['Puente de apertura', undefined, '1.1']);
    expect(real.cuerpo.errores).toEqual([]);
    expect([ensayo.cuerpo.guardado, real.cuerpo.guardado]).toEqual([false, true]);
    expect(enlaces).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rol: 'proveedores', llave: categoriaId, cuentaCodigo: '1.3' }),
        expect.objectContaining({ rol: 'iva_credito_fiscal', llave: null, cuentaCodigo: '1.1' }),
      ]),
    );
  });

  it('un nombre de llave desconocido se informa en su fila y columna, sin guardar nada', async () => {
    const contenido = await libroConFilas(cuenta.propietario, RUTA, [
      { Rol: 'Cuenta bancaria', Llave: 'No existe', Cuenta: '1.1' },
    ]);

    const resultado = await importarExcel(cuenta.propietario, RUTA, { contenido, ensayo: false });

    expect(resultado.cuerpo.guardado).toBe(false);
    expect(resultado.cuerpo.errores).toEqual([expect.objectContaining({ fila: 2, columna: 'Llave' })]);
  });

  it('un rol y llave repetidos en el archivo se rechazan en la segunda fila, aunque cambie la cuenta', async () => {
    const contenido = await libroConFilas(cuenta.propietario, RUTA, [
      { Rol: 'IVA crédito fiscal', Cuenta: '1.1' },
      { Rol: 'IVA crédito fiscal', Cuenta: '1.3' },
    ]);

    const ensayo = await importarExcel(cuenta.propietario, RUTA, { contenido, ensayo: true });

    expect(ensayo.cuerpo.errores).toEqual([expect.objectContaining({ fila: 3, columna: 'Llave' })]);
  });

  it('cada acción exige su permiso', async () => {
    const lector = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Solo',
      apellidos: 'Lectura',
      permisos: ['contabilidad.enlaces.ver'],
    });

    expect((await lector.get(RUTA)).estado).toBe(200);
    expect((await lector.get(`${RUTA}/llaves/cuenta_bancaria`)).estado).toBe(200);
    expect((await lector.put(`${RUTA}/puente_de_apertura`, { llave: null, cuentaId: cuentas['1.1'] })).estado).toBe(
      403,
    );
    expect((await lector.delete(`${RUTA}/${crypto.randomUUID()}`)).estado).toBe(403);
    expect((await lector.get(`${RUTA}/exportar`)).estado).toBe(403);
    expect((await lector.get(`${RUTA}/plantilla`)).estado).toBe(403);
  });
});
