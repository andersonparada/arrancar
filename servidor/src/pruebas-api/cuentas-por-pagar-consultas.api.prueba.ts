import { beforeAll, describe, expect, it } from 'vitest';
import {
  DocumentosPorPagarDePrueba,
  MODULOS_DE_CUENTAS_POR_PAGAR,
  proveedorConCredito,
} from './soporte/cuentas-por-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import {
  consultar,
  haceDias,
  prepararEscenario,
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
const lista = async (consulta = '') => ver(`/documentos?${consulta}`);
const fichaDe = async (documentoDeCompraId: string) => {
  const { id } = (await documentos.fila(documentoDeCompraId))!;
  return ver(`/documentos/${id}`);
};

interface Elemento {
  id: string;
  documentoId: string;
  estado: string;
  saldo: string;
  vencido: boolean;
}
const idsDe = (cuerpo: { elementos: Elemento[] }) => cuerpo.elementos.map((e) => e.documentoId);

beforeAll(async () => {
  escenario = await prepararEscenario(entorno, 'cxpconsultas', MODULOS_DE_CUENTAS_POR_PAGAR);
  documentos = new DocumentosPorPagarDePrueba(escenario, EMISION);
  otraCuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Otra cuenta',
    usuario: 'cxpconsultasotra',
    modulos: MODULOS_DE_CUENTAS_POR_PAGAR,
  });
});

describe('bandeja', () => {
  it('trae lo pendiente del más antiguo al más nuevo, con su origen, saldos y acciones posibles', async () => {
    const primera = await documentos.registrar({ serie: 'B', numero: '9001' });
    const segunda = await documentos.registrar({ serie: 'B', numero: '9002' });

    const bandeja = await ver('/bandeja');

    const ids = idsDe(bandeja);
    expect(ids.indexOf(primera)).toBeLessThan(ids.indexOf(segunda));
    expect(bandeja.total).toBeGreaterThanOrEqual(2);
    expect(bandeja.elementos.find((e: Elemento) => e.documentoId === primera)).toMatchObject({
      tipo: 'factura',
      clase: 'cargo',
      estado: 'pendiente',
      proveedorNombre: 'Veterinaria El Quiroa',
      serie: 'B',
      numero: '9001',
      total: '1120.00',
      neto: '1120.00',
      aplicado: '0.00',
      saldo: '1120.00',
      vencido: false,
      puedeRegistrar: true,
      puedeAutorizar: false,
      puedeCambiarVencimiento: false,
      puedeAnular: true,
      puedeEliminar: true,
    });
  });

  it('no incluye lo que ya no está pendiente', async () => {
    const id = await documentos.registrar();
    await consultar(
      `update cuentas_por_pagar.documentos set estado = 'anulado', anulado_en = now(),
      anulado_por = $2, motivo_de_anulacion = 'x', estaba_autorizado = false where documento_id = $1`,
      [id, crypto.randomUUID()],
    );

    expect(idsDe(await ver('/bandeja'))).not.toContain(id);
  });
});

