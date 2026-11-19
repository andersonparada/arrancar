import { beforeEach, describe, expect, it } from 'vitest';
import { operador, prepararEscenarioDeGastos } from '../../../pruebas/escenario-de-gastos.js';
import { AsignarGastos } from './asignar-gastos.js';
import { AtenderBajaDeDocumento } from './atender-baja-de-documento.js';
import { ResponderPagadoAlProveedor } from './responder-pagado-al-proveedor.js';

let e: Awaited<ReturnType<typeof prepararEscenarioDeGastos>>;

beforeEach(async () => {
  e = await prepararEscenarioDeGastos();
});

const bajas = () => new AtenderBajaDeDocumento(e.dependenciasDeGastos);
const aviso = (documentoId: string, destino = 'cuentas-por-liquidar') => ({ documentoId, destino, motivo: 'Error' });

async function asignado() {
  const gasto = await e.enLaBandeja();
  await new AsignarGastos(e.dependenciasDeGastos).ejecutar(operador, {
    anticipoId: e.anticipoId,
    puedeConRetencion: false,
    documentos: [{ gastoId: gasto.id }],
  });
  e.publicadorEventos.publicados.length = 0;
  e.auditoria.entradas.length = 0;
  return gasto;
}

describe('aviso de que el libro anula un documento', () => {
  it('en la bandeja anula el gasto y lo audita', async () => {
    const gasto = await e.enLaBandeja();

    await bajas().anular(operador, aviso(gasto.documentoDeCompraId!));

    expect(await e.gastos.buscar(gasto.id)).toMatchObject({ estado: 'anulado', motivoDeAnulacion: 'Error' });
    expect(e.auditoria.entradas).toMatchObject([{ recurso: 'cuentas-por-liquidar.gastos', accion: 'anular' }]);
    expect(e.publicadorEventos.publicados).toEqual([]);
  });

  it('en un anticipo abierto lo quita, lo audita y publica gasto_quitado', async () => {
    const gasto = await asignado();

    await bajas().anular(operador, aviso(gasto.documentoDeCompraId!));

    expect((await e.gastos.buscar(gasto.id))?.estado).toBe('anulado');
    expect(e.publicadorEventos.nombres()).toEqual(['cuentas-por-liquidar.gasto_quitado']);
  });

  it('en un anticipo liquidado se rechaza y el gasto no cambia', async () => {
    const gasto = await asignado();
    e.cambiarElAnticipo({ estado: 'liquidado' });

    await expect(bajas().anular(operador, aviso(gasto.documentoDeCompraId!))).rejects.toMatchObject({
      codigo: 'anticipo_no_abierto',
    });
    expect((await e.gastos.buscar(gasto.id))?.estado).toBe('vigente');
  });

  it('es idempotente: sin gasto, ya anulado o de otro destino no hace nada', async () => {
    const gasto = await e.enLaBandeja();
    await bajas().anular(operador, aviso(gasto.documentoDeCompraId!));
    e.auditoria.entradas.length = 0;

    await bajas().anular(operador, aviso(gasto.documentoDeCompraId!));
    await bajas().anular(operador, aviso(crypto.randomUUID()));
    await bajas().anular(operador, aviso(gasto.documentoDeCompraId!, 'cuentas-por-pagar'));

    expect(e.auditoria.entradas).toEqual([]);
  });
});

describe('aviso de que el libro elimina un documento', () => {
  it('borra la fila (la llave del libro lo exige) y deja la auditoría con el gasto como estaba', async () => {
    const gasto = await asignado();

    await bajas().eliminar(operador, { documentoId: gasto.documentoDeCompraId!, destino: 'cuentas-por-liquidar' });

    expect(e.gastos.eliminados).toEqual([gasto.id]);
    expect(e.auditoria.entradas).toMatchObject([
      { recurso: 'cuentas-por-liquidar.gastos', accion: 'eliminar', anterior: { anticipoId: e.anticipoId } },
    ]);
  });
});

describe('respuesta a la bancarización compartida', () => {
  it('sin gastos asignados no dice nada', async () => {
    const respuesta = await new ResponderPagadoAlProveedor(e.consultasDeGastos).ejecutar({
      proveedorId: 'proveedor-1',
      mes: '2026-11-01',
    });

    expect(respuesta).toBeNull();
  });

  it('con gastos dice el total como efectivo, con el anticipo de dónde sale', async () => {
    const respuesta = await new ResponderPagadoAlProveedor({
      pagadoAlProveedorEnElMes: async () => ({ totalCentavos: 560_000, anticipos: [{ numero: 3, anioDeNumero: 0 }] }),
    }).ejecutar({ proveedorId: 'proveedor-1', mes: '2026-11-01' });

    expect(respuesta).toEqual({ efectivoCentavos: 560_000, bancarizadoCentavos: 0, comprobantes: ['Anticipo 3'] });
  });
});
