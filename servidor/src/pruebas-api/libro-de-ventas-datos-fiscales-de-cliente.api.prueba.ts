/**
 * Datos fiscales del cliente (LV-1): la sección «libro-de-ventas» del formulario de Clientes, su lectura, la
 * auditoría del cambio, el aislamiento entre cuentas, los permisos y el módulo apagado.
 */
import pg from 'pg';
import { beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../configuracion.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import type { ClienteApi } from './soporte/cliente-api.js';

const CLAVE = 'libro-de-ventas';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let otraCuenta: CuentaDePrueba;
let sinModulo: CuentaDePrueba;

interface Auditado {
  accion: string;
  registro_id: string;
  anterior: Record<string, unknown> | null;
}

async function auditoriaDe(recurso: string): Promise<Auditado[]> {
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  const { rows } = await conexion.query<Auditado>(
    'select accion, registro_id, anterior from core.auditoria where cuenta_id = $1 and recurso = $2 order by creado_en',
    [cuenta.cuentaId, recurso],
  );
  await conexion.end();
  return rows;
}

const seccion = (cambios: Record<string, unknown> = {}) => ({ [CLAVE]: { ...cambios } });
const ruta = (clienteId: string) => `/api/libro-de-ventas/clientes/${clienteId}/datos-fiscales`;

async function clienteIdDe(quien: ClienteApi, terceroId: string): Promise<string> {
  return (await quien.get(`/api/terceros/${terceroId}`)).cuerpo.cliente.id;
}

function registrarCliente(nombres: string, secciones?: unknown, quien: ClienteApi = cuenta.propietario) {
  return quien.post('/api/terceros', {
    tipo: 'individual',
    nombres,
    papel: { tipo: 'cliente', clase: 'directo' },
    secciones,
  });
}

beforeAll(async () => {
  const modulos = ['terceros', 'libro-de-compras', CLAVE];
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Ventas', usuario: 'propietarioventas', modulos });
  otraCuenta = await darDeAltaCuenta(entorno, { nombre: 'Ajena', usuario: 'propietarioajenaventas', modulos });
  sinModulo = await darDeAltaCuenta(entorno, {
    nombre: 'Sin ventas',
    usuario: 'propietariosinventas',
    modulos: ['terceros'],
  });
});

describe('datos fiscales con el formulario de Clientes', () => {
  it('un cliente sin sección no retiene nada y no tiene fila guardada', async () => {
    const cliente = await registrarCliente('Sin datos');
    const id = await clienteIdDe(cuenta.propietario, cliente.cuerpo.id);

    const datos = await cuenta.propietario.get(ruta(id));

    expect(datos.cuerpo).toEqual({
      clienteId: id,
      agenteDeRetencionIva: 'ninguno',
      exportaProductosAgropecuarios: false,
      retieneIsr: false,
      retieneIvaAPequenoContribuyente: false,
      guardado: false,
    });
  });

  it('se guardan junto con el cliente nuevo y lo que falta vale lo de omisión', async () => {
    const respuesta = await registrarCliente('Retenedor', seccion({ agenteDeRetencionIva: 'contribuyente_especial' }));
    const id = await clienteIdDe(cuenta.propietario, respuesta.cuerpo.id);

    const datos = await cuenta.propietario.get(ruta(id));

    expect(respuesta.estado).toBe(201);
    expect(datos.cuerpo).toMatchObject({
      agenteDeRetencionIva: 'contribuyente_especial',
      retieneIsr: false,
      guardado: true,
    });
  });

  it('al cambiar el cliente se corrigen y el cambio queda en la auditoría con lo que había', async () => {
    const creado = await registrarCliente('Cambiante', seccion({ agenteDeRetencionIva: 'sector_publico' }));
    const id = await clienteIdDe(cuenta.propietario, creado.cuerpo.id);

    const cambio = await cuenta.propietario.put(`/api/terceros/${creado.cuerpo.id}/cliente`, {
      clase: 'directo',
      secciones: seccion({ agenteDeRetencionIva: 'sector_publico', retieneIsr: true }),
    });
    const datos = await cuenta.propietario.get(ruta(id));
    const auditado = (await auditoriaDe('libro-de-ventas.datos-fiscales-de-cliente')).filter(
      (fila) => fila.registro_id === id,
    );

    expect(cambio.estado).toBe(200);
    expect(datos.cuerpo).toMatchObject({ agenteDeRetencionIva: 'sector_publico', retieneIsr: true });
    expect(auditado).toHaveLength(2);
    expect(auditado[1]).toMatchObject({
      accion: 'corregir',
      anterior: { retieneIsr: false, agenteDeRetencionIva: 'sector_publico', guardado: true },
    });
  });

  it('una sección contradictoria marca el campo con su prefijo y no guarda ni el cliente', async () => {
    const respuesta = await registrarCliente('Rechazado', seccion({ retieneIvaAPequenoContribuyente: true }));
    const buscados = await cuenta.propietario.get('/api/terceros?texto=Rechazado');

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error.detalles).toEqual([
      {
        campo: 'secciones.libro-de-ventas.retieneIvaAPequenoContribuyente',
        mensaje: 'Solo un agente de retención del IVA retiene el IVA de pequeño contribuyente.',
      },
    ]);
    expect(buscados.cuerpo).toEqual([]);
  });

  it('un agente fuera de catálogo también se rechaza por campo', async () => {
    const respuesta = await registrarCliente('Inventado', seccion({ agenteDeRetencionIva: 'inventado' }));

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error.detalles[0].campo).toBe('secciones.libro-de-ventas.agenteDeRetencionIva');
  });

  it('un exportador de productos agropecuarios se guarda con su marca', async () => {
    const respuesta = await registrarCliente(
      'Exportadora',
      seccion({ agenteDeRetencionIva: 'exportador', exportaProductosAgropecuarios: true }),
    );
    const datos = await cuenta.propietario.get(ruta(await clienteIdDe(cuenta.propietario, respuesta.cuerpo.id)));

    expect(datos.cuerpo).toMatchObject({ agenteDeRetencionIva: 'exportador', exportaProductosAgropecuarios: true });
  });
});

