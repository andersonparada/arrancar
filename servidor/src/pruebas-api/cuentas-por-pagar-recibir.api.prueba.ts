import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { RecibirDocumento } from '../modulos/cuentas-por-pagar/aplicacion/casos-uso/recibir-documento.js';
import { sumarDias, sumarMeses } from '../modulos/cuentas-por-pagar/dominio/propuesta-de-vencimiento.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { EMISION_DE_PRUEBA, VendedoresDePrueba } from './soporte/factura-especial.js';
import {
  configurarEmpresa,
  consultar,
  DestinoRechaza,
  documentoDePrueba,
  haceDias,
  nitValido,
  prepararEscenario,
  registrarProveedor,
  RUTA_DOCUMENTOS,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';

const entorno = usarEntornoApi();
const EMISION = haceDias(3);
let escenario: EscenarioDeDocumentos;

const propietario = () => escenario.cuenta.propietario;
const registrar = async (cambios: Record<string, unknown> = {}) => {
  const respuesta = await propietario().post(RUTA_DOCUMENTOS, documentoDePrueba(escenario, cambios));
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
  return respuesta.cuerpo.documento.id as string;
};
const lineaDe = (total: string) => [{ conceptoId: escenario.conceptoId, total }];
const registrarNota = (
  tipoDte: 'NCRE' | 'NDEB',
  facturaId: string,
  { total, ...cambios }: { total: string } & Record<string, unknown>,
) =>
  registrar({
    tipoDte,
    documentoAfectadoId: facturaId,
    serie: tipoDte === 'NDEB' ? 'D' : 'N',
    lineas: lineaDe(total),
    fechaEmision: EMISION,
    ...cambios,
  });

interface Fila {
  id: string;
  tipo: string;
  estado: string;
  vencimiento: string | null;
  total: string;
  retenciones: string;
  proveedor_id: string;
  empresa_id: string;
  documento_afectado_id: string | null;
  fecha_emision: string;
}
const filaDe = async (documentoId: string) =>
  (
    await consultar<Fila>(
      `select id, tipo, estado, vencimiento::text, total::text, retenciones::text, proveedor_id, empresa_id,
            documento_afectado_id, fecha_emision::text
       from cuentas_por_pagar.documentos where documento_id = $1`,
      [documentoId],
    )
  )[0];
const aplicacionesDe = (notaDocumentoId: string) =>
  consultar<{ monto: string; cargo_documento_id: string }>(
    `select a.monto, c.documento_id as cargo_documento_id from cuentas_por_pagar.aplicaciones_de_notas a
       join cuentas_por_pagar.documentos n on n.id = a.nota_id
       join cuentas_por_pagar.documentos c on c.id = a.cargo_id
      where n.documento_id = $1 order by c.fecha_emision, c.creado_en`,
    [notaDocumentoId],
  );
const ponerDiasDeCredito = (proveedorId: string, dias: number | null) =>
  consultar(
    `insert into cuentas_por_pagar.condiciones_de_proveedor (cuenta_id, proveedor_id, dias_de_credito)
     values ($1, $2, $3)`,
    [escenario.cuenta.cuentaId, proveedorId, dias],
  );

beforeAll(async () => {
  escenario = await prepararEscenario(entorno, 'cxprecibir', [
    'terceros',
    'libro-de-compras',
    'bancos',
    'cuentas-por-pagar',
  ]);
});

afterAll(() => vi.restoreAllMocks());

describe('recibir un documento desde Libro de compras', () => {
  it('una factura queda pendiente en Cuentas por pagar con su copia y el vencimiento de un mes', async () => {
    const id = await registrar({ fechaEmision: EMISION });

    expect(await filaDe(id)).toMatchObject({
      tipo: 'factura',
      estado: 'pendiente',
      total: '1120.00',
      retenciones: '0.00',
      proveedor_id: escenario.proveedorId,
      empresa_id: escenario.cuenta.empresaId,
      vencimiento: sumarMeses(EMISION, 1),
    });
  });

  it('con días de crédito del proveedor, el vencimiento es la emisión más esos días', async () => {
    const { proveedorId } = await registrarProveedor(escenario.cuenta, 'Ferretería con crédito');
    await ponerDiasDeCredito(proveedorId, 15);

    const id = await registrar({ proveedorId, nitEmisor: nitValido('5100001'), fechaEmision: EMISION });

    expect((await filaDe(id))?.vencimiento).toBe(sumarDias(EMISION, 15));
  });

  it('un proveedor con 0 días es de contado y uno con el campo vacío usa el plazo por omisión', async () => {
    const contado = await registrarProveedor(escenario.cuenta, 'Ferretería de contado');
    const vacio = await registrarProveedor(escenario.cuenta, 'Ferretería sin plazo');
    await ponerDiasDeCredito(contado.proveedorId, 0);
    await ponerDiasDeCredito(vacio.proveedorId, null);

    const idContado = await registrar({
      proveedorId: contado.proveedorId,
      nitEmisor: nitValido('5100002'),
      fechaEmision: EMISION,
    });
    const idVacio = await registrar({
      proveedorId: vacio.proveedorId,
      nitEmisor: nitValido('5100003'),
      fechaEmision: EMISION,
    });

    expect((await filaDe(idContado))?.vencimiento).toBe(EMISION);
    expect((await filaDe(idVacio))?.vencimiento).toBe(sumarMeses(EMISION, 1));
  });

  it('el plazo por omisión de la empresa cambia el vencimiento de los proveedores sin días', async () => {
    const clave = '/api/configuracion/cuentas-por-pagar.vencimientos.meses_por_omision';
    await entorno.soporte.put('/api/sesion/empresa-activa', { empresaId: escenario.cuenta.empresaId });
    const cambio = await entorno.soporte.put(clave, { nivel: 'empresa', valor: 2 });
    expect(cambio.estado, JSON.stringify(cambio.cuerpo)).toBe(204);
    const { proveedorId } = await registrarProveedor(escenario.cuenta, 'Ferretería a dos meses');

    try {
      const id = await registrar({ proveedorId, nitEmisor: nitValido('5100004'), fechaEmision: EMISION });
      expect((await filaDe(id))?.vencimiento).toBe(sumarMeses(EMISION, 2));
    } finally {
      await entorno.soporte.put(clave, { nivel: 'empresa', valor: 1 });
    }
  });

  it('un recibo entra como cargo y lleva vencimiento', async () => {
    const id = await registrar({
      tipo: 'recibo',
      motivoFueraDelLibro: 'sin_fel',
      nitEmisor: null,
      autorizacionFel: null,
      serie: null,
      fechaEmision: EMISION,
    });

    expect(await filaDe(id)).toMatchObject({ tipo: 'recibo', estado: 'pendiente' });
    expect((await filaDe(id))?.vencimiento).toBe(sumarMeses(EMISION, 1));
  });

  it('una factura especial trae sus retenciones y el neto sale del total menos lo retenido', async () => {
    await configurarEmpresa(escenario.cuenta, {
      regimenIva: 'general',
      regimenIsr: 'utilidades',
      agenteDeRetencionIva: 'ninguno',
      esAgenteDeRetencionIsr: true,
    });
    const vendedores = new VendedoresDePrueba(escenario);
    const vendedor = await vendedores.nuevo();

    const respuesta = await propietario().post(
      RUTA_DOCUMENTOS,
      vendedores.cuerpo(vendedor.proveedorId, { nitReceptor: nitValido('4200001'), fechaEmision: EMISION_DE_PRUEBA }),
    );

    expect(respuesta.estado).toBe(201);
    const [retenido] = await consultar<{ suma: string }>(
      'select coalesce(sum(monto), 0)::text as suma from libro_de_compras.retenciones where documento_id = $1',
      [respuesta.cuerpo.documento.id],
    );
    const fila = await filaDe(respuesta.cuerpo.documento.id);
    expect(fila).toMatchObject({ tipo: 'factura_especial', estado: 'pendiente' });
    expect(Number(fila?.retenciones)).toBeGreaterThan(0);
    expect(Number(fila?.retenciones)).toBe(Number(retenido?.suma));
  });
});

describe('notas de débito y de crédito', () => {
  it('la nota de débito es un cargo aparte, con su vencimiento desde su emisión, y no se aplica a nada', async () => {
    const facturaId = await registrar({ fechaEmision: haceDias(10) });

    const id = await registrarNota('NDEB', facturaId, { total: '560.00' });

    expect(await filaDe(id)).toMatchObject({
      tipo: 'nota_de_debito',
      estado: 'pendiente',
      documento_afectado_id: facturaId,
      total: '560.00',
      vencimiento: sumarMeses(EMISION, 1),
    });
    expect((await filaDe(facturaId))?.vencimiento).toBe(sumarMeses(haceDias(10), 1));
    expect(await aplicacionesDe(id)).toEqual([]);
  });

  it('la nota de crédito se aplica sola a su factura y no vence', async () => {
    const facturaId = await registrar({ fechaEmision: haceDias(10) });

    const id = await registrarNota('NCRE', facturaId, { total: '336.00' });

    expect(await filaDe(id)).toMatchObject({ tipo: 'nota_de_credito', estado: 'pendiente', vencimiento: null });
    expect(await aplicacionesDe(id)).toEqual([{ monto: '336.00', cargo_documento_id: facturaId }]);
  });

  it('una nota de crédito por toda la factura y su nota de débito aplica primero a la factura y luego a la nota', async () => {
    const facturaId = await registrar({ fechaEmision: haceDias(10) });
    const debitoId = await registrarNota('NDEB', facturaId, { total: '560.00', fechaEmision: haceDias(8) });

    const id = await registrarNota('NCRE', facturaId, { total: '1680.00' });

    expect(await aplicacionesDe(id)).toEqual([
      { monto: '1120.00', cargo_documento_id: facturaId },
      { monto: '560.00', cargo_documento_id: debitoId },
    ]);
  });

  it('la nota de crédito por la mitad de la factura deja el resto de la factura por pagar', async () => {
    const facturaId = await registrar({ fechaEmision: haceDias(10) });
    const primera = await registrarNota('NCRE', facturaId, { total: '560.00', serie: 'N1' });
    const segunda = await registrarNota('NCRE', facturaId, { total: '448.00', serie: 'N2' });

    const aplicado = [...(await aplicacionesDe(primera)), ...(await aplicacionesDe(segunda))];

    expect(aplicado.map((a) => a.monto)).toEqual(['560.00', '448.00']);
  });
});

describe('si Cuentas por pagar falla', () => {
  it('Libro de compras no guarda nada', async () => {
    const [antes] = await consultar<{ n: string }>('select count(*)::text as n from libro_de_compras.documentos');
    const falla = vi
      .spyOn(RecibirDocumento.prototype, 'ejecutar')
      .mockRejectedValueOnce(new DestinoRechaza('No se pudo recibir.'));

    const respuesta = await propietario().post(RUTA_DOCUMENTOS, documentoDePrueba(escenario));

    const [despues] = await consultar<{ n: string }>('select count(*)::text as n from libro_de_compras.documentos');
    falla.mockRestore();
    expect(respuesta.estado).toBeGreaterThanOrEqual(400);
    expect(despues?.n).toBe(antes?.n);
  });
});
