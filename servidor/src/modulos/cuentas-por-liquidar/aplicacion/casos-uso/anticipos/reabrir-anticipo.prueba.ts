import { beforeEach, describe, expect, it } from 'vitest';
import { operadorDePrueba } from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { dependenciasEnMemoria } from '../../../pruebas/dobles-de-anticipos.js';
import { AtenderMovimientoDeAnticipoPorCambiar } from './atender-movimiento-de-anticipo-por-cambiar.js';
import { EntregarAnticipo } from './entregar-anticipo.js';
import { LiquidarAnticipo } from './liquidar-anticipo.js';
import type { PeticionDeAnticipo } from './peticion-de-anticipo.js';
import { ReabrirAnticipo } from './reabrir-anticipo.js';

const operador = operadorDePrueba();

const entrega = {
  forma: 'cheque',
  chequeraId: 'chequera-1',
  beneficiarioId: 'tercero-1',
  esEmpleado: true,
  clase: 'viatico',
  descripcion: 'Viaje',
  monto: '1000.00',
  fecha: '2026-11-10',
  puedeConVencidos: false,
} as PeticionDeAnticipo;

let piezas: ReturnType<typeof dependenciasEnMemoria>;
let anticipoId: string;

/** Liquida el anticipo con Q700.00 gastados y Q300.00 devueltos (la devolución queda en «mov-2»). */
async function liquidarConDevolucion() {
  piezas.consultas.reparto = {
    totalCentavos: 70_000,
    deActivoCentavos: 0,
    ultimaFecha: '2026-11-14',
    documentosDeCompraIds: ['doc-1'],
  };
  await new LiquidarAnticipo(piezas.dependencias).ejecutar(operador, {
    anticipoId,
    devuelto: '300.00',
    noLiquidado: '0',
  });
  piezas.publicadorEventos.publicados.length = 0;
  piezas.auditoria.entradas.length = 0;
  piezas.bancos.desgloses.length = 0;
  piezas.documentos.marcas.length = 0;
}

beforeEach(async () => {
  piezas = dependenciasEnMemoria();
  anticipoId = (await new EntregarAnticipo(piezas.dependencias).ejecutar(operador, entrega)).id;
  await liquidarConDevolucion();
});

describe('reabrir un anticipo liquidado', () => {
  const reabrir = (motivo = 'Faltaba una factura') =>
    new ReabrirAnticipo(piezas.dependencias).ejecutar(operador, { anticipoId, motivo });

  it('anula el depósito en Bancos, lo deja abierto, vuelve a fijar el desglose, desmarca los documentos y audita «reabrir»', async () => {
    const dto = await reabrir();

    expect(piezas.bancos.anulaciones[0]).toMatchObject({
      movimientoId: 'mov-2',
      origen: { modulo: 'cuentas-por-liquidar', documentoId: anticipoId },
      motivo: 'Anticipo reabierto desde Cuentas por liquidar: Faltaba una factura',
    });
    expect(dto).toMatchObject({ estado: 'abierto', liquidacion: null, puedeLiquidar: true, puedeReabrir: false });
    expect(piezas.anticipos.guardados.get(anticipoId)!.movimientoDeDevolucionId).toBeNull();
    expect(piezas.bancos.desgloses[0]).toMatchObject({
      movimientoId: 'mov-1',
      conceptos: [{ claveDeSistema: 'anticipo_por_liquidar', montoCentavos: 100_000 }],
    });
    expect(piezas.documentos.marcas).toEqual([{ documentoId: 'doc-1', procesado: false }]);
    expect(piezas.auditoria.entradas).toMatchObject([
      { recurso: 'cuentas-por-liquidar.anticipos', accion: 'reabrir', motivo: 'Faltaba una factura' },
    ]);
    expect((piezas.auditoria.entradas[0]!.anterior as { estado: string }).estado).toBe('liquidado');
    expect(piezas.publicadorEventos.nombres()).toEqual(['cuentas-por-liquidar.anticipo_reabierto']);
  });

  it('con inverso la fecha contable es la del inverso de Bancos', async () => {
    piezas.bancos.anulacion = { forma: 'con_inverso', fechaDelInverso: '2026-11-17' };

    await reabrir();

    expect(piezas.publicadorEventos.publicados[0]).toMatchObject({
      datos: { fecha: '2026-11-17', anulacionEnBancos: 'con_inverso', devueltoCentavos: 30_000 },
    });
  });

  it('exige el motivo y, si Bancos rechaza (mes conciliado), no se reabre', async () => {
    await expect(reabrir('  ')).rejects.toMatchObject({ codigo: 'motivo_invalido' });

    piezas.bancos.rechazo = new Error('Mes conciliado');
    await expect(reabrir()).rejects.toThrow('Mes conciliado');
    expect(piezas.anticipos.guardados.get(anticipoId)!.estado).toBe('liquidado');
    expect(piezas.auditoria.entradas).toEqual([]);
  });

  it('uno abierto no se reabre', async () => {
    await reabrir();

    await expect(reabrir()).rejects.toMatchObject({ codigo: 'anticipo_no_liquidado' });
  });

  it('lo no liquidado sin devolución se reabre sin ordenar nada a Bancos', async () => {
    await reabrir();
    await new LiquidarAnticipo(piezas.dependencias).ejecutar(operador, {
      anticipoId,
      devuelto: '0',
      noLiquidado: '300.00',
      destinoDeNoLiquidado: 'perdida',
      motivoDeNoLiquidado: 'Se extravió',
    });
    piezas.bancos.anulaciones.length = 0;

    const dto = await reabrir();

    expect(dto.estado).toBe('abierto');
    expect(piezas.bancos.anulaciones).toEqual([]);
  });
});

describe('el aviso de Bancos si anulan la devolución', () => {
  const aviso = (cambios: Record<string, unknown> = {}) => ({
    movimientoId: 'mov-2',
    cambio: 'anular' as const,
    formaDeAnulacion: 'con_inverso' as const,
    motivo: 'Boleta mal digitada',
    fecha: '2026-11-16',
    ...cambios,
  });
  const atender = () => new AtenderMovimientoDeAnticipoPorCambiar(piezas.dependencias);

  it('reabre el anticipo sin volver a ordenar a Bancos', async () => {
    await atender().ejecutar(operador, aviso());

    expect(piezas.anticipos.guardados.get(anticipoId)!.estado).toBe('abierto');
    expect(piezas.bancos.anulaciones).toEqual([]);
    expect(piezas.auditoria.acciones()).toEqual(['cuentas-por-liquidar.anticipos:reabrir']);
    expect(piezas.publicadorEventos.publicados[0]).toMatchObject({ datos: { fecha: '2026-11-16' } });
  });

  it('cualquier otro cambio de la devolución se rechaza y la entrega de un liquidado no se anula', async () => {
    await expect(atender().ejecutar(operador, aviso({ cambio: 'eliminar' }))).rejects.toMatchObject({
      codigo: 'movimiento_de_cuentas_por_liquidar',
    });
    await expect(atender().ejecutar(operador, aviso({ movimientoId: 'mov-1' }))).rejects.toMatchObject({
      codigo: 'anticipo_liquidado',
    });
  });
});
