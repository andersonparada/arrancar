import pg from 'pg';
import { beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../configuracion.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const CLAVE = 'libro-de-compras';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;

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

const rutaDeEmpresa = (id: string) => `/api/libro-de-compras/empresas/${id}/datos-fiscales`;

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Fiscal de empresas',
    usuario: 'propietariofiscalempresas',
    modulos: ['terceros', CLAVE],
  });
});

const PERSONA = { tipoDePersona: 'juridica' };

describe('datos fiscales con el formulario de Empresas', () => {
  it('una empresa sin sección tiene el formulario vacío: sin tipo de persona y sin historial', async () => {
    const datos = await cuenta.propietario.get(rutaDeEmpresa(cuenta.empresaId));

    expect(datos.cuerpo).toEqual({
      empresaId: cuenta.empresaId,
      guardado: false,
      vigenteDesde: null,
      tipoDePersona: null,
      regimenIva: 'general',
      regimenIsr: 'utilidades',
      agenteDeRetencionIva: 'ninguno',
      esAgenteDeRetencionIsr: true,
      historial: [],
    });
  });

  it('agropecuario con persona jurídica explica que el régimen es solo de persona individual', async () => {
    const nueva = await cuenta.propietario.post('/api/empresas', {
      nombre: 'Agropecuaria jurídica',
      secciones: { [CLAVE]: { ...PERSONA, regimenIva: 'contribuyente_agropecuario' } },
    });

    expect(nueva.estado).toBe(400);
    expect(nueva.cuerpo.error.detalles[0].campo).toBe('secciones.libro-de-compras.tipoDePersona');
    expect(nueva.cuerpo.error.detalles[0].mensaje).toContain('solo de persona individual');
  });

  it('se guardan al crear una empresa nueva, aunque no sea la activa', async () => {
    const nueva = await cuenta.propietario.post('/api/empresas', {
      nombre: 'Exportadora',
      secciones: { [CLAVE]: { ...PERSONA, agenteDeRetencionIva: 'exportador' } },
    });

    const datos = await cuenta.propietario.get(rutaDeEmpresa(nueva.cuerpo.id));

    expect(nueva.estado).toBe(201);
    expect(datos.cuerpo).toMatchObject({
      tipoDePersona: 'juridica',
      agenteDeRetencionIva: 'exportador',
      esAgenteDeRetencionIsr: true,
      guardado: true,
      vigenteDesde: null,
    });
    expect(datos.cuerpo.historial).toEqual([
      expect.objectContaining({ vigenteDesde: null, vigenteHasta: null, conDocumentos: false, regimenIva: 'general' }),
    ]);
  });

  it('el tipo de persona es obligatorio: sin él no se guarda y se marca su campo', async () => {
    const respuesta = await cuenta.propietario.post('/api/empresas', {
      nombre: 'Sin tipo de persona',
      secciones: { [CLAVE]: { regimenIva: 'general' } },
    });

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error.detalles[0].campo).toBe('secciones.libro-de-compras.tipoDePersona');
  });

  it('lo que falta se propone según el régimen y la persona, y si no hay propuesta se pregunta', async () => {
    const individual = await cuenta.propietario.post('/api/empresas', {
      nombre: 'Finquero',
      secciones: { [CLAVE]: { tipoDePersona: 'individual', regimenIva: 'pequeno_contribuyente' } },
    });
    const sinPropuesta = await cuenta.propietario.post('/api/empresas', {
      nombre: 'Finquero simplificado',
      secciones: { [CLAVE]: { tipoDePersona: 'individual', regimenIsr: 'opcional_simplificado' } },
    });

    const datos = await cuenta.propietario.get(rutaDeEmpresa(individual.cuerpo.id));

    expect(datos.cuerpo).toMatchObject({ regimenIsr: null, esAgenteDeRetencionIsr: false });
    expect(sinPropuesta.estado).toBe(400);
    expect(sinPropuesta.cuerpo.error.detalles[0].campo).toBe('secciones.libro-de-compras.esAgenteDeRetencionIsr');
  });

  it('al editar una empresa que no es la activa se corrigen, con auditoría; la activa no cambia', async () => {
    const otra = await cuenta.propietario.post('/api/empresas', {
      nombre: 'Parcela fiscal',
      secciones: { [CLAVE]: PERSONA },
    });
    const ruta = `/api/empresas/${otra.cuerpo.id}`;

    const cambio = await cuenta.propietario.put(ruta, {
      nombre: 'Parcela fiscal',
      secciones: { [CLAVE]: { ...PERSONA, regimenIva: 'pequeno_contribuyente' } },
    });
    const datos = await cuenta.propietario.get(rutaDeEmpresa(otra.cuerpo.id));
    const activa = await cuenta.propietario.get(rutaDeEmpresa(cuenta.empresaId));
    const auditado = (await auditoriaDe('libro-de-compras.datos-fiscales-de-empresa')).filter(
      (fila) => fila.registro_id === otra.cuerpo.id,
    );

    expect(cambio.estado).toBe(200);
    expect(datos.cuerpo).toMatchObject({ regimenIva: 'pequeno_contribuyente', regimenIsr: null, guardado: true });
    expect(activa.cuerpo.guardado).toBe(false);
    expect(auditado).toEqual([
      expect.objectContaining({
        accion: 'corregir',
        anterior: expect.objectContaining({ historial: [expect.objectContaining({ regimenIva: 'general' })] }),
      }),
    ]);
  });

  it('una sección inválida marca el campo con su prefijo y no crea la empresa ni cambia la editada', async () => {
    const invalida = { [CLAVE]: { ...PERSONA, regimenIva: 'pequeno_contribuyente', agenteDeRetencionIva: 'otro' } };
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

  it('una fecha de vigencia inválida se marca en su campo', async () => {
    const respuesta = await cuenta.propietario.post('/api/empresas', {
      nombre: 'Fecha mala',
      secciones: { [CLAVE]: { ...PERSONA, vigenteDesde: '2026-11-05' } },
    });

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error.detalles[0].campo).toBe('secciones.libro-de-compras.vigenteDesde');
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
