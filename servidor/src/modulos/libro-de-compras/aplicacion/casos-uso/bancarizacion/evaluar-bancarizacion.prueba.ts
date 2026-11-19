import { describe, expect, it } from 'vitest';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { UnidadDeTrabajoEnMemoria } from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import type {
  EfectoFiscalDeBancarizacion,
  PagadoAlProveedorEnElMes,
} from '../../../../core/contratos/libro-de-compras.contratos.js';
import { EvaluarBancarizacion, type PedidoDeBancarizacion } from './evaluar-bancarizacion.js';

const operador = { cuentaId: 'c', empresaId: 'e', usuarioId: 'u' } as unknown as Operador;
const GENERAL: EfectoFiscalDeBancarizacion = { iva: true, isr: true };

function escenario(opciones: {
  pagado?: PagadoAlProveedorEnElMes[];
  efectos?: Map<string, EfectoFiscalDeBancarizacion>;
}) {
  const llamadas: string[] = [];
  const evaluar = new EvaluarBancarizacion({
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    bloqueo: { bloquear: async (proveedorId) => void llamadas.push(`bloqueo:${proveedorId}`) },
    umbral: { centavos: async () => 3_000_000 },
    pagado: {
      delMes: async (_operador, proveedorId, mes) => {
        llamadas.push(`pagado:${proveedorId}:${mes}`);
        return opciones.pagado ?? [];
      },
    },
    efectos: { de: async () => opciones.efectos ?? new Map() },
  });
  return { evaluar, llamadas };
}

const pedido = (cambios: Partial<PedidoDeBancarizacion> = {}): PedidoDeBancarizacion => ({
  proveedorId: 'p1',
  proveedorNombre: 'Alfa S.A.',
  fecha: '2026-11-10',
  montoEnEfectivoCentavos: 100_000,
  cargos: [{ documentoDeCompraId: 'd1', etiqueta: 'A-1', totalCentavos: 100_000 }],
  ...cambios,
});

const respuesta = (efectivoCentavos: number, bancarizadoCentavos = 0): PagadoAlProveedorEnElMes => ({
  efectivoCentavos,
  bancarizadoCentavos,
  comprobantes: [],
});

describe('EvaluarBancarizacion', () => {
  it('toma primero el bloqueo del proveedor y pregunta por el mes (primer día)', async () => {
    const { evaluar, llamadas } = escenario({});

    await evaluar.ejecutar(operador, pedido());

    expect(llamadas).toEqual(['bloqueo:p1', 'pagado:p1:2026-11-01']);
  });

  it('bajo el umbral queda libre', async () => {
    const { evaluar } = escenario({ efectos: new Map([['d1', GENERAL]]) });

    expect(await evaluar.ejecutar(operador, pedido())).toMatchObject({ resultado: 'libre', mensaje: null });
  });

  it('suma lo que responden todos los módulos, en efectivo y bancarizado, y bloquea si llega al umbral', async () => {
    const { evaluar } = escenario({
      pagado: [respuesta(2_000_000), respuesta(500_000, 400_000)],
      efectos: new Map([['d1', GENERAL]]),
    });

    const resultado = await evaluar.ejecutar(operador, pedido());

    expect(resultado.resultado).toBe('bloquear');
    expect(resultado.pagadoEnElMesCentavos).toBe(2_900_000);
    expect(resultado.mensaje).toContain('llega a Q30,000.00');
    expect(resultado.efecto).toEqual(GENERAL);
  });

  it('si la empresa no pierde nada según el régimen del documento, queda libre', async () => {
    const { evaluar } = escenario({
      pagado: [respuesta(3_000_000)],
      efectos: new Map([['d1', { iva: false, isr: false }]]),
    });

    expect((await evaluar.ejecutar(operador, pedido())).resultado).toBe('libre');
  });

  it('sin saber qué pierde (documento sin datos) solo avisa', async () => {
    const { evaluar } = escenario({ pagado: [respuesta(3_000_000)] });

    const resultado = await evaluar.ejecutar(operador, pedido());

    expect(resultado).toMatchObject({ resultado: 'avisar', efecto: null });
    expect(resultado.mensaje).toContain('datos fiscales');
  });

  it('un saldo inicial usa el efecto que trae quien llama', async () => {
    const { evaluar } = escenario({ pagado: [respuesta(3_000_000)] });
    const cargos = [
      {
        documentoDeCompraId: null,
        etiqueta: 'S-1',
        totalCentavos: 100_000,
        efectoDeSaldoInicial: { iva: false, isr: true },
      },
    ];

    const resultado = await evaluar.ejecutar(operador, pedido({ cargos }));

    expect(resultado.resultado).toBe('bloquear');
    expect(resultado.mensaje).toContain('no es deducible del ISR');
    expect(resultado.mensaje).not.toContain('crédito fiscal');
  });
});
