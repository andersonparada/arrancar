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

const NOMBRES_ESPECIALES: Record<string, string> = {
  primario: 'Cosechas del Valle',
  pecuario: 'Granja Los Alamos',
  sin_inscripcion: 'Vendedor Ambulante Mario',
  pequeno_contribuyente_electronico: 'Carlos Ramirez Taller',
  contribuyente_agropecuario: 'Hortalizas Quetzal',
};

describe('datos fiscales con el formulario de Proveedores', () => {
  it('un proveedor sin sección tiene los valores por omisión, sin fila guardada', async () => {
    const proveedor = await registrarProveedor('Sin datos');

    const datos = await cuenta.propietario.get(rutaDeProveedor(await proveedorIdDe(proveedor.cuerpo.id)));

    expect(datos.cuerpo).toEqual({
      proveedorId: await proveedorIdDe(proveedor.cuerpo.id),
      regimenIva: 'general',
      regimenIsr: 'utilidades',
      esAgenteDeRetencionIva: false,
      seLeRetieneIva: true,
      seLeRetieneIsr: false,
      seLeRetieneIvaPequenoContribuyente: false,
      guardado: false,
    });
  });

  it('se guardan junto con el proveedor nuevo, y lo que falta se propone según el régimen', async () => {
    const respuesta = await registrarProveedor('Pequeño', seccionDeProveedor({ regimenIva: 'pequeno_contribuyente' }));
    const id = await proveedorIdDe(respuesta.cuerpo.id);

    const datos = await cuenta.propietario.get(rutaDeProveedor(id));

    expect(respuesta.estado).toBe(201);
    expect(datos.cuerpo).toMatchObject({
      regimenIva: 'pequeno_contribuyente',
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
      seccionDeProveedor({ regimenIva: 'pequeno_contribuyente', regimenIsr: 'utilidades' }),
    );
    const buscados = await cuenta.propietario.get('/api/terceros?texto=Rechazado');

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error.detalles).toEqual([
      {
        campo: 'secciones.libro-de-compras.regimenIsr',
        mensaje: 'Este régimen de IVA no tiene régimen de ISR aparte.',
      },
    ]);
    expect(buscados.cuerpo).toEqual([]);
  });

  it('un valor fuera de catálogo también se rechaza por campo', async () => {
    const respuesta = await registrarProveedor('Inventado', seccionDeProveedor({ regimenIsr: 'inventado' }));

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error.detalles[0].campo).toBe('secciones.libro-de-compras.regimenIsr');
  });

  it.each([
    'primario',
    'pecuario',
    'sin_inscripcion',
    'pequeno_contribuyente_electronico',
    'contribuyente_agropecuario',
  ])('%s: se guarda sin régimen de ISR y sin retenciones', async (regimenIva) => {
    const respuesta = await registrarProveedor(NOMBRES_ESPECIALES[regimenIva]!, seccionDeProveedor({ regimenIva }));
    const datos = await cuenta.propietario.get(rutaDeProveedor(await proveedorIdDe(respuesta.cuerpo.id)));

    expect(datos.cuerpo).toMatchObject({
      regimenIva,
      regimenIsr: null,
      esAgenteDeRetencionIva: false,
      seLeRetieneIva: false,
      seLeRetieneIsr: false,
      seLeRetieneIvaPequenoContribuyente: false,
      guardado: true,
    });
  });

  it('el no domiciliado lleva su régimen de ISR; el general puede ser exento de ISR', async () => {
    const extranjero = await registrarProveedor('Extranjero', seccionDeProveedor({ regimenIva: 'no_domiciliado' }));
    const exento = await registrarProveedor('Exento de ISR', seccionDeProveedor({ regimenIsr: 'exento' }));

    const deExtranjero = await cuenta.propietario.get(rutaDeProveedor(await proveedorIdDe(extranjero.cuerpo.id)));
    const deExento = await cuenta.propietario.get(rutaDeProveedor(await proveedorIdDe(exento.cuerpo.id)));

    expect(deExtranjero.cuerpo).toMatchObject({ regimenIva: 'no_domiciliado', regimenIsr: 'no_domiciliado' });
    expect(deExento.cuerpo).toMatchObject({ regimenIva: 'general', regimenIsr: 'exento', seLeRetieneIsr: false });
  });

  it('un régimen de IVA fuera de catálogo o un ISR que no le corresponde se rechazan por campo', async () => {
    const inventado = await registrarProveedor('Régimen inventado', seccionDeProveedor({ regimenIva: 'inventado' }));
    const cruzado = await registrarProveedor(
      'ISR cruzado',
      seccionDeProveedor({ regimenIva: 'primario', regimenIsr: 'exento' }),
    );

    expect(inventado.estado).toBe(400);
    expect(inventado.cuerpo.error.detalles[0].campo).toBe('secciones.libro-de-compras.regimenIva');
    expect(cruzado.estado).toBe(400);
    expect(cruzado.cuerpo.error.detalles[0].campo).toBe('secciones.libro-de-compras.regimenIsr');
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
