import { beforeAll, describe, expect, it } from 'vitest';
import {
  DocumentosPorPagarDePrueba,
  MODULOS_DE_CUENTAS_POR_PAGAR,
  proveedorConCredito,
} from './soporte/cuentas-por-pagar.js';
import { anularAjuste, notaConSaldoLibre, sembrarAjuste } from './soporte/cuentas-por-pagar-notas.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { haceDias, prepararEscenario, type EscenarioDeDocumentos } from './soporte/escenario-de-documentos.js';

const RUTA = '/api/cuentas-por-pagar';
const entorno = usarEntornoApi();
let escenario: EscenarioDeDocumentos;
let documentos: DocumentosPorPagarDePrueba;
let secuencia = 0;
const NOMBRES = ['Alfa', 'Bravo', 'Cobre', 'Delta', 'Eco', 'Fénix', 'Gama', 'Halcón', 'Índigo', 'Jade'];

const propietario = () => escenario.cuenta.propietario;
const ficha = async (id: string) => (await propietario().get(`${RUTA}/documentos/${id}`)).cuerpo;
const saldoDel = async (proveedorId: string) =>
  (await propietario().get(`${RUTA}/proveedores/${proveedorId}/saldo`)).cuerpo;

/** Un proveedor propio con una factura y una nota que deja Q100.00 de saldo libre. */
async function unaNota() {
  const { proveedorId, nitEmisor } = await proveedorConCredito(escenario, {
    nombre: `${NOMBRES[secuencia]} S.A.`,
    nit: String(5400000 + secuencia++),
    diasDeCredito: 30,
  });
  return { proveedorId, ...(await notaConSaldoLibre(documentos, { proveedorId, nitEmisor })) };
}

beforeAll(async () => {
  escenario = await prepararEscenario(entorno, 'cxpnotassaldos', MODULOS_DE_CUENTAS_POR_PAGAR);
  documentos = new DocumentosPorPagarDePrueba(escenario, haceDias(3));
});

describe('saldo libre de una nota con ajustes', () => {
  it('un ajuste vigente rebaja el saldo libre y uno anulado no', async () => {
    const { proveedorId, notaPropia } = await unaNota();
    expect(await ficha(notaPropia)).toMatchObject({ ajustado: '0.00', saldo: '100.00', aplicado: '1020.00' });

    const ajuste = await sembrarAjuste(escenario, notaPropia, { monto: '30.00' });

    expect(await ficha(notaPropia)).toMatchObject({ ajustado: '30.00', saldo: '70.00', aplicado: '1020.00' });
    expect(await saldoDel(proveedorId)).toMatchObject({ saldosDeudores: '70.00' });
    await anularAjuste(escenario, ajuste);
    expect(await ficha(notaPropia)).toMatchObject({ ajustado: '0.00', saldo: '100.00' });
    expect(await saldoDel(proveedorId)).toMatchObject({ saldosDeudores: '100.00' });
  });

  it('ajustar todo el saldo libre la saca de los saldos a favor y de las acciones', async () => {
    const { proveedorId, notaPropia } = await unaNota();
    expect(await ficha(notaPropia)).toMatchObject({ puedeAplicar: true, puedeAjustar: false });
    await propietario().post(`${RUTA}/documentos/registrar`, { documentos: [{ id: notaPropia }] });
    expect(await ficha(notaPropia)).toMatchObject({ puedeAplicar: true, puedeAjustar: true });

    await sembrarAjuste(escenario, notaPropia, { monto: '100.00' });

    expect(await ficha(notaPropia)).toMatchObject({ saldo: '0.00', puedeAplicar: false, puedeAjustar: false });
    expect(await saldoDel(proveedorId)).toMatchObject({ saldosDeudores: '0.00', notasConSaldoLibre: [] });
  });

  it('el filtro conSaldo trae las notas con saldo libre y no lo agotado', async () => {
    const { proveedorId, notaPropia } = await unaNota();
    const ids = async () =>
      (await propietario().get(`${RUTA}/documentos?conSaldo=true&proveedorId=${proveedorId}`)).cuerpo.elementos.map(
        (documento: { id: string }) => documento.id,
      );
    // La nota rebajó toda la factura (Q1,020.00 de neto) y conserva Q100.00 libres.
    expect(await ids()).toEqual([notaPropia]);

    await sembrarAjuste(escenario, notaPropia, { monto: '100.00' });

    expect(await ids()).toEqual([]);
    expect((await propietario().get(`${RUTA}/documentos?proveedorId=${proveedorId}`)).cuerpo.total).toBe(2);
  });
});
