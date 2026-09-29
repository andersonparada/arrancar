import pg from 'pg';
import { beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../configuracion.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import type { ClienteApi } from './soporte/cliente-api.js';

const CLAVE = 'libro-de-compras';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let sinModulo: CuentaDePrueba;

interface Auditado {
  recurso: string;
  accion: string;
  registro_id: string;
  anterior: Record<string, unknown> | null;
}

async function auditoriaDe(recurso: string): Promise<Auditado[]> {
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  const { rows } = await conexion.query<Auditado>(
    'select recurso, accion, registro_id, anterior from core.auditoria where cuenta_id = $1 and recurso = $2 order by creado_en',
    [cuenta.cuentaId, recurso],
  );
  await conexion.end();
  return rows;
}

const seccionDeProveedor = (cambios: Record<string, unknown> = {}) => ({ [CLAVE]: { ...cambios } });
const rutaDeProveedor = (id: string) => `/api/libro-de-compras/proveedores/${id}/datos-fiscales`;
const rutaDeEmpresa = (id: string) => `/api/libro-de-compras/empresas/${id}/datos-fiscales`;

/** El id del papel de proveedor de un tercero, que es el que usan los datos fiscales. */
async function proveedorIdDe(terceroId: string): Promise<string> {
  const ficha = await cuenta.propietario.get(`/api/terceros/${terceroId}`);
  return ficha.cuerpo.proveedor.id;
}

function registrarProveedor(nombres: string, secciones?: unknown, quien: ClienteApi = cuenta.propietario) {
  return quien.post('/api/terceros', { tipo: 'individual', nombres, papel: { tipo: 'proveedor' }, secciones });
}

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Fiscal',
    usuario: 'propietariofiscal',
    modulos: ['terceros', CLAVE],
  });
  sinModulo = await darDeAltaCuenta(entorno, {
    nombre: 'Sin libro',
    usuario: 'propietariosinlibro',
    modulos: ['terceros'],
  });
});

