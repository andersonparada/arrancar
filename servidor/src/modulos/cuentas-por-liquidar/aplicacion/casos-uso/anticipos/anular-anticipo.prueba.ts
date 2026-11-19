import { beforeEach, describe, expect, it } from 'vitest';
import { operadorDePrueba } from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { dependenciasEnMemoria } from '../../../pruebas/dobles-de-anticipos.js';
import { AnularAnticipo } from './anular-anticipo.js';
import { AtenderMovimientoDeAnticipoPorCambiar } from './atender-movimiento-de-anticipo-por-cambiar.js';
import { EntregarAnticipo } from './entregar-anticipo.js';
import type { PeticionDeAnticipo } from './peticion-de-anticipo.js';

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

beforeEach(async () => {
  piezas = dependenciasEnMemoria();
  anticipoId = (await new EntregarAnticipo(piezas.dependencias).ejecutar(operador, entrega)).id;
  piezas.publicadorEventos.publicados.length = 0;
});

describe('anular un anticipo desde aquí', () => {
  const anular = (motivo = 'Se entregó por error') =>
    new AnularAnticipo(piezas.dependencias).ejecutar(operador, { anticipoId, motivo });

  it('ordena a Bancos anular el cheque, lo deja anulado con su fecha contable y lo audita como estaba', async () => {
    const anulado = await anular();

    expect(piezas.bancos.anulaciones[0]).toMatchObject({
      movimientoId: 'mov-1',
      origen: { modulo: 'cuentas-por-liquidar', documentoId: anticipoId },
      motivo: 'Se entregó por error',
    });
    expect(anulado).toMatchObject({
      estado: 'anulado',
      porJustificar: '0.00',
      anulacion: { fecha: '2026-11-10', motivo: 'Se entregó por error' },
    });
    expect(piezas.auditoria.entradas).toMatchObject([
      { recurso: 'cuentas-por-liquidar.anticipos', accion: 'anular', registroId: anticipoId },
    ]);
    expect((piezas.auditoria.entradas[0]!.anterior as { estado: string }).estado).toBe('abierto');
    expect(piezas.publicadorEventos.nombres()).toEqual(['cuentas-por-liquidar.anticipo_anulado']);
  });

  it('con inverso en Bancos la fecha contable es la del inverso', async () => {
    piezas.bancos.anulacion = { forma: 'con_inverso', fechaDelInverso: '2026-11-15' };

    const anulado = await anular();

    expect(anulado.anulacion?.fecha).toBe('2026-11-15');
  });

  it('exige el motivo', async () => {
    await expect(anular('  ')).rejects.toMatchObject({ codigo: 'motivo_invalido' });
  });

  it('un anticipo con gastos no se anula', async () => {
    piezas.consultas.gastado = { cantidad: 1, totalCentavos: 5_000 };

    await expect(anular()).rejects.toMatchObject({ codigo: 'anticipo_con_gastos' });
    expect(piezas.bancos.anulaciones).toEqual([]);
  });

  it('con el cheque ya cobrado no se anula', async () => {
    piezas.movimientos.conciliado = true;

    await expect(anular()).rejects.toMatchObject({ codigo: 'anticipo_cobrado' });
  });

  it('uno ya anulado no se anula otra vez, y si Bancos rechaza nada cambia', async () => {
    piezas.bancos.rechazo = new Error('Mes conciliado');
    await expect(anular()).rejects.toThrow('Mes conciliado');
    expect(piezas.anticipos.guardados.get(anticipoId)!.estado).toBe('abierto');
    expect(piezas.auditoria.entradas).toEqual([]);

    piezas.bancos.rechazo = null;
    await anular();
    await expect(anular()).rejects.toMatchObject({ codigo: 'anticipo_ya_anulado' });
  });

  it('bloquea el movimiento de Bancos antes que el anticipo', async () => {
    await anular();

    expect(piezas.movimientos.bloqueados).toContain('mov-1');
  });
});

describe('el aviso de Bancos antes de cambiar el movimiento', () => {
  const aviso = (cambios: Record<string, unknown> = {}) => ({
    movimientoId: 'mov-1',
    cambio: 'anular' as const,
    formaDeAnulacion: 'con_inverso' as const,
    motivo: 'Cheque mal emitido',
    fecha: '2026-11-16',
    ...cambios,
  });
  const atender = () => new AtenderMovimientoDeAnticipoPorCambiar(piezas.dependencias);

  it('si Bancos anula la entrega de un anticipo abierto sin gastos, se anula el anticipo sin volver a ordenar a Bancos', async () => {
    await atender().ejecutar(operador, aviso());

    const anticipo = piezas.anticipos.guardados.get(anticipoId)!;
    expect(anticipo).toMatchObject({ estado: 'anulado', fechaDeAnulacion: '2026-11-16' });
    expect(piezas.bancos.anulaciones).toEqual([]);
    expect(piezas.auditoria.acciones()).toEqual(['cuentas-por-liquidar.anticipos:anular']);
    expect(piezas.publicadorEventos.nombres()).toEqual(['cuentas-por-liquidar.anticipo_anulado']);
  });

  it('un movimiento que no es de un anticipo no hace nada', async () => {
    await atender().ejecutar(operador, aviso({ movimientoId: 'otro' }));

    expect(piezas.anticipos.guardados.get(anticipoId)!.estado).toBe('abierto');
    expect(piezas.publicadorEventos.publicados).toEqual([]);
  });

  it('con gastos se rechaza y nada cambia', async () => {
    piezas.consultas.gastado = { cantidad: 2, totalCentavos: 9_000 };

    await expect(atender().ejecutar(operador, aviso())).rejects.toMatchObject({ codigo: 'anticipo_con_gastos' });
    expect(piezas.anticipos.guardados.get(anticipoId)!.estado).toBe('abierto');
  });

  it.each(['eliminar', 'corregir', 'blanquear', 'reclasificar'] as const)('«%s» se rechaza', async (cambio) => {
    await expect(atender().ejecutar(operador, aviso({ cambio }))).rejects.toMatchObject({
      codigo: 'movimiento_de_cuentas_por_liquidar',
    });
  });

  it('repetir el aviso de un anticipo ya anulado es inofensivo', async () => {
    await atender().ejecutar(operador, aviso());
    piezas.publicadorEventos.publicados.length = 0;

    await atender().ejecutar(operador, aviso());

    expect(piezas.publicadorEventos.publicados).toEqual([]);
  });
});
