import { beforeEach, describe, expect, it } from 'vitest';
import { operadorDePrueba } from '../../core/compartido/pruebas/dobles-compartidos.js';
import { ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';
import { ModuloDeOrigenInactivo, OrigenDelMovimientoNoCoincide } from '../dominio/errores-de-origen.js';
import { CuentasPorPagarFijo, ModulosDeOrigenFijos } from '../pruebas/dobles-de-cheques.js';
import { AvisosEnMemoria } from '../pruebas/dobles-de-origen.js';
import { RevisorDeCambios, type CambioPorRevisar } from './revisor-de-cambios.js';

class Rechazo extends ReglaDeNegocioInfringida {
  readonly codigo = 'rechazo';
}

const operador = operadorDePrueba();
const DOCUMENTO = '00000000-0000-4000-8000-0000000000bb';
let avisos: AvisosEnMemoria;

const revisor = (activo: boolean) => new RevisorDeCambios({ avisos, modulosDeOrigen: new CuentasPorPagarFijo(activo) });
const movimiento = (cambios: Partial<CambioPorRevisar['movimiento']> = {}): CambioPorRevisar['movimiento'] => ({
  id: 'movimiento-1',
  moduloDeOrigen: null,
  documentoDeOrigenId: null,
  marcadaParaModulo: null,
  ...cambios,
});
const deCuentasPorPagar = () => movimiento({ moduloDeOrigen: 'cuentas-por-pagar', documentoDeOrigenId: DOCUMENTO });

beforeEach(() => {
  avisos = new AvisosEnMemoria();
});

describe('RevisorDeCambios', () => {
  it('un movimiento sin origen ni marca pasa sin avisar a nadie, aunque el módulo esté inactivo', async () => {
    await revisor(false).revisar(operador, { movimiento: movimiento(), cambio: 'eliminar' });

    expect(avisos.recibidos).toEqual([]);
  });

  it('con origen avisa con el cambio, la forma de anulación, el motivo y la fecha', async () => {
    await revisor(true).revisar(operador, {
      movimiento: deCuentasPorPagar(),
      cambio: 'anular',
      formaDeAnulacion: 'con_inverso',
      motivo: 'Error',
      fecha: '2026-02-01',
    });

    expect(avisos.recibidos).toEqual([
      {
        movimientoId: 'movimiento-1',
        moduloDeOrigen: 'cuentas-por-pagar',
        documentoDeOrigenId: DOCUMENTO,
        cambio: 'anular',
        formaDeAnulacion: 'con_inverso',
        motivo: 'Error',
        fecha: '2026-02-01',
      },
    ]);
  });

  it('una nota marcada también avisa, sin módulo ni documento de origen', async () => {
    await revisor(true).revisar(operador, {
      movimiento: movimiento({ marcadaParaModulo: 'cuentas-por-pagar' }),
      cambio: 'desmarcar',
    });

    expect(avisos.recibidos).toEqual([expect.objectContaining({ cambio: 'desmarcar', moduloDeOrigen: null })]);
  });

  it('una nota marcada para Cuentas por cobrar avisa si el módulo está activo y rechaza si no (VC-0b)', async () => {
    const marcada = movimiento({ marcadaParaModulo: 'cuentas-por-cobrar' });
    const conCobrar = new RevisorDeCambios({
      avisos,
      modulosDeOrigen: new ModulosDeOrigenFijos(['cuentas-por-cobrar']),
    });

    await conCobrar.revisar(operador, { movimiento: marcada, cambio: 'anular' });
    expect(avisos.recibidos).toHaveLength(1);
    await expect(revisor(true).revisar(operador, { movimiento: marcada, cambio: 'anular' })).rejects.toThrow(
      ModuloDeOrigenInactivo,
    );
  });

  it('con Cuentas por pagar inactivo rechaza lo suyo y lo marcado, sin avisar', async () => {
    const inactivo = revisor(false);

    await expect(inactivo.revisar(operador, { movimiento: deCuentasPorPagar(), cambio: 'anular' })).rejects.toThrow(
      ModuloDeOrigenInactivo,
    );
    await expect(
      inactivo.revisar(operador, {
        movimiento: movimiento({ marcadaParaModulo: 'cuentas-por-pagar' }),
        cambio: 'corregir',
      }),
    ).rejects.toThrow(ModuloDeOrigenInactivo);
    expect(avisos.recibidos).toEqual([]);
  });

  it('el origen de otro módulo activo se avisa, aunque Cuentas por pagar esté inactivo', async () => {
    const conCajaChica = new RevisorDeCambios({ avisos, modulosDeOrigen: new ModulosDeOrigenFijos(['caja-chica']) });

    await conCajaChica.revisar(operador, {
      movimiento: movimiento({ moduloDeOrigen: 'caja-chica', documentoDeOrigenId: DOCUMENTO }),
      cambio: 'anular',
    });

    expect(avisos.recibidos).toHaveLength(1);
  });

  it('un movimiento con origen en un módulo inactivo se rechaza con su nombre, sin avisar (CCL-B1)', async () => {
    const sinCajaChica = revisor(true);
    const deCajaChica = movimiento({ moduloDeOrigen: 'caja-chica', documentoDeOrigenId: DOCUMENTO });
    const deLiquidar = movimiento({ moduloDeOrigen: 'cuentas-por-liquidar', documentoDeOrigenId: DOCUMENTO });

    await expect(sinCajaChica.revisar(operador, { movimiento: deCajaChica, cambio: 'anular' })).rejects.toThrow(
      ModuloDeOrigenInactivo,
    );
    await expect(sinCajaChica.revisar(operador, { movimiento: deCajaChica, cambio: 'anular' })).rejects.toThrow(
      /Caja chica/,
    );
    await expect(sinCajaChica.revisar(operador, { movimiento: deLiquidar, cambio: 'eliminar' })).rejects.toThrow(
      /Cuentas por liquidar/,
    );
    expect(avisos.recibidos).toEqual([]);
  });

  it('lo que rechaza el módulo de origen llega a quien pidió el cambio', async () => {
    avisos.rechazarCon = new Rechazo('Está ligada a un pago.');

    await expect(
      revisor(true).revisar(operador, { movimiento: deCuentasPorPagar(), cambio: 'eliminar' }),
    ).rejects.toThrow('Está ligada a un pago.');
  });

  it('quien lo pidió por una orden no recibe su propio aviso, pero el movimiento debe ser suyo', async () => {
    const pedidoPor = { modulo: 'cuentas-por-pagar', documentoId: DOCUMENTO };

    await revisor(true).revisar(operador, { movimiento: deCuentasPorPagar(), cambio: 'anular', pedidoPor });
    await expect(
      revisor(true).revisar(operador, { movimiento: movimiento(), cambio: 'anular', pedidoPor }),
    ).rejects.toThrow(OrigenDelMovimientoNoCoincide);
    await expect(
      revisor(true).revisar(operador, {
        movimiento: deCuentasPorPagar(),
        cambio: 'anular',
        pedidoPor: { ...pedidoPor, documentoId: 'otro' },
      }),
    ).rejects.toThrow(OrigenDelMovimientoNoCoincide);
    expect(avisos.recibidos).toEqual([]);
  });
});