describe('datos fiscales con el formulario de Proveedores', () => {
  it('un proveedor sin sección tiene los valores por omisión, sin fila guardada', async () => {
    const proveedor = await registrarProveedor('Sin datos');

    const datos = await cuenta.propietario.get(rutaDeProveedor(await proveedorIdDe(proveedor.cuerpo.id)));

    expect(datos.cuerpo).toEqual({
      proveedorId: await proveedorIdDe(proveedor.cuerpo.id),
      esPequenoContribuyente: false,
      regimenIsr: 'utilidades',
      esAgenteDeRetencionIva: false,
      seLeRetieneIva: true,
      seLeRetieneIsr: false,
      seLeRetieneIvaPequenoContribuyente: false,
      guardado: false,
    });
  });

  it('se guardan junto con el proveedor nuevo, y lo que falta se propone según el régimen', async () => {
    const respuesta = await registrarProveedor('Pequeño', seccionDeProveedor({ esPequenoContribuyente: true }));
    const id = await proveedorIdDe(respuesta.cuerpo.id);

    const datos = await cuenta.propietario.get(rutaDeProveedor(id));

    expect(respuesta.estado).toBe(201);
    expect(datos.cuerpo).toMatchObject({
      esPequenoContribuyente: true,
      regimenIsr: null,
      seLeRetieneIva: false,
      seLeRetieneIvaPequenoContribuyente: true,
      guardado: true,
    });
  });

  it('al cambiar el proveedor se corrigen y el cambio queda en la auditoría con lo que había', async () => {
    const creado = await registrarProveedor('Cambiante', seccionDeProveedor({ regimenIsr: 'utilidades' }));
    const id = await proveedorIdDe(creado.cuerpo.id);

    const cambio = await cuenta.propietario.put(`/api/terceros/${creado.cuerpo.id}/proveedor`, {
      secciones: seccionDeProveedor({ regimenIsr: 'opcional_simplificado' }),
    });
    const datos = await cuenta.propietario.get(rutaDeProveedor(id));
    const auditado = (await auditoriaDe('libro-de-compras.datos-fiscales-de-proveedor')).filter(
      (fila) => fila.registro_id === id,
    );

    expect(cambio.estado).toBe(200);
    expect(datos.cuerpo).toMatchObject({ regimenIsr: 'opcional_simplificado', seLeRetieneIsr: true });
    expect(auditado).toHaveLength(1);
    expect(auditado[0]).toMatchObject({ accion: 'corregir', anterior: { regimenIsr: 'utilidades', guardado: true } });
  });

  it('una sección inválida marca el campo con su prefijo y no guarda ni el proveedor', async () => {
    const respuesta = await registrarProveedor(
      'Rechazado',
      seccionDeProveedor({ esPequenoContribuyente: true, regimenIsr: 'utilidades' }),
    );
    const buscados = await cuenta.propietario.get('/api/terceros?texto=Rechazado');

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error.detalles).toEqual([
      {
        campo: 'secciones.libro-de-compras.regimenIsr',
        mensaje: 'El pequeño contribuyente no tiene régimen de ISR aparte.',
      },
    ]);
    expect(buscados.cuerpo).toEqual([]);
  });

  it('un valor fuera de catálogo también se rechaza por campo', async () => {
    const respuesta = await registrarProveedor('Inventado', seccionDeProveedor({ regimenIsr: 'inventado' }));

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error.detalles[0].campo).toBe('secciones.libro-de-compras.regimenIsr');
  });

  it('un proveedor que no existe responde 404', async () => {
    const respuesta = await cuenta.propietario.get(rutaDeProveedor(crypto.randomUUID()));

    expect(respuesta.estado).toBe(404);
  });

  it('quien puede ver terceros los lee; quien no, recibe 403', async () => {
    const proveedor = await registrarProveedor('Visible');
    const id = await proveedorIdDe(proveedor.cuerpo.id);
    const lector = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Lector',
      apellidos: 'Fiscal',
      permisos: ['terceros.ver'],
    });
    const otro = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Solo',
      apellidos: 'Empresas',
      permisos: ['empresas.ver'],
    });

    expect((await lector.get(rutaDeProveedor(id))).estado).toBe(200);
    expect((await otro.get(rutaDeProveedor(id))).estado).toBe(403);
  });
});

