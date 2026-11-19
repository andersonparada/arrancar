import { describe, expect, it, vi } from 'vitest';
import {
  AuditoriaEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import type { AjustesDelAviso } from '../../puertos/puertos-de-avisos-de-pago.js';
import { GuardarAjustesDelAviso } from './guardar-ajustes-del-aviso.js';

const ANTES: AjustesDelAviso = {
  envio: 'manual',
  asunto: 'Pago {numero}',
  mensaje: 'Gracias.',
  adjuntarComprobante: true,
  copiaALaEmpresa: true,
};

function armar() {
  const auditoria = new AuditoriaEnMemoria();
  const guardar = vi.fn(async () => {});
  const caso = new GuardarAjustesDelAviso({
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    auditoria,
    configuracion: { de: async () => ANTES },
    guardador: { guardar },
  });
  return { auditoria, guardar, caso };
}

describe('GuardarAjustesDelAviso', () => {
  it('guarda y audita los valores de antes y de después', async () => {
    const { auditoria, guardar, caso } = armar();
    const despues = { ...ANTES, envio: 'automatico' as const, mensaje: 'Otro texto.' };

    await caso.ejecutar(operadorDePrueba(), despues);

    expect(guardar).toHaveBeenCalledOnce();
    expect(auditoria.entradas).toMatchObject([
      { recurso: 'cuentas-por-pagar.avisos-de-pago', accion: 'configurar', anterior: { antes: ANTES, despues } },
    ]);
  });

  it('si no cambia nada no audita', async () => {
    const { auditoria, caso } = armar();

    await caso.ejecutar(operadorDePrueba(), { ...ANTES });

    expect(auditoria.entradas).toEqual([]);
  });
});
