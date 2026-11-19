import { describe, expect, it } from 'vitest';
import { UnidadDeTrabajoEnMemoria, operadorDePrueba } from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { ResponderRevisionDeCierreDeCarga } from './responder-revision-de-cierre-de-carga.js';

const operador = operadorDePrueba();

const armar = (cuentasPorPagarActivo: boolean, posfechados = { cantidad: 3, totalCentavos: 120000 }) => {
  const consultadas: string[] = [];
  const caso = new ResponderRevisionDeCierreDeCarga({
    saldos: {
      ejecutar: async () => ({
        fechaDeInicio: '2026-01-01',
        fechaDeCorte: '2025-12-31',
        cargaCerrada: false,
        cuentas: [],
        totalBancos: '0.00',
        totalSobregiros: '0.00',
        hallazgos: [],
      }),
    },
    consultas: {
      posfechadosSinLigar: async () => {
        consultadas.push('posfechados');
        return posfechados;
      },
    },
    modulosDeOrigen: {
      estaActivo: async (_operador, modulo) => cuentasPorPagarActivo && modulo === 'cuentas-por-pagar',
    },
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
  });
  return { caso, consultadas };
};

describe('revisión de cierre de Bancos con posfechados de apertura', () => {
  it('con Cuentas por pagar activo agrega el hallazgo con la cantidad y el total', async () => {
    const revision = await armar(true).caso.ejecutar(operador);

    expect(revision?.hallazgos.map((h) => h.codigo)).toEqual(['posfechados_sin_ligar']);
    expect(revision?.hallazgos[0]?.mensaje).toContain('Hay 3 cheques posfechados de apertura sin ligar (Q 1,200.00)');
  });

  it('con Cuentas por pagar apagado ni siquiera los consulta', async () => {
    const { caso, consultadas } = armar(false);

    expect(await caso.ejecutar(operador)).toBeNull();
    expect(consultadas).toEqual([]);
  });

  it('activo pero sin posfechados sin ligar no tiene nada que decir', async () => {
    expect(await armar(true, { cantidad: 0, totalCentavos: 0 }).caso.ejecutar(operador)).toBeNull();
  });
});
