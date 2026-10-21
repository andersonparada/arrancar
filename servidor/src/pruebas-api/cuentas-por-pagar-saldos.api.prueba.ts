import { beforeAll, describe, expect, it } from 'vitest';
import {
  DocumentosPorPagarDePrueba,
  MODULOS_DE_CUENTAS_POR_PAGAR,
  proveedorConCredito,
} from './soporte/cuentas-por-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import {
  consultar,
  documentoDePrueba,
  haceDias,
  prepararEscenario,
  registrarProveedor,
  RUTA_DOCUMENTOS,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';

const RUTA = '/api/cuentas-por-pagar';
const entorno = usarEntornoApi();
const EMISION = haceDias(3);
let escenario: EscenarioDeDocumentos;
let otraCuenta: CuentaDePrueba;
let documentos: DocumentosPorPagarDePrueba;

const propietario = () => escenario.cuenta.propietario;
const ver = async (ruta: string) => {
  const respuesta = await propietario().get(`${RUTA}${ruta}`);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
  return respuesta.cuerpo;
};

beforeAll(async () => {
  escenario = await prepararEscenario(entorno, 'cxpsaldos', MODULOS_DE_CUENTAS_POR_PAGAR);
  documentos = new DocumentosPorPagarDePrueba(escenario, EMISION);
  otraCuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Otra cuenta',
    usuario: 'cxpsaldosotra',
    modulos: MODULOS_DE_CUENTAS_POR_PAGAR,
  });
});

describe('saldo del proveedor', () => {
  it('suma lo que falta por pagar y lo vencido, y muestra aparte lo que las notas dejaron a favor', async () => {
    const { proveedorId, nitEmisor } = await proveedorConCredito(escenario, {
      nombre: 'Saldos S.A.',
      nit: '5300005',
      diasDeCredito: 0,
    });
    const retenida = await documentos.registrar({ proveedorId, nitEmisor, fechaEmision: haceDias(8) });
    await consultar(`update cuentas_por_pagar.documentos set retenciones = 100 where documento_id = $1`, [retenida]);
    const aparte = await documentos.registrar({ proveedorId, nitEmisor, fechaEmision: haceDias(4) });
    const respuesta = await propietario().post(
      RUTA_DOCUMENTOS,
      documentoDePrueba(escenario, {
        proveedorId,
        nitEmisor,
        tipoDte: 'NCRE',
        documentoAfectadoId: retenida,
        serie: 'N',
        lineas: [{ conceptoId: escenario.conceptoId, total: '1120.00' }],
      }),
    );
    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);

    const saldo = await ver(`/proveedores/${proveedorId}/saldo`);

    expect(respuesta.cuerpo.avisos).toContain(
      'Esta nota deja Q100.00 a favor de la empresa porque la retención ya se practicó. Compénselo en la próxima factura o pida el reintegro al proveedor.',
    );
    expect(saldo).toMatchObject({
      proveedorId,
      proveedorNombre: 'Saldos S.A.',
      porPagar: '1120.00',
      vencido: '1120.00',
      cargosConSaldo: 1,
      saldosDeudores: '100.00',
    });
    expect(saldo.notasConSaldoLibre).toEqual([
      expect.objectContaining({ documentoId: respuesta.cuerpo.documento.id, saldoLibre: '100.00' }),
    ]);
    expect(aparte).toBeTruthy();
  });

  it('lo anulado no cuenta, ni como deuda ni como saldo a favor', async () => {
    const { proveedorId, nitEmisor } = await proveedorConCredito(escenario, {
      nombre: 'Ferretería Los Anulados',
      nit: '5300006',
      diasDeCredito: 30,
    });
    const id = await documentos.registrar({ proveedorId, nitEmisor });
    await propietario().post(`${RUTA_DOCUMENTOS}/${id}/anular`, { causa: 'error_de_captura', motivo: 'Prueba' });

    expect(await ver(`/proveedores/${proveedorId}/saldo`)).toMatchObject({
      porPagar: '0.00',
      vencido: '0.00',
      cargosConSaldo: 0,
      saldosDeudores: '0.00',
      notasConSaldoLibre: [],
    });
  });

  it('un proveedor que no existe o es de otra cuenta responde 404', async () => {
    const ajeno = await registrarProveedor(otraCuenta, 'Proveedor ajeno');

    expect((await propietario().get(`${RUTA}/proveedores/${crypto.randomUUID()}/saldo`)).estado).toBe(404);
    expect((await propietario().get(`${RUTA}/proveedores/${ajeno.proveedorId}/saldo`)).estado).toBe(404);
  });
});

describe('permisos', () => {
  it('sin el permiso de ver documentos no se consulta nada; con él, sí', async () => {
    const sinPermiso = await crearUsuarioConPermisos(entorno, escenario.cuenta, {
      nombres: 'Sin',
      apellidos: 'Permiso',
      permisos: ['terceros.ver'],
    });
    const conPermiso = await crearUsuarioConPermisos(entorno, escenario.cuenta, {
      nombres: 'Con',
      apellidos: 'Permiso',
      permisos: ['cuentas-por-pagar.documentos.ver'],
    });
    const rutas = ['/bandeja', '/documentos', `/proveedores/${escenario.proveedorId}/saldo`];

    for (const ruta of rutas) {
      expect((await sinPermiso.get(`${RUTA}${ruta}`)).estado, ruta).toBe(403);
      expect((await conPermiso.get(`${RUTA}${ruta}`)).estado, ruta).toBe(200);
    }
  });

  it('exige sesión', async () => {
    expect((await entorno.nuevoCliente().get(`${RUTA}/bandeja`)).estado).toBe(401);
  });
});
