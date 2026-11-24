import { describe, expect, it, vi } from 'vitest';
import {
  operadorDePrueba,
  PublicadorEventosEnMemoria,
  UnidadDeTrabajoEnMemoria,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { PagoNoEsChequeDeApertura } from '../../../dominio/errores-de-cheque-de-apertura.js';
import type { PagoConLineas } from '../../../dominio/pago-con-lineas.js';
import { DesligarChequeDeApertura } from './desligar-cheque-de-apertura.js';
import type { DependenciasDeCambiarPagos } from './dependencias-de-pagos.js';

const operador = operadorDePrueba();

const pago = (cambios: Partial<PagoConLineas>): PagoConLineas => ({
  id: 'pago-1',
  proveedorId: 'p',
  numero: 7,
  anioDeNumero: 0,
  forma: 'cheque_de_apertura',
  fecha: '2026-12-10',
  montoCentavos: 60000,
  movimientoId: 'mov-1',
  retiroId: null,
  recibidoPor: null,
  motivoSinBancarizar: null,
  observaciones: null,
  motivo: null,
  conCargaCerrada: null,
  chequeDeAperturaReferidoId: null,
  estado: 'vigente',
  fechaDeAnulacion: null,
  motivoDeAnulacion: null,
  lineas: [{ cargoId: 'c', contrasenaId: 'k1', montoCentavos: 60000, retencionDescontadaCentavos: 0 }],
  ...cambios,
});

function desligadorCon(guardado: PagoConLineas) {
  const llamadas: string[] = [];
  const dependencias = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    publicadorEventos: new PublicadorEventosEnMemoria(),
    pagos: {
      buscar: vi.fn(async () => guardado),
      bloquear: vi.fn(async () => {
        llamadas.push('bloquear el pago');
        return guardado;
      }),
    },
    movimientos: {
      bloquear: vi.fn(async () => {
        llamadas.push('bloquear el cheque');
      }),
    },
    bancos: {
      desligarChequeDeApertura: vi.fn(async () => {
        llamadas.push('desligar en Bancos');
      }),
    },
  } as unknown as DependenciasDeCambiarPagos;
  return { desligar: new DesligarChequeDeApertura(dependencias), dependencias, llamadas };
}

describe('desligar el cheque de apertura de su pago', () => {
  it('pide un motivo antes de tocar nada', async () => {
    const { desligar, dependencias } = desligadorCon(pago({}));

    await expect(desligar.ejecutar(operador, { pagoId: 'pago-1', motivo: '   ' })).rejects.toThrow();

    expect(dependencias.pagos.buscar).not.toHaveBeenCalled();
  });

  it('bloquea el cheque en Bancos antes que el pago, igual que al ligar', async () => {
    const { desligar, llamadas } = desligadorCon(pago({}));

    await desligar.ejecutar(operador, { pagoId: 'pago-1', motivo: 'Factura equivocada' }).catch(() => undefined);

    expect(llamadas.slice(0, 2)).toEqual(['bloquear el cheque', 'bloquear el pago']);
  });

  it('un pago de otra forma no se desliga y no llama a Bancos', async () => {
    const { desligar, dependencias } = desligadorCon(pago({ forma: 'cheque' }));

    await expect(desligar.ejecutar(operador, { pagoId: 'pago-1', motivo: 'Error' })).rejects.toThrow(
      PagoNoEsChequeDeApertura,
    );

    expect(dependencias.bancos.desligarChequeDeApertura).not.toHaveBeenCalled();
  });
});
