import { createHash } from 'node:crypto';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import {
  MAXIMO_DE_CIFRAS_POR_MODULO,
  type RevisionDeCierreDeModulo,
} from '../../../../core/contratos/empresas.contratos.js';
import { hallazgosDeLaEmpresa } from '../../../dominio/hallazgos-de-la-empresa.js';
import type { CargaInicialDto, RevisionDeCierreDto } from '../../dto/datos-de-empresa.dto.js';
import type { PreguntasDeCierre } from '../../puertos/preguntas-de-cierre.js';

/** JSON con las llaves ordenadas, para que la misma revisión dé siempre la misma huella. */
function jsonCanonico(valor: unknown): string {
  if (Array.isArray(valor)) return `[${valor.map(jsonCanonico).join(',')}]`;
  if (valor !== null && typeof valor === 'object') {
    const llaves = Object.keys(valor).sort();
    const partes = llaves.map(
      (llave) => `${JSON.stringify(llave)}:${jsonCanonico((valor as Record<string, unknown>)[llave])}`,
    );
    return `{${partes.join(',')}}`;
  }
  return JSON.stringify(valor);
}

/** sha256 de lo revisado: hallazgos y cifras de cada módulo, tal como lo vio quien va a cerrar. */
export function huellaDeLaRevision(modulos: readonly RevisionDeCierreDeModulo[]): string {
  return createHash('sha256').update(jsonCanonico(modulos)).digest('hex');
}

function exigirTopeDeCifras(modulo: RevisionDeCierreDeModulo): void {
  if (modulo.cifras.length > MAXIMO_DE_CIFRAS_POR_MODULO) {
    throw new Error(
      `El módulo "${modulo.nombreDelModulo}" dio ${modulo.cifras.length} cifras: el máximo es ${MAXIMO_DE_CIFRAS_POR_MODULO}.`,
    );
  }
}

function contar(modulos: readonly RevisionDeCierreDeModulo[], nivel: 'pide_motivo' | 'aviso'): number {
  return modulos.flatMap((modulo) => modulo.hallazgos).filter((hallazgo) => hallazgo.nivel === nivel).length;
}

/**
 * Arma la revisión de una carga inicial: lo propio de la empresa más lo que respondan los módulos activos.
 * Corre dentro de la transacción de quien revisa o cierra.
 */
export class ArmadorDeLaRevision {
  constructor(private readonly preguntas: PreguntasDeCierre) {}

  /** @throws Error (de programación) si un módulo da más de 200 cifras. */
  async armar(operador: Operador, carga: CargaInicialDto & { fechaDeInicio: string }): Promise<RevisionDeCierreDto> {
    const { empresaId, fechaDeInicio } = carga;
    const deLosModulos = await this.preguntas.revisar({ ...operador, empresaId }, { empresaId, fechaDeInicio });
    deLosModulos.forEach(exigirTopeDeCifras);
    const propia: RevisionDeCierreDeModulo = {
      nombreDelModulo: 'Empresa',
      resumen: null,
      ruta: null,
      hallazgos: hallazgosDeLaEmpresa({ fechaDeInicio, tieneBalanceDeApertura: carga.balanceDeApertura !== null }),
      cifras: [],
    };
    const modulos = [propia, ...deLosModulos];
    const diferencias = contar(modulos, 'pide_motivo');
    return {
      carga,
      modulos,
      diferencias,
      avisos: contar(modulos, 'aviso'),
      pideMotivo: diferencias > 0,
      huella: huellaDeLaRevision(modulos),
    };
  }
}
