import { describe, expect, it } from 'vitest';
import {
  operadorDePrueba,
  PublicadorEventosEnMemoria,
  UnidadDeTrabajoEnMemoria,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import {
  MovimientoConPagosAnulados,
  MovimientoDeCuentasPorPagar,
  MovimientoLigadoAPagos,
} from '../../../dominio/errores-de-anulacion-de-pagos.js';
import type { PagoConLineas } from '../../../dominio/pago-con-lineas.js';
import { AtenderMovimientoPorCambiar, type AvisoDeMovimientoPorCambiar } from './atender-movimiento-por-cambiar.js';
import type { DependenciasDeCambiarPagos } from './dependencias-de-pagos.js';

const operador = operadorDePrueba();
const MOVIMIENTO = crypto.randomUUID();

const pago = (cambios: Partial<PagoConLineas>): PagoConLineas => ({
  id: crypto.randomUUID(),
  proveedorId: 'p',
  numero: 4,
  anioDeNumero: 2026,
  forma: 'cheque',
  fecha: '2026-03-10',
  montoCentavos: 1000,
  movimientoId: MOVIMIENTO,
  retiroId: null,
  recibidoPor: null,
  motivoSinBancarizar: null,
  observaciones: null,
  motivo: null,
  conCargaCerrada: null,
  estado: 'vigente',
  fechaDeAnulacion: null,
  motivoDeAnulacion: null,
  lineas: [{ cargoId: 'c', contrasenaId: 'k1', montoCentavos: 1000, retencionDescontadaCentavos: 0 }],
  ...cambios,
});

const aviso = (cambio: AvisoDeMovimientoPorCambiar['cambio']): AvisoDeMovimientoPorCambiar => ({
  movimientoId: MOVIMIENTO,
  cambio,
  formaDeAnulacion: cambio === 'anular' ? 'sin_inverso' : null,
  motivo: 'Prueba',
  fecha: null,
});

function manejadorCon(pagos: PagoConLineas[]) {
  const eventos = new PublicadorEventosEnMemoria();
  const dependencias = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    publicadorEventos: eventos,
    pagos: { delMovimiento: async () => pagos },
    consultasDePagos: { contrasenas: async () => new Map([['k1', { numero: '2026-9', fecha: '2026-03-01' }]]) },
  } as unknown as DependenciasDeCambiarPagos;
  return { atender: new AtenderMovimientoPorCambiar(dependencias), eventos };
}

describe('el aviso de Bancos antes de cambiar un movimiento', () => {
  it('sin pagos con ese movimiento no hace nada, sea cual sea el cambio', async () => {
    const { atender, eventos } = manejadorCon([]);

    for (const cambio of ['anular', 'eliminar', 'blanquear', 'corregir', 'desmarcar'] as const) {
      await atender.ejecutar(operador, aviso(cambio));
    }

    expect(eventos.publicados).toEqual([]);
  });

  it('eliminar un movimiento que solo tuvo pagos anulados pide anularlo en vez de eliminarlo', async () => {
    const { atender } = manejadorCon([pago({ estado: 'anulado' })]);

    await expect(atender.ejecutar(operador, aviso('eliminar'))).rejects.toThrow(MovimientoConPagosAnulados);
    await atender.ejecutar(operador, aviso('anular'));
  });

  it('corregir, eliminar o blanquear lo que emitió un pago vigente se rechaza y nombra el pago', async () => {
    const { atender } = manejadorCon([pago({})]);

    for (const cambio of ['eliminar', 'blanquear', 'corregir', 'reclasificar'] as const) {
      await expect(atender.ejecutar(operador, aviso(cambio))).rejects.toThrow(MovimientoDeCuentasPorPagar);
    }
    await expect(atender.ejecutar(operador, aviso('corregir'))).rejects.toThrow(/pago 2026-4/);
  });

  it('una nota ligada no se cambia ni se anula mientras haya pagos que la apliquen', async () => {
    const { atender } = manejadorCon([pago({ forma: 'nota_ligada' })]);

    for (const cambio of ['anular', 'eliminar', 'desmarcar', 'corregir'] as const) {
      await expect(atender.ejecutar(operador, aviso(cambio))).rejects.toThrow(MovimientoLigadoAPagos);
    }
    await expect(atender.ejecutar(operador, aviso('anular'))).rejects.toThrow(
      /aplicada al pago 2026-4 de la contraseña 2026-9/,
    );
  });
});
