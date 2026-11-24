import { describe, expect, it } from 'vitest';
import { UnidadDeTrabajoEnMemoria, operadorDePrueba } from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { aCentesimasDeM2, centesimasATexto } from '../../../dominio/superficie.js';
import { ConfiguracionDeParcelasFija } from '../../../pruebas/dobles-de-parcelas.js';
import type { MedicionDto } from '../../dto/medicion.dto.js';
import type { ParcelaDto } from '../../dto/parcela.dto.js';
import type { DependenciasDeParcelas } from './dependencias-de-parcelas.js';
import { ListarParcelasParaExcel } from './listar-parcelas-para-excel.js';

const operador = operadorDePrueba();
const factores = { metrosPorVara: 0.835905, varasCuadradasPorManzana: 10000, varasCuadradasPorCaballeria: 645816 };
const enCuerdas = (cantidad: string) =>
  aCentesimasDeM2(cantidad, { unidad: 'cuerda', varasPorLadoDeCuerda: 25 }, factores);

function medicionDeCuerdas(total: string, util: string): MedicionDto {
  return {
    superficieTotalM2: centesimasATexto(enCuerdas(total)),
    superficieUtilM2: util,
    cantidadOriginal: total,
    unidadOriginal: 'cuerda',
    varasPorLadoDeCuerda: 25,
    fuente: 'escritura',
    vigenteDesde: '2026-01-01',
  } as MedicionDto;
}

function casoDeUso(medicion: MedicionDto) {
  const parcela = { id: 'p1' } as ParcelaDto;
  const dependencias = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    consultas: { listar: async () => [parcela] },
    consultasDeMediciones: { vigentesPorParcela: async () => new Map([['p1', medicion]]) },
    ligas: { nombresPorParcela: async () => new Map() },
    configuracion: new ConfiguracionDeParcelasFija(),
  } as unknown as DependenciasDeParcelas;
  return new ListarParcelasParaExcel(dependencias);
}

describe('ListarParcelasParaExcel', () => {
  it('exporta con cuatro decimales una útil que en pantalla se vería como 0.00 cuerdas', async () => {
    const filas = await casoDeUso(medicionDeCuerdas('10', '0.44')).ejecutar(operador);
    expect(filas[0]?.cantidadUtil).toBe('0.0010');
  });

  it('no falla con una útil minúscula: usa la cifra original', async () => {
    const filas = await casoDeUso(medicionDeCuerdas('10', '0.01')).ejecutar(operador);
    expect(filas[0]?.cantidadUtil).toBe('10');
  });

  it('repite la cifra original si la útil es igual a la total', async () => {
    const total = medicionDeCuerdas('10', '0');
    const filas = await casoDeUso({ ...total, superficieUtilM2: total.superficieTotalM2 }).ejecutar(operador);
    expect(filas[0]?.cantidadUtil).toBe('10');
  });
});
