import { beforeEach, describe, expect, it } from 'vitest';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { Costo } from '../../../dominio/costo.js';
import { SaldoConMovimientosPosteriores } from '../../../dominio/errores-de-saldo-inicial.js';
import {
  armarSaldos,
  operador,
  solicitudDeSaldo,
  type EscenarioDeSaldos,
} from '../../../pruebas/escenario-de-saldos.soporte.js';

let e: EscenarioDeSaldos;
let camionesId: string;

const cargar = (cambios: Parameters<typeof solicitudDeSaldo>[1] = {}) =>
  e.guardar.ejecutar(operador, solicitudDeSaldo(camionesId, cambios));

beforeEach(async () => {
  e = armarSaldos();
  camionesId = await e.claseDe('maquinaria_y_vehiculos', '20.00');
});

describe('CorregirSaldoInicial: lo que el activo recibió después de la carga', () => {
  it('rechaza la corrección si el activo recibió un costo de otro origen o se puso en uso después', async () => {
    const obra = await cargar({
      enConstruccion: true,
      fechaDeInicioDeUso: null,
      depreciacionAcumuladaContable: '0.00',
      depreciacionAcumuladaFiscal: '0.00',
      vidaUtilRestanteMeses: null,
    });
    const pedido = { activoId: obra.activoId, solicitud: solicitudDeSaldo(camionesId, { enConstruccion: true }) };
    const manual = Costo.manual(Identificador.desde(operador.empresaId), obra.activoId, {
      claseDeCosto: 'adquisicion',
      fecha: '2026-03-01',
      montoCentavos: 100_000,
      documentoDeSoporte: 'DUCA 1',
      descripcion: null,
      aplicaAlLibroFiscal: true,
      motivoFueraDelLibroFiscal: null,
      noEsEdificacion: false,
    });
    await e.costos.agregarVarios([manual]);

    await expect(e.corregir.ejecutar(operador, pedido)).rejects.toBeInstanceOf(SaldoConMovimientosPosteriores);

    expect(e.auditoria.entradas).toHaveLength(0);
  });

  it('rechaza la corrección si ya tiene tramos de inicio de uso', async () => {
    const saldo = await cargar();
    const [contable] = e.tramos.porActivo.get(saldo.activoId) ?? [];
    e.tramos.porActivo.set(saldo.activoId, [{ ...contable!, causa: 'inicio_de_uso' }]);

    await expect(
      e.corregir.ejecutar(operador, { activoId: saldo.activoId, solicitud: solicitudDeSaldo(camionesId) }),
    ).rejects.toBeInstanceOf(SaldoConMovimientosPosteriores);
    expect(e.auditoria.entradas).toHaveLength(0);
  });
});
