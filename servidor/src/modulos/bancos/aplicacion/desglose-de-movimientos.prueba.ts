import type { LineaDeConcepto } from '../../core/contratos/bancos.contratos.js';
import { beforeEach, describe, expect, it } from 'vitest';
import { operadorDePrueba } from '../../core/compartido/pruebas/dobles-compartidos.js';
import { ConceptoDeDesgloseIncompatible, DesgloseNoSuma, DesgloseSinLineas } from '../dominio/errores-de-origen.js';
import { conceptosDeMovimientosDe, conceptosSembrados, idDeSistema } from '../pruebas/conceptos-de-prueba.js';
import { DesglosesEnMemoria } from '../pruebas/dobles-de-origen.js';
import { DesgloseDeMovimientos } from './desglose-de-movimientos.js';

const operador = operadorDePrueba();
const PAGO = idDeSistema('pago_a_proveedor');
const ACTIVO = idDeSistema('pago_a_proveedor_de_activo');
let repositorio: DesglosesEnMemoria;
let desglose: DesgloseDeMovimientos;

const pago = (montoCentavos: number) => ({ claveDeSistema: 'pago_a_proveedor' as const, montoCentavos });
const activo = (montoCentavos: number) => ({ claveDeSistema: 'pago_a_proveedor_de_activo' as const, montoCentavos });

beforeEach(() => {
  repositorio = new DesglosesEnMemoria();
  desglose = new DesgloseDeMovimientos({ conceptos: conceptosDeMovimientosDe(conceptosSembrados()), repositorio });
});

describe('DesgloseDeMovimientos.resolver', () => {
  it('traduce las claves a conceptos y deja como principal el de mayor monto', async () => {
    const reparto = await desglose.resolver(operador, {
      tipo: 'debito',
      monto: '100.00',
      lineas: [pago(3000), activo(7000)],
    });

    expect(reparto.principalId).toBe(ACTIVO);
    expect(reparto.lineas).toEqual([
      { conceptoId: PAGO, montoCentavos: 3000 },
      { conceptoId: ACTIVO, montoCentavos: 7000 },
    ]);
  });

  it('junta las líneas de una misma clave', async () => {
    const reparto = await desglose.resolver(operador, {
      tipo: 'cheque',
      monto: '100.00',
      lineas: [pago(4000), pago(6000)],
    });

    expect(reparto.lineas).toEqual([{ conceptoId: PAGO, montoCentavos: 10000 }]);
  });

  it('rechaza lo que no suma, lo vacío, los montos que no son centavos enteros positivos y las claves de otro tipo', async () => {
    const pedir = (lineas: Parameters<typeof desglose.resolver>[1]['lineas'], tipo: 'debito' | 'credito' = 'debito') =>
      desglose.resolver(operador, { tipo, monto: '100.00', lineas });

    await expect(pedir([pago(9999)])).rejects.toThrow(DesgloseNoSuma);
    await expect(pedir([])).rejects.toThrow(DesgloseSinLineas);
    await expect(pedir([pago(10050), pago(-50)])).rejects.toThrow(DesgloseSinLineas);
    await expect(pedir([pago(100.5), pago(9899.5)])).rejects.toThrow(DesgloseSinLineas);
    await expect(pedir([pago(10000)], 'credito')).rejects.toThrow(ConceptoDeDesgloseIncompatible);
    await expect(pedir([{ claveDeSistema: 'reintegro_de_proveedor', montoCentavos: 10000 }], 'debito')).rejects.toThrow(
      ConceptoDeDesgloseIncompatible,
    );
  });
});

describe('DesgloseDeMovimientos.guardar', () => {
  const guardar = async (lineas: LineaDeConcepto[], conceptoDelMovimientoId: string) => {
    const reparto = await desglose.resolver(operador, { tipo: 'debito', monto: '100.00', lineas });
    return desglose.guardar(operador, { movimientoId: 'mov-1', conceptoDelMovimientoId, reparto });
  };

  it('guarda las líneas cuando son varias o cuando el único concepto no es el del movimiento', async () => {
    expect(await guardar([pago(4000), activo(6000)], ACTIVO)).toBe(true);
    expect(repositorio.porMovimiento.get('mov-1')).toEqual([
      { conceptoId: PAGO, monto: '40.00' },
      { conceptoId: ACTIVO, monto: '60.00' },
    ]);

    expect(await guardar([activo(10000)], PAGO)).toBe(true);
    expect(repositorio.porMovimiento.get('mov-1')).toEqual([{ conceptoId: ACTIVO, monto: '100.00' }]);
  });

  it('no guarda nada y quita el reparto anterior cuando todo va al concepto del movimiento', async () => {
    await guardar([pago(4000), activo(6000)], ACTIVO);

    expect(await guardar([pago(10000)], PAGO)).toBe(false);
    expect(repositorio.porMovimiento.has('mov-1')).toBe(false);
  });

  it('quitar deja al movimiento sin reparto', async () => {
    await guardar([pago(4000), activo(6000)], ACTIVO);

    await desglose.quitar(operador, 'mov-1');

    expect(repositorio.porMovimiento.has('mov-1')).toBe(false);
  });
});
