import { describe, expect, it } from 'vitest';
import type { CierreCalculado } from './cierre-del-mes.js';
import {
  hallazgoDeMesAnteriorSinCerrar,
  hallazgosDelCierre,
  type DatosParaHallazgos,
  type GrupoDeActivos,
} from './hallazgos-del-cierre.js';

const vacio: GrupoDeActivos = { cantidad: 0, codigos: [] };
const sinNada: DatosParaHallazgos = {
  lineasEnLaBandeja: 0,
  enConstruccionAntiguos: vacio,
  enUsoSinLocalidad: vacio,
  edificiosSinValores: vacio,
  conCostosDeDocumentosAnulados: vacio,
  conSaldoInicial: false,
  cargaInicialAbierta: false,
  mesesDeConstruccion: 12,
};
const calculado = (cambios: Partial<CierreCalculado> = {}): CierreCalculado => ({
  cuotas: [],
  excesos: [],
  ...cambios,
});
const codigos = (datos: DatosParaHallazgos, cierre = calculado()) =>
  hallazgosDelCierre(datos, cierre).map((hallazgo) => `${hallazgo.nivel}:${hallazgo.codigo}`);

describe('hallazgos del cierre', () => {
  it('sin nada que decir no hay hallazgos', () => {
    expect(hallazgosDelCierre(sinNada, calculado())).toEqual([]);
  });

  it('los bloqueos salen primero y los avisos después, cada uno con su cantidad y códigos', () => {
    const datos: DatosParaHallazgos = {
      ...sinNada,
      lineasEnLaBandeja: 3,
      enConstruccionAntiguos: { cantidad: 1, codigos: ['AF-0007'] },
      enUsoSinLocalidad: { cantidad: 2, codigos: ['AF-0001', 'AF-0002'] },
      edificiosSinValores: { cantidad: 1, codigos: ['AF-0003'] },
      conCostosDeDocumentosAnulados: { cantidad: 1, codigos: ['AF-0004'] },
    };

    expect(codigos(datos)).toEqual([
      'bloquea:costos_de_documentos_anulados',
      'aviso:lineas_por_capitalizar',
      'aviso:construccion_antigua',
      'aviso:activos_sin_localidad',
      'aviso:edificios_sin_valores',
    ]);
    const obra = hallazgosDelCierre(datos, calculado()).find((h) => h.codigo === 'construccion_antigua')!;
    expect(obra).toMatchObject({ cantidad: 1, detalle: ['AF-0007'] });
    expect(obra.mensaje).toContain('más de 12 meses');
  });

  it('la carga inicial abierta bloquea solo si hay activos de saldo inicial', () => {
    expect(codigos({ ...sinNada, cargaInicialAbierta: true })).toEqual([]);
    expect(codigos({ ...sinNada, cargaInicialAbierta: true, conSaldoInicial: true })).toEqual([
      'bloquea:carga_inicial_abierta',
    ]);
    expect(codigos({ ...sinNada, cargaInicialAbierta: false, conSaldoInicial: true })).toEqual([]);
  });

  it('los excesos de nota de crédito salen con el libro y el monto de cada uno', () => {
    const cierre = calculado({
      excesos: [
        { activoId: 'a', codigo: 'AF-0001', libro: 'contable', montoCentavos: 15000 },
        { activoId: 'a', codigo: 'AF-0001', libro: 'fiscal', montoCentavos: 20050 },
      ],
    });

    const [aviso] = hallazgosDelCierre(sinNada, cierre);

    expect(aviso).toMatchObject({
      nivel: 'aviso',
      codigo: 'exceso_de_nota_de_credito',
      cantidad: 2,
      detalle: ['AF-0001 contable: Q150.00', 'AF-0001 fiscal: Q200.50'],
    });
  });

  it('el ocioso con cuota fiscal sale con el total del mes y su riesgo de deducibilidad', () => {
    const cuota = (libro: 'contable' | 'fiscal', monto: number) => ({
      activoId: 'a',
      codigo: 'AF-0009',
      claseId: 'c',
      incisoFiscal: 'maquinaria_y_vehiculos' as const,
      libro,
      tramoId: 't',
      montoCentavos: monto,
      acumuladaCentavos: monto,
      localidadId: null,
      departamentoId: null,
      ocioso: true,
    });
    const cierre = calculado({ cuotas: [cuota('contable', 375000), cuota('fiscal', 416667)] });

    const [aviso] = hallazgosDelCierre(sinNada, cierre);

    expect(aviso).toMatchObject({ codigo: 'ociosos_con_cuota_fiscal', cantidad: 1, detalle: ['AF-0009'] });
    expect(aviso!.mensaje).toContain('Q4166.67');
    expect(aviso!.mensaje).toContain('art. 25');
  });

  it('pedir un mes que no es el siguiente da un bloqueo que dice cuál cerrar primero', () => {
    expect(hallazgoDeMesAnteriorSinCerrar('2027-04-01')).toMatchObject({
      nivel: 'bloquea',
      codigo: 'mes_anterior_sin_cerrar',
    });
    expect(hallazgoDeMesAnteriorSinCerrar('2027-04-01').mensaje).toContain('2027-04');
  });
});
