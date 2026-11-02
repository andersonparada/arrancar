import { describe, expect, it } from 'vitest';
import {
  AuditoriaEnMemoria,
  RelojFijo,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { ConstanciasEnLoteInvalidas, FechaDePagoFutura } from '../../../dominio/retenciones/errores-de-retenciones.js';
import type { EnteroGuardado, RetencionDelReporte } from '../../../dominio/retenciones/retencion-del-reporte.js';
import { ConsultasDeEnterosEnMemoria } from '../../../pruebas/dobles-de-retenciones.js';
import type { ConsultasDeRetenciones, RepositorioDeEnteros } from '../../puertos/puertos-de-retenciones.js';
import { AnotarConstanciasEnLote } from './anotar-constancias-en-lote.js';
import { CorregirEntero, RegistrarEntero } from './registrar-entero.js';

const HOY = '2026-10-20';
const operador = operadorDePrueba();

function retencion(id: string): RetencionDelReporte {
  return {
    id,
    monto: 1000,
    fecha: '2026-10-01',
    constancia: null,
    proveedor: { id: 'p1', nit: null, nombre: 'Proveedor' },
  } as unknown as RetencionDelReporte;
}

function consultasDeRetenciones(retenciones: RetencionDelReporte[]): ConsultasDeRetenciones {
  return {
    buscarVarias: async () => retenciones,
    proveedoresConConstancia: async () => [],
  } as unknown as ConsultasDeRetenciones;
}

describe('constancias en lote con fechas futuras', () => {
  it('una fila de mañana falla con su campo y no guarda ninguna', async () => {
    const guardadas: string[] = [];
    const caso = new AnotarConstanciasEnLote({
      unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
      consultas: consultasDeRetenciones([retencion('a'), retencion('b')]),
      repositorio: { anotarConstancia: async (id: string) => void guardadas.push(id) } as never,
      auditoria: new AuditoriaEnMemoria(),
      reloj: new RelojFijo(HOY),
    });
    const lote = [
      { retencionId: 'a', numero: 'C1', fecha: HOY },
      { retencionId: 'b', numero: 'C2', fecha: '2026-10-21' },
    ];

    const error = await caso.ejecutar(operador, lote).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ConstanciasEnLoteInvalidas);
    expect(JSON.stringify((error as ConstanciasEnLoteInvalidas).detalles)).toContain('"campo":"fecha"');
    expect(guardadas).toEqual([]);
  });
});

function dependenciasDeEntero(pagos: ConsultasDeEnterosEnMemoria) {
  const creados: string[] = [];
  const consultas = Object.assign(pagos, {
    retenidoDelRango: async () => [{ mes: '2026-09-01', regla: 'iva_otro_agente', monto: 1000 }],
    buscar: async (id: string): Promise<EnteroGuardado | null> => pagos.pagos.find((p) => p.id === id) ?? null,
  });
  const repositorio = {
    crear: async () => {
      pagos.agregarVigente('2026-09-01', 'iva_agentes', 1000);
      creados.push('x');
      return pagos.pagos[pagos.pagos.length - 1]!.id;
    },
    corregir: async () => undefined,
  } as unknown as RepositorioDeEnteros;
  const dependencias = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    consultas: consultas as never,
    repositorio,
    auditoria: new AuditoriaEnMemoria(),
    reloj: new RelojFijo(HOY),
  };
  return { dependencias, creados };
}

const peticion = (fechaDePago: string) => ({
  mes: '2026-09',
  grupo: 'iva_agentes',
  fechaDePago,
  documentoDePago: 'F-1',
  impuesto: 1000,
});

describe('enteros con fechas futuras y avisos de fecha', () => {
  it('registrar con fecha de mañana falla y no crea el pago', async () => {
    const { dependencias, creados } = dependenciasDeEntero(new ConsultasDeEnterosEnMemoria());

    await expect(new RegistrarEntero(dependencias).ejecutar(operador, peticion('2026-10-21'))).rejects.toThrow(
      FechaDePagoFutura,
    );
    expect(creados).toEqual([]);
  });

  it('registrar con fecha de hoy pasa y sin aviso de fecha', async () => {
    const { dependencias } = dependenciasDeEntero(new ConsultasDeEnterosEnMemoria());

    const resultado = await new RegistrarEntero(dependencias).ejecutar(operador, peticion(HOY));

    expect(resultado.avisos).toEqual([]);
  });

  it('un pago del día 15 del mismo mes avisa del cierre', async () => {
    const { dependencias } = dependenciasDeEntero(new ConsultasDeEnterosEnMemoria());

    const resultado = await new RegistrarEntero(dependencias).ejecutar(operador, peticion('2026-09-15'));

    expect(resultado.avisos.join(' ')).toContain('anterior al cierre del mes de las retenciones (30/09/2026)');
  });

  it('corregir con fecha de mañana falla', async () => {
    const pagos = new ConsultasDeEnterosEnMemoria();
    const { dependencias } = dependenciasDeEntero(pagos);
    pagos.agregarVigente('2026-09-01', 'iva_agentes', 1000);
    const { mes: _mes, grupo: _grupo, ...cuerpo } = peticion('2026-10-21');

    await expect(new CorregirEntero(dependencias).ejecutar(operador, pagos.pagos[0]!.id, cuerpo)).rejects.toThrow(
      FechaDePagoFutura,
    );
  });
});