describe('datos fiscales con el formulario de Empresas', () => {
  it('una empresa sin sección tiene los valores por omisión', async () => {
    const datos = await cuenta.propietario.get(rutaDeEmpresa(cuenta.empresaId));

    expect(datos.cuerpo).toEqual({
      empresaId: cuenta.empresaId,
      regimenIva: 'general',
      regimenIsr: 'utilidades',
      agenteDeRetencionIva: 'ninguno',
      esAgenteDeRetencionIsr: false,
      guardado: false,
    });
  });

  it('se guardan al crear una empresa nueva, aunque no sea la activa', async () => {
    const nueva = await cuenta.propietario.post('/api/empresas', {
      nombre: 'Exportadora',
      secciones: { [CLAVE]: { agenteDeRetencionIva: 'exportador', esAgenteDeRetencionIsr: true } },
    });

    const datos = await cuenta.propietario.get(rutaDeEmpresa(nueva.cuerpo.id));

    expect(nueva.estado).toBe(201);
    expect(datos.cuerpo).toMatchObject({
      agenteDeRetencionIva: 'exportador',
      esAgenteDeRetencionIsr: true,
      guardado: true,
    });
  });

  it('al editar una empresa que no es la activa se corrigen, con auditoría; la activa no cambia', async () => {
    const otra = await cuenta.propietario.post('/api/empresas', { nombre: 'Parcela fiscal' });
    const ruta = `/api/empresas/${otra.cuerpo.id}`;

    const cambio = await cuenta.propietario.put(ruta, {
      nombre: 'Parcela fiscal',
      secciones: { [CLAVE]: { regimenIva: 'pequeno_contribuyente' } },
    });
    const datos = await cuenta.propietario.get(rutaDeEmpresa(otra.cuerpo.id));
    const activa = await cuenta.propietario.get(rutaDeEmpresa(cuenta.empresaId));
    const auditado = (await auditoriaDe('libro-de-compras.datos-fiscales-de-empresa')).filter(
      (fila) => fila.registro_id === otra.cuerpo.id,
    );

    expect(cambio.estado).toBe(200);
    expect(datos.cuerpo).toMatchObject({ regimenIva: 'pequeno_contribuyente', guardado: true });
    expect(activa.cuerpo.guardado).toBe(false);
    expect(auditado).toEqual([
      expect.objectContaining({ accion: 'corregir', anterior: expect.objectContaining({ regimenIva: 'general' }) }),
    ]);
  });

  it('una sección inválida marca el campo con su prefijo y no crea la empresa ni cambia la editada', async () => {
    const invalida = { [CLAVE]: { regimenIva: 'pequeno_contribuyente', agenteDeRetencionIva: 'otro' } };
    const creada = await cuenta.propietario.post('/api/empresas', { nombre: 'Empresa rechazada', secciones: invalida });
    const editable = await cuenta.propietario.post('/api/empresas', { nombre: 'Editable' });
    const editada = await cuenta.propietario.put(`/api/empresas/${editable.cuerpo.id}`, {
      nombre: 'Editable cambiada',
      secciones: invalida,
    });
    const nombres = (await cuenta.propietario.get('/api/empresas')).cuerpo.map((e: { nombre: string }) => e.nombre);

    expect(creada.estado).toBe(400);
    expect(creada.cuerpo.error.detalles[0].campo).toBe('secciones.libro-de-compras.agenteDeRetencionIva');
    expect(editada.estado).toBe(400);
    expect(nombres).toContain('Editable');
    expect(nombres).not.toContain('Editable cambiada');
    expect(nombres).not.toContain('Empresa rechazada');
  });

  it('una empresa de otra cuenta o que no existe responde 404', async () => {
    const ajena = await darDeAltaCuenta(entorno, {
      nombre: 'Ajena fiscal',
      usuario: 'propietarioajenofiscal',
      modulos: ['terceros', CLAVE],
    });

    expect((await cuenta.propietario.get(rutaDeEmpresa(ajena.empresaId))).estado).toBe(404);
    expect((await cuenta.propietario.get(rutaDeEmpresa(crypto.randomUUID()))).estado).toBe(404);
  });

  it('una empresa de la cuenta a la que el usuario no entra responde 404; quien puede ver empresas, sí lee la suya', async () => {
    const lector = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Lectora',
      apellidos: 'Empresas',
      permisos: ['empresas.ver'],
    });
    const ajena = await cuenta.propietario.post('/api/empresas', { nombre: 'Sin acceso del lector' });

    expect((await lector.get(rutaDeEmpresa(cuenta.empresaId))).estado).toBe(200);
    expect((await lector.get(rutaDeEmpresa(ajena.cuerpo.id))).estado).toBe(404);
  });
});

describe('con el módulo inactivo', () => {
  it('las secciones se ignoran y las rutas de lectura no están disponibles', async () => {
    const proveedor = await registrarProveedor(
      'Sin módulo',
      seccionDeProveedor({ regimenIsr: 'inventado' }),
      sinModulo.propietario,
    );
    const empresa = await sinModulo.propietario.post('/api/empresas', {
      nombre: 'Sin módulo',
      secciones: { [CLAVE]: { regimenIva: 'inventado' } },
    });

    expect(proveedor.estado).toBe(201);
    expect(empresa.estado).toBe(201);
    expect((await sinModulo.propietario.get(rutaDeEmpresa(sinModulo.empresaId))).estado).toBe(403);
  });
});
