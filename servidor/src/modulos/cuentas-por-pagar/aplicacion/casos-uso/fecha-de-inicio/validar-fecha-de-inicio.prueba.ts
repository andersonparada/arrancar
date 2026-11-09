import { describe, expect, it } from 'vitest';
import { UnidadDeTrabajoEnMemoria, operadorDePrueba } from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { SaldosInicialesPosterioresALaFecha } from '../../../dominio/errores-de-saldos-iniciales.js';
import { ValidarFechaDeInicio } from './validar-fecha-de-inicio.js';

/** Saldos iniciales con estas fechas de emisión. */
const validadorCon = (emisiones: string[]) =>
  new ValidarFechaDeInicio({
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    saldosIniciales: { contarEmitidosDesde: async (fecha) => emisiones.filter((e) => e >= fecha).length },
  });

const operador = operadorDePrueba();
const aviso = (fechaDeInicio: string) => ({ empresaId: operador.empresaId, fechaDeInicio });

describe('validar la fecha de inicio nueva', () => {
  it('pasa si no hay saldos iniciales', async () => {
    await expect(validadorCon([]).ejecutar(operador, aviso('2026-01-01'))).resolves.toBeUndefined();
  });

  it('pasa si todos se emitieron antes de la fecha nueva', async () => {
    await expect(validadorCon(['2025-12-31']).ejecutar(operador, aviso('2026-01-01'))).resolves.toBeUndefined();
  });

  it('rechaza con la cantidad si alguno se emitió el mismo día de la fecha nueva o después', async () => {
    const validador = validadorCon(['2025-12-31', '2026-01-01', '2026-02-10']);

    const intento = validador.ejecutar(operador, aviso('2026-01-01'));

    await expect(intento).rejects.toThrow(SaldosInicialesPosterioresALaFecha);
    await expect(intento).rejects.toMatchObject({ codigo: 'saldos_iniciales_posteriores_a_la_fecha' });
    await expect(intento).rejects.toThrow('Hay 2 saldos iniciales');
  });
});
