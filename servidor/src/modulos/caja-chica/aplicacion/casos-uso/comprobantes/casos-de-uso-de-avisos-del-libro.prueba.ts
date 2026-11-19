import { beforeEach, describe, expect, it } from 'vitest';
import { operadorDePrueba } from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import type { DocumentoParaDestino } from '../../../../core/contratos/libro-de-compras.contratos.js';
import { AsignarDocumentos } from './asignar-documentos.js';
import { AnularPorAviso, EliminarPorAviso } from './atender-avisos-del-libro.js';
import { armarEscenario, FONDO_ID, HOY, type EscenarioEnMemoria } from './dobles-de-comprobantes.soporte.js';
import { RecibirDocumento } from './recibir-documento.js';
import { ResponderPagadoAlProveedor } from './responder-pagado-al-proveedor.js';

const operador = operadorDePrueba();
let m: EscenarioEnMemoria;
const FONDO = FONDO_ID;

const documento = (cambios: Partial<DocumentoParaDestino> = {}): DocumentoParaDestino => ({
  documentoId: crypto.randomUUID(),
  tipo: 'factura',
  proveedorId: 'proveedor-1',
  documentoAfectadoId: null,
  fechaEmision: HOY,
  totalCentavos: 112_000,
  retencionesCentavos: 0,
  tieneActivoFijo: false,
  ...cambios,
});

/** Un documento recibido y asignado al fondo; devuelve su id de documento y de comprobante. */
async function enElFondo(cambios: Partial<DocumentoParaDestino> = {}) {
  const recibido = documento({ ...cambios, referenciaDeDestino: FONDO });
  await new RecibirDocumento(m.dependencias).ejecutar(operador, recibido);
  const comprobante = [...m.comprobantes.filas.values()].find((c) => c.documentoDeCompraId === recibido.documentoId)!;
  expect(comprobante.fondoId, 'debía quedar asignado').toBe(FONDO);
  return { documentoId: recibido.documentoId, id: comprobante.id };
}

beforeEach(async () => {
  m = await armarEscenario(1_000_000);
  m.publicador.publicados.length = 0;
});

describe('los avisos del libro', () => {
  const aviso = (documentoId: string, destino = 'caja-chica') => ({ documentoId, destino, motivo: 'Mal capturado' });

  it('anular: anula el comprobante con el motivo del aviso; uno de otro destino, uno ya anulado o uno que no está aquí no hacen nada', async () => {
    const caso = new AnularPorAviso(m.dependencias);
    const { id, documentoId } = await enElFondo();

    await caso.ejecutar(operador, aviso(documentoId, 'cuentas-por-pagar'));
    await caso.ejecutar(operador, aviso('no-esta-aqui'));
    expect(m.comprobantes.filas.get(id)!.estado).toBe('vigente');
    await caso.ejecutar(operador, aviso(documentoId));
    await caso.ejecutar(operador, aviso(documentoId));

    expect(m.comprobantes.filas.get(id)).toMatchObject({ estado: 'anulado', motivoDeAnulacion: 'Mal capturado' });
    expect(m.auditoria.entradas).toMatchObject([{ accion: 'anular', registroId: id }]);
  });

  it('un comprobante repuesto impide anular y eliminar: ComprobanteRepuesto', async () => {
    const { id, documentoId } = await enElFondo();
    m.comprobantes.filas.set(id, { ...m.comprobantes.filas.get(id)!, reposicionNumero: 7 });

    await expect(new AnularPorAviso(m.dependencias).ejecutar(operador, aviso(documentoId))).rejects.toMatchObject({
      codigo: 'comprobante_repuesto',
      message: 'Está en la reposición 7: anúlela primero.',
    });
    await expect(new EliminarPorAviso(m.dependencias).ejecutar(operador, aviso(documentoId))).rejects.toMatchObject({
      codigo: 'comprobante_repuesto',
    });
    expect(m.comprobantes.filas.get(id)!.estado).toBe('vigente');
  });

  it('eliminar: audita `eliminar` con el comprobante como estaba, lo borra y, si estaba en un fondo, publica comprobante_quitado', async () => {
    const { id, documentoId } = await enElFondo();
    await new RecibirDocumento(m.dependencias).ejecutar(operador, documento());
    const enLaBandeja = [...m.comprobantes.filas.values()].find((c) => c.fondoId === null)!;
    m.publicador.publicados.length = 0;
    const caso = new EliminarPorAviso(m.dependencias);

    await caso.ejecutar(operador, aviso(documentoId));
    await caso.ejecutar(operador, aviso(enLaBandeja.documentoDeCompraId!));
    await caso.ejecutar(operador, aviso(documentoId));

    expect(m.comprobantes.filas.has(id)).toBe(false);
    expect(m.comprobantes.filas.has(enLaBandeja.id)).toBe(false);
    expect(m.auditoria.acciones()).toEqual(['caja-chica.comprobantes:eliminar', 'caja-chica.comprobantes:eliminar']);
    expect(m.auditoria.entradas[0]!.anterior).toMatchObject({ fondoId: FONDO, monto: '1120.00' });
    expect(m.publicador.nombres()).toEqual(['caja-chica.comprobante_quitado']);
  });
});

describe('ResponderPagadoAlProveedor', () => {
  it('responde nulo si los fondos no pagaron nada, y si no, el total en efectivo con cuántos comprobantes son', async () => {
    const pagos = { delProveedorEnElMes: async () => ({ totalCentavos: 0, cantidad: 0 }) };
    expect(await new ResponderPagadoAlProveedor(pagos).ejecutar({ proveedorId: 'p', mes: '2026-11-01' })).toBeNull();

    const conPagos = { delProveedorEnElMes: async () => ({ totalCentavos: 560_000, cantidad: 2 }) };
    expect(await new ResponderPagadoAlProveedor(conPagos).ejecutar({ proveedorId: 'p', mes: '2026-11-01' })).toEqual({
      efectivoCentavos: 560_000,
      bancarizadoCentavos: 0,
      comprobantes: ['Caja chica: 2 comprobantes'],
    });
  });
});

describe('AsignarDocumentos con varios documentos', () => {
  it('asigna cada uno con sus avisos y publica un evento por documento', async () => {
    const caso = new RecibirDocumento(m.dependencias);
    await caso.ejecutar(operador, documento());
    await caso.ejecutar(operador, documento());
    const ids = [...m.comprobantes.filas.keys()];
    m.bancarizacion.resultado = 'avisar';

    const resultado = await new AsignarDocumentos(m.dependencias).ejecutar(operador, {
      fondoId: FONDO,
      documentos: ids.map((comprobanteId) => ({ comprobanteId })),
      permisos: { sobreElTope: false, conRetencion: false },
    });

    expect(resultado.comprobantes).toHaveLength(2);
    expect(resultado.avisos).toHaveLength(2);
    expect(m.publicador.nombres()).toEqual(['caja-chica.comprobante_asignado', 'caja-chica.comprobante_asignado']);
  });
});