describe('lista con filtros', () => {
  it('filtra por proveedor, tipo, estado y fechas de emisión', async () => {
    const { proveedorId, nitEmisor } = await proveedorConCredito(escenario, {
      nombre: 'Filtros S.A.',
      nit: '5300001',
      diasDeCredito: 30,
    });
    const factura = await documentos.registrar({ proveedorId, nitEmisor, fechaEmision: haceDias(20) });
    const debito = await documentos.registrarNota('NDEB', factura, { total: '112.00', proveedorId, nitEmisor });

    const delProveedor = await lista(`proveedorId=${proveedorId}`);
    const soloNotas = await lista(`proveedorId=${proveedorId}&tipo=nota_de_debito`);
    const antiguas = await lista(`proveedorId=${proveedorId}&emitidosHasta=${haceDias(10)}`);
    const pendientes = await lista(`proveedorId=${proveedorId}&estado=pendiente`);
    const autorizados = await lista(`proveedorId=${proveedorId}&estado=autorizado`);

    expect(idsDe(delProveedor).sort()).toEqual([factura, debito].sort());
    expect(idsDe(soloNotas)).toEqual([debito]);
    expect(idsDe(antiguas)).toEqual([factura]);
    expect(idsDe(pendientes)).toHaveLength(2);
    expect(autorizados.elementos).toEqual([]);
    expect(autorizados.total).toBe(0);
  });

  it('por omisión oculta lo anulado; con estado anulado o todos lo muestra', async () => {
    const { proveedorId, nitEmisor } = await proveedorConCredito(escenario, {
      nombre: 'Anulados S.A.',
      nit: '5300002',
      diasDeCredito: 30,
    });
    const vigente = await documentos.registrar({ proveedorId, nitEmisor });
    const anulado = await documentos.registrar({ proveedorId, nitEmisor });
    await propietario().post(`${RUTA_DOCUMENTOS}/${anulado}/anular`, { causa: 'error_de_captura', motivo: 'Prueba' });

    expect(idsDe(await lista(`proveedorId=${proveedorId}`))).toEqual([vigente]);
    expect(idsDe(await lista(`proveedorId=${proveedorId}&estado=anulado`))).toEqual([anulado]);
    expect(idsDe(await lista(`proveedorId=${proveedorId}&estado=todos`)).sort()).toEqual([vigente, anulado].sort());
    const [anuladoEnLista] = (await lista(`proveedorId=${proveedorId}&estado=anulado`)).elementos;
    expect(anuladoEnLista).toMatchObject({
      estado: 'anulado',
      saldo: '0.00',
      puedeAnular: false,
      puedeEliminar: false,
    });
  });

  it('solo vencidos trae los cargos con saldo cuyo vencimiento ya pasó', async () => {
    const { proveedorId, nitEmisor } = await proveedorConCredito(escenario, {
      nombre: 'Vencidos S.A.',
      nit: '5300003',
      diasDeCredito: 0,
    });
    const vencida = await documentos.registrar({ proveedorId, nitEmisor, fechaEmision: haceDias(5) });
    const alDia = await documentos.registrar({ proveedorId: escenario.proveedorId });

    const vencidos = await lista(`proveedorId=${proveedorId}&soloVencidos=true`);
    const todos = await lista(`proveedorId=${proveedorId}`);
    const delOtro = await lista(`proveedorId=${escenario.proveedorId}&soloVencidos=true`);

    expect(idsDe(vencidos)).toEqual([vencida]);
    expect(vencidos.elementos[0]).toMatchObject({ vencido: true });
    expect(todos.elementos[0]).toMatchObject({ vencido: true });
    expect(idsDe(delOtro)).not.toContain(alDia);
  });

  it('pagina, ordena del más reciente al más antiguo y cuenta el total sin la página', async () => {
    const { proveedorId, nitEmisor } = await proveedorConCredito(escenario, {
      nombre: 'Paginas S.A.',
      nit: '5300004',
      diasDeCredito: 30,
    });
    const viejo = await documentos.registrar({ proveedorId, nitEmisor, fechaEmision: haceDias(9) });
    const medio = await documentos.registrar({ proveedorId, nitEmisor, fechaEmision: haceDias(6) });
    const nuevo = await documentos.registrar({ proveedorId, nitEmisor, fechaEmision: haceDias(2) });

    const primera = await lista(`proveedorId=${proveedorId}&limite=2&pagina=1`);
    const segunda = await lista(`proveedorId=${proveedorId}&limite=2&pagina=2`);

    expect(idsDe(primera)).toEqual([nuevo, medio]);
    expect(idsDe(segunda)).toEqual([viejo]);
    expect(primera).toMatchObject({ total: 3, pagina: 1, limite: 2 });
    expect(segunda).toMatchObject({ total: 3, pagina: 2 });
  });

  it('rechaza un filtro inválido', async () => {
    expect((await propietario().get(`${RUTA}/documentos?estado=pagado`)).estado).toBe(400);
    expect((await propietario().get(`${RUTA}/documentos?proveedorId=no-es-uuid`)).estado).toBe(400);
  });
});

describe('ficha del documento', () => {
  it('la factura muestra sus notas, lo que le rebajaron y su saldo; con notas no se anula ni se elimina', async () => {
    const factura = await documentos.registrar({ serie: 'F', numero: '7001' });
    const debito = await documentos.registrarNota('NDEB', factura, { total: '560.00' });
    const credito = await documentos.registrarNota('NCRE', factura, { total: '336.00' });

    const ficha = await fichaDe(factura);

    expect(ficha).toMatchObject({
      neto: '1120.00',
      aplicado: '336.00',
      saldo: '784.00',
      vencimiento: expect.any(String),
    });
    expect(ficha).toMatchObject({ puedeAnular: false, puedeEliminar: false });
    expect(ficha.notas.map((n: { documentoId: string }) => n.documentoId)).toEqual([debito, credito]);
    expect(ficha.notas[1]).toMatchObject({
      tipo: 'nota_de_credito',
      total: '336.00',
      aplicadoAEsteDocumento: '336.00',
    });
    expect(ficha.notas[0]).toMatchObject({ tipo: 'nota_de_debito', aplicadoAEsteDocumento: '0.00' });
    expect(ficha.aplicaciones).toEqual([
      expect.objectContaining({ monto: '336.00', cargoNumero: '7001', cargoSerie: 'F', notaSerie: 'N' }),
    ]);
  });

  it('la nota de crédito muestra a qué cargo aplicó, su saldo libre y que no vence', async () => {
    const factura = await documentos.registrar();
    const credito = await documentos.registrarNota('NCRE', factura, { total: '336.00' });

    const ficha = await fichaDe(credito);

    expect(ficha).toMatchObject({
      clase: 'abono',
      vencimiento: null,
      vencido: false,
      neto: '336.00',
      aplicado: '336.00',
      saldo: '0.00',
      puedeCambiarVencimiento: false,
      documentoAfectadoId: factura,
    });
    expect(ficha.aplicaciones).toHaveLength(1);
    expect(ficha.notas).toEqual([]);
  });

  it('un documento que no existe o es de otra cuenta responde 404', async () => {
    const id = await documentos.registrar();
    const { id: propio } = (await documentos.fila(id))!;

    expect((await propietario().get(`${RUTA}/documentos/${crypto.randomUUID()}`)).estado).toBe(404);
    expect((await otraCuenta.propietario.get(`${RUTA}/documentos/${propio}`)).estado).toBe(404);
  });

  it('marca como propio lo que el usuario registró en Libro de compras', async () => {
    const id = await documentos.registrar();

    expect((await fichaDe(id)).esPropio).toBe(true);
  });
});
