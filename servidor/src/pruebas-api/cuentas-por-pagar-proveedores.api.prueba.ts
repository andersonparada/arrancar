import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { DocumentosPorPagarDePrueba, MODULOS_DE_CUENTAS_POR_PAGAR } from './soporte/cuentas-por-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  haceDias,
  nitValido,
  prepararEscenario,
  registrarProveedor,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const RUTA = '/api/cuentas-por-pagar/proveedores';
const entorno = usarEntornoApi();
let escenario: EscenarioDeDocumentos;
let documentos: DocumentosPorPagarDePrueba;
let soloCuentasPorPagar: ClienteApi;
let proveedorConDocumentos: { terceroId: string; proveedorId: string };

beforeAll(async () => {
  escenario = await prepararEscenario(entorno, 'cxpprov', MODULOS_DE_CUENTAS_POR_PAGAR);
  documentos = new DocumentosPorPagarDePrueba(escenario, haceDias(3));
  const nit = nitValido('5100001');
  proveedorConDocumentos = await registrarProveedor(escenario.cuenta, 'Zeta Ferreteria, S.A.', { nit });
  await documentos.registrar({ proveedorId: proveedorConDocumentos.proveedorId, nitEmisor: nit });
  const nitBeta = nitValido('7300009');
  const beta = await registrarProveedor(escenario.cuenta, 'Bodegas Beta Guatemala, S.A.', { nit: nitBeta });
  await documentos.registrar({ proveedorId: beta.proveedorId, nitEmisor: nitBeta });
  await registrarProveedor(escenario.cuenta, 'Transportes Alfa del Norte, S.A.', { nit: nitValido('8200004') });
  soloCuentasPorPagar = await crearUsuarioConPermisos(entorno, escenario.cuenta, {
    nombres: 'Cuentas',
    apellidos: 'Pagar',
    permisos: ['cuentas-por-pagar.documentos.ver'],
  });
});

describe('proveedores con documentos por pagar', () => {
  it('quien solo tiene permisos de Cuentas por pagar los ve, sin permiso sobre Terceros', async () => {
    const respuesta = await soloCuentasPorPagar.get(RUTA);

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    const nombres = respuesta.cuerpo.map((p: { nombre: string }) => p.nombre);
    expect(nombres).toContain('Zeta Ferreteria, S.A.');
    expect(nombres).not.toContain('Transportes Alfa del Norte, S.A.');
    expect(respuesta.cuerpo.find((p: { nombre: string }) => p.nombre === 'Zeta Ferreteria, S.A.')).toEqual({
      id: proveedorConDocumentos.proveedorId,
      nombre: 'Zeta Ferreteria, S.A.',
      activo: true,
    });
  });

  it('vienen ordenados por nombre y un proveedor inactivo sigue saliendo, marcado', async () => {
    await escenario.cuenta.propietario.delete(`/api/terceros/${proveedorConDocumentos.terceroId}/proveedor`);

    const respuesta = await soloCuentasPorPagar.get(RUTA);

    const nombres = respuesta.cuerpo.map((p: { nombre: string }) => p.nombre);
    expect(nombres.indexOf('Bodegas Beta Guatemala, S.A.')).toBeLessThan(nombres.indexOf('Zeta Ferreteria, S.A.'));
    expect(respuesta.cuerpo.find((p: { id: string }) => p.id === proveedorConDocumentos.proveedorId).activo).toBe(
      false,
    );
  });

  it('sin cuentas-por-pagar.documentos.ver responde 403', async () => {
    const sinPermiso = await crearUsuarioConPermisos(entorno, escenario.cuenta, {
      nombres: 'Sin',
      apellidos: 'Permiso',
      permisos: ['terceros.ver'],
    });

    const respuesta = await sinPermiso.get(RUTA);

    expect(respuesta.estado).toBe(403);
  });
});
