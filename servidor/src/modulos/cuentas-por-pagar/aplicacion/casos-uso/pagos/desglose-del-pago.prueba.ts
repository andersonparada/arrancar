import { describe, expect, it } from 'vitest';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { NotaParaLigar } from '../../../dominio/nota-para-ligar.js';
import type { PagoConLineas } from '../../../dominio/pago-con-lineas.js';
import { documentoSembrado } from '../../../pruebas/dobles-de-aplicaciones.js';
import type { DesgloseDelMovimiento } from '../../puertos/puertos-de-pagos.js';
import type { LineaRevisada } from './dependencias-de-pagos.js';
import { DesgloseDelPago } from './desglose-del-pago.js';

const operador = { usuarioId: 'u', cuentaId: 'c', empresaId: 'e', esSuperacceso: false } as Operador;

const nota: NotaParaLigar = {
  movimientoId: 'nota-1',
  cuentaBancariaId: 'cb',
  fecha: '2026-11-01',
  montoCentavos: 336_000,
  numero: 3,
  beneficiario: null,
  ligable: true,
};

const linea = (montoCentavos: number, tieneActivoFijo: boolean): LineaRevisada =>
  ({ montoCentavos, fila: { documento: documentoSembrado({ tieneActivoFijo }) } }) as LineaRevisada;

/** Lo que Bancos recibió y lo que la base dice que está ligado a la nota. */
function armar(ligado = { totalCentavos: 0, deActivoCentavos: 0 }) {
  const enviados: DesgloseDelMovimiento[] = [];
  const bloqueadas: string[] = [];
  const desglose = new DesgloseDelPago({
    bancos: { fijarDesglose: async (_: Operador, orden: DesgloseDelMovimiento) => void enviados.push(orden) },
    notas: { bloquear: async (id: string) => (bloqueadas.push(id), nota), listar: async () => [] },
    pagos: { ligadoAlMovimiento: async () => ligado },
  } as never);
  return { desglose, enviados, bloqueadas };
}

const pago = (forma: PagoConLineas['forma'], movimientoId: string | null) =>
  ({ id: 'p1', forma, movimientoId }) as PagoConLineas;

describe('el reparto de una nota ligada', () => {
  it('manda lo ligado a activo fijo a Inversión y lo demás a Operación, sin origen', async () => {
    const { desglose, enviados } = armar({ totalCentavos: 224_000, deActivoCentavos: 224_000 });

    await desglose.fijarLaNota(operador, nota);

    expect(enviados).toEqual([
      {
        origen: null,
        movimientoId: 'nota-1',
        conceptos: [
          { claveDeSistema: 'pago_a_proveedor', montoCentavos: 112_000 },
          { claveDeSistema: 'pago_a_proveedor_de_activo', montoCentavos: 224_000 },
        ],
      },
    ]);
  });

  it('sin pagos vigentes que la liguen, todo vuelve a Operación', async () => {
    const { desglose, enviados } = armar();

    await desglose.fijarLaNota(operador, nota);

    expect(enviados[0]!.conceptos).toEqual([{ claveDeSistema: 'pago_a_proveedor', montoCentavos: 336_000 }]);
  });

  it('solo bloquea la nota de un pago ligado', async () => {
    const { desglose, bloqueadas } = armar();

    expect(await desglose.bloquearLaNota(pago('cheque', 'm-1'))).toBeNull();
    expect(await desglose.bloquearLaNota(pago('nota_ligada', 'nota-1'))).toBe(nota);
    expect(bloqueadas).toEqual(['nota-1']);
  });
});

describe('el reparto al reaplicar', () => {
  it('no manda nada si lo pagado a activo fijo no cambió', async () => {
    const { desglose, enviados } = armar();

    await desglose.alReaplicar(operador, pago('nota_ligada', 'nota-1'), {
      antes: [linea(100, false)],
      despues: [linea(100, false)],
      nota,
    });

    expect(enviados).toEqual([]);
  });

  it('en una nota ligada vuelve a fijar el reparto de la nota; en un cheque, el del pago con su origen', async () => {
    const { desglose, enviados } = armar({ totalCentavos: 100, deActivoCentavos: 100 });
    const cambio = { antes: [linea(100, false)], despues: [linea(100, true)] };

    await desglose.alReaplicar(operador, pago('nota_ligada', 'nota-1'), { ...cambio, nota });
    await desglose.alReaplicar(operador, pago('cheque', 'm-9'), { ...cambio, nota: null });

    expect(enviados.map(({ origen }) => origen)).toEqual([null, { modulo: 'cuentas-por-pagar', documentoId: 'p1' }]);
    expect(enviados[1]!.conceptos).toEqual([{ claveDeSistema: 'pago_a_proveedor_de_activo', montoCentavos: 100 }]);
  });
});
