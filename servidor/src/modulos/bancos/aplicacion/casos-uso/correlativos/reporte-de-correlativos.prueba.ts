import { describe, expect, it } from 'vitest';
import { UnidadDeTrabajoEnMemoria, operadorDePrueba } from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { ConsultasDeCorrelativosFijas } from '../../../pruebas/dobles-de-correlativos.js';
import { CLAVE_DE_NOTAS_DE_CREDITO, CLAVE_DE_TRANSFERENCIAS } from '../../numeracion-de-comprobantes.js';
import type { ExplicacionPorNumero, RangoDeCorrelativo } from '../../puertos/consultas-de-correlativos.js';
import { ReporteDeCorrelativos } from './reporte-de-correlativos.js';

const operador = operadorDePrueba();

const baja = (numero: number, cambios: Partial<ExplicacionPorNumero> = {}): ExplicacionPorNumero => ({
  numero,
  accion: 'eliminar',
  usuarioId: 'u-1',
  usuarioNombre: 'Ana Pérez',
  fecha: '2026-02-01T10:00:00.000Z',
  motivo: 'Duplicada',
  ...cambios,
});

const rango = (cambios: Partial<RangoDeCorrelativo>): RangoDeCorrelativo => ({
  clave: CLAVE_DE_NOTAS_DE_CREDITO,
  anio: 0,
  ultimo: 5,
  emitidos: 5,
  huecos: [],
  ...cambios,
});

function armar(rangos: RangoDeCorrelativo[], auditoria: ExplicacionPorNumero[] = []) {
  const consultas = new ConsultasDeCorrelativosFijas(rangos, auditoria);
  const reporte = new ReporteDeCorrelativos({ unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(), consultas });
  return { consultas, reporte };
}

describe('reporte de correlativos', () => {
  it('sin huecos no consulta la auditoría', async () => {
    const { consultas, reporte } = armar([rango({})]);

    const { correlativos } = await reporte.ejecutar(operador);

    expect(correlativos).toEqual([
      { clave: CLAVE_DE_NOTAS_DE_CREDITO, nombre: 'Notas de crédito', anio: 0, ultimo: 5, emitidos: 5, huecos: [] },
    ]);
    expect(consultas.consultadas).toEqual([]);
  });

  it('un hueco con rastro en la auditoría queda explicado con quién, cuándo y por qué', async () => {
    const { reporte } = armar([rango({ huecos: [3], emitidos: 4 })], [baja(3)]);

    const { correlativos } = await reporte.ejecutar(operador);

    expect(correlativos[0]!.huecos).toEqual([
      {
        numero: 3,
        estado: 'explicado',
        explicaciones: [
          {
            accion: 'eliminar',
            usuarioId: 'u-1',
            usuarioNombre: 'Ana Pérez',
            fecha: '2026-02-01T10:00:00.000Z',
            motivo: 'Duplicada',
          },
        ],
      },
    ]);
  });

  it('un hueco sin rastro en la auditoría es una alerta', async () => {
    const { reporte } = armar([rango({ huecos: [2, 4], emitidos: 3 })], [baja(2)]);

    const { correlativos } = await reporte.ejecutar(operador);

    expect(correlativos[0]!.huecos.map(({ numero, estado }) => [numero, estado])).toEqual([
      [2, 'explicado'],
      [4, 'alerta'],
    ]);
  });

  it('con una clave solo trae ese correlativo', async () => {
    const { reporte } = armar([rango({}), rango({ clave: CLAVE_DE_TRANSFERENCIAS })]);

    const { correlativos } = await reporte.ejecutar(operador, { clave: CLAVE_DE_TRANSFERENCIAS });

    expect(correlativos.map((correlativo) => correlativo.nombre)).toEqual(['Transferencias']);
  });

  it('pide a la auditoría los huecos de cada clave y año', async () => {
    const { consultas, reporte } = armar([rango({ anio: 2027, huecos: [1] })]);

    await reporte.ejecutar(operador);

    expect(consultas.consultadas).toEqual([{ clave: CLAVE_DE_NOTAS_DE_CREDITO, anio: 2027, huecos: [1] }]);
  });
});