describe('lectura y aislamiento', () => {
  it('un cliente que no existe, o de otra cuenta, responde 404', async () => {
    const ajeno = await registrarCliente('De otra cuenta', undefined, otraCuenta.propietario);
    const idAjeno = await clienteIdDe(otraCuenta.propietario, ajeno.cuerpo.id);

    expect((await cuenta.propietario.get(ruta(crypto.randomUUID()))).estado).toBe(404);
    expect((await cuenta.propietario.get(ruta(idAjeno))).estado).toBe(404);
  });

  it('quien puede ver terceros los lee; quien no, recibe 403', async () => {
    const cliente = await registrarCliente('Visible');
    const id = await clienteIdDe(cuenta.propietario, cliente.cuerpo.id);
    const lector = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Lector',
      apellidos: 'Ventas',
      permisos: ['terceros.ver'],
    });
    const otro = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Solo',
      apellidos: 'Empresas',
      permisos: ['empresas.ver'],
    });

    expect((await lector.get(ruta(id))).estado).toBe(200);
    expect((await otro.get(ruta(id))).estado).toBe(403);
  });
});

describe('con el módulo inactivo', () => {
  it('la sección se ignora y la ruta de lectura no está disponible', async () => {
    const cliente = await registrarCliente(
      'Sin módulo',
      seccion({ agenteDeRetencionIva: 'inventado' }),
      sinModulo.propietario,
    );
    const id = await clienteIdDe(sinModulo.propietario, cliente.cuerpo.id);

    expect(cliente.estado).toBe(201);
    expect((await sinModulo.propietario.get(ruta(id))).estado).toBe(403);
  });
});
