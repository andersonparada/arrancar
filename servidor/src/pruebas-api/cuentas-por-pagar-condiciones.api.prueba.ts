import { beforeAll, describe, expect, it } from 'vitest';
import { sumarDias } from '../modulos/cuentas-por-pagar/dominio/propuesta-de-vencimiento.js';
import { DocumentosPorPagarDePrueba, MODULOS_DE_CUENTAS_POR_PAGAR } from './soporte/cuentas-por-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import {
  consultar,
  haceDias,
  nitValido,
  prepararEscenario,
  registrarProveedor,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';

const CLAVE = 'cuentas-por-pagar';
const entorno = usarEntornoApi();
const RECEPCION = haceDias(1);
const EMISION = haceDias(5);
let escenario: EscenarioDeDocumentos;
let sinModulo: CuentaDePrueba;

const propietario = () => escenario.cuenta.propietario;
const rutaDe = (proveedorId: string) => `/api/cuentas-por-pagar/proveedores/${proveedorId}/condiciones`;
const guardarSeccion = (terceroId: string, seccion: unknown, quien: CuentaDePrueba = escenario.cuenta) =>
  quien.propietario.put(`/api/terceros/${terceroId}/proveedor`, { secciones: { [CLAVE]: seccion } });
const condicionesDe = async (proveedorId: string) => (await propietario().get(rutaDe(proveedorId))).cuerpo;
const filasDe = (proveedorId: string) =>
  consultar<{ dias_de_credito: number | null; contar_desde_la_recepcion: boolean }>(
    'select dias_de_credito, contar_desde_la_recepcion from cuentas_por_pagar.condiciones_de_proveedor where proveedor_id = $1',
    [proveedorId],
  );

beforeAll(async () => {
  escenario = await prepararEscenario(entorno, 'cxpcondiciones', MODULOS_DE_CUENTAS_POR_PAGAR);
  sinModulo = await darDeAltaCuenta(entorno, { nombre: 'Sin cxp', usuario: 'cxpsinmodulo', modulos: ['terceros'] });
});

describe('condiciones de pago con el formulario de Proveedores', () => {
  it('un proveedor sin sección devuelve las condiciones por omisión, sin fila guardada', async () => {
    const { proveedorId } = await registrarProveedor(escenario.cuenta, 'Sin condiciones');

    expect(await condicionesDe(proveedorId)).toEqual({
      proveedorId,
      diasDeCredito: null,
      contarDesdeLaRecepcion: false,
    });
    expect(await filasDe(proveedorId)).toEqual([]);
  });

  it('guarda los días de crédito al crear el proveedor con la sección', async () => {
    const { proveedorId } = await registrarProveedor(escenario.cuenta, 'Con crédito', {
      secciones: { [CLAVE]: { diasDeCredito: 30, contarDesdeLaRecepcion: true } },
    });

    expect(await condicionesDe(proveedorId)).toMatchObject({ diasDeCredito: 30, contarDesdeLaRecepcion: true });
  });

  it('cambia los días, los vacía y los deja en cero (contado), y lo no enviado se queda como estaba', async () => {
    const { proveedorId, terceroId } = await registrarProveedor(escenario.cuenta, 'Cambiante');

    await guardarSeccion(terceroId, { diasDeCredito: 15, contarDesdeLaRecepcion: true });
    expect(await condicionesDe(proveedorId)).toMatchObject({ diasDeCredito: 15, contarDesdeLaRecepcion: true });

    await guardarSeccion(terceroId, { diasDeCredito: 0 });
    expect(await condicionesDe(proveedorId)).toMatchObject({ diasDeCredito: 0, contarDesdeLaRecepcion: true });

    await guardarSeccion(terceroId, { diasDeCredito: null, contarDesdeLaRecepcion: false });
    expect(await condicionesDe(proveedorId)).toMatchObject({ diasDeCredito: null, contarDesdeLaRecepcion: false });
    expect(await filasDe(proveedorId)).toHaveLength(1);
  });

  it('un valor inválido rechaza el formulario con el error en su campo y no guarda nada', async () => {
    const { proveedorId, terceroId } = await registrarProveedor(escenario.cuenta, 'Inválido');
    for (const diasDeCredito of [366, -1, 1.5, '15']) {
      const respuesta = await guardarSeccion(terceroId, { diasDeCredito });

      expect(respuesta.estado).toBe(400);
      expect(respuesta.cuerpo.error.detalles).toContainEqual(
        expect.objectContaining({ campo: 'secciones.cuentas-por-pagar.diasDeCredito' }),
      );
    }
    expect(await filasDe(proveedorId)).toEqual([]);
  });

  it('una sección inválida no cambia lo que ya estaba guardado', async () => {
    const { proveedorId, terceroId } = await registrarProveedor(escenario.cuenta, 'Conserva');
    await guardarSeccion(terceroId, { diasDeCredito: 8 });

    const respuesta = await guardarSeccion(terceroId, { diasDeCredito: 999 });

    expect(respuesta.estado).toBe(400);
    expect(await condicionesDe(proveedorId)).toMatchObject({ diasDeCredito: 8 });
  });

  it('con el módulo inactivo la sección se ignora y la ruta no se ofrece', async () => {
    const { proveedorId, terceroId } = await registrarProveedor(sinModulo, 'Proveedor ajeno');

    const respuesta = await guardarSeccion(terceroId, { diasDeCredito: 10 }, sinModulo);

    expect(respuesta.estado).toBe(200);
    expect(await filasDe(proveedorId)).toEqual([]);
    expect((await sinModulo.propietario.get(rutaDe(proveedorId))).estado).toBe(403);
  });

  it('un proveedor que no existe o es de otra cuenta responde 404', async () => {
    const ajeno = await registrarProveedor(sinModulo, 'Proveedor de otra cuenta');

    expect((await propietario().get(rutaDe(crypto.randomUUID()))).estado).toBe(404);
    expect((await propietario().get(rutaDe(ajeno.proveedorId))).estado).toBe(404);
  });

  it('exige sesión', async () => {
    const respuesta = await entorno.nuevoCliente().get(rutaDe(escenario.proveedorId));

    expect(respuesta.estado).toBe(401);
  });
});

describe('el vencimiento respeta las condiciones del proveedor', () => {
  it('contando desde la recepción, el plazo corre desde la fecha de recepción del documento', async () => {
    const documentos = new DocumentosPorPagarDePrueba(escenario, EMISION);
    const { proveedorId } = await registrarProveedor(escenario.cuenta, 'Desde recepción', {
      secciones: { [CLAVE]: { diasDeCredito: 20, contarDesdeLaRecepcion: true } },
    });
    const id = await documentos.registrar({ proveedorId, nitEmisor: nitValido('5200001'), fechaRecepcion: RECEPCION });

    expect((await documentos.fila(id))?.vencimiento).toBe(sumarDias(RECEPCION, 20));
  });

  it('por omisión corre desde la emisión aunque la recepción sea posterior', async () => {
    const documentos = new DocumentosPorPagarDePrueba(escenario, EMISION);
    const { proveedorId } = await registrarProveedor(escenario.cuenta, 'Desde emisión', {
      secciones: { [CLAVE]: { diasDeCredito: 20 } },
    });
    const id = await documentos.registrar({ proveedorId, nitEmisor: nitValido('5200002'), fechaRecepcion: RECEPCION });

    expect((await documentos.fila(id))?.vencimiento).toBe(sumarDias(EMISION, 20));
  });
});
