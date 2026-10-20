import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { ErrorEsperado } from '../../../../core/compartido/dominio/errores.js';
import { ConstanciasEnLoteInvalidas } from '../../../dominio/retenciones/errores-de-retenciones.js';
import type { RetencionDelReporte } from '../../../dominio/retenciones/retencion-del-reporte.js';
import {
  avisosDeNumerosRepetidos,
  guardarConstancia,
  prepararConstancia,
  type ConstanciaPreparada,
  type DependenciasDeConstancias,
  type PeticionDeConstancia,
} from './anotador-de-constancias.js';

interface Dependencias extends DependenciasDeConstancias {
  unidadDeTrabajo: UnidadDeTrabajo;
}

type ProblemaDeFila = { indice: number; campo: string; mensaje: string };

export interface ResultadoDelLote {
  cantidad: number;
  avisos: string[];
}

function problemaDe(indice: number, error: unknown): ProblemaDeFila {
  if (!(error instanceof ErrorEsperado)) throw error;
  const campo = (error.detalles as { campo?: string } | undefined)?.campo ?? 'retencionId';
  return { indice, campo, mensaje: error.message };
}

/** Revisa una fila contra su retención; devuelve la constancia preparada o el problema de la fila. */
function revisarFila(
  fila: { peticion: PeticionDeConstancia; indice: number },
  retencion: RetencionDelReporte | undefined,
): ConstanciaPreparada | ProblemaDeFila {
  if (!retencion) return { indice: fila.indice, campo: 'retencionId', mensaje: 'La retención no existe.' };
  try {
    return prepararConstancia(retencion, fila.peticion);
  } catch (error) {
    return problemaDe(fila.indice, error);
  }
}

/** Revisa cada fila contra su retención; todas las que fallan se juntan para informarlas a la vez. */
function revisarFilas(
  peticiones: readonly PeticionDeConstancia[],
  retenciones: ReadonlyMap<string, RetencionDelReporte>,
): { preparadas: ConstanciaPreparada[]; problemas: ProblemaDeFila[] } {
  const preparadas: ConstanciaPreparada[] = [];
  const problemas: ProblemaDeFila[] = [];
  const vistas = new Set<string>();
  peticiones.forEach((peticion, indice) => {
    const repetida = vistas.has(peticion.retencionId);
    vistas.add(peticion.retencionId);
    const resultado = repetida
      ? { indice, campo: 'retencionId', mensaje: 'La retención viene repetida.' }
      : revisarFila({ peticion, indice }, retenciones.get(peticion.retencionId));
    if ('indice' in resultado) problemas.push(resultado);
    else preparadas.push(resultado);
  });
  return { preparadas, problemas };
}

/**
 * Anota varias constancias a la vez, todo o nada: si una fila falla, ninguna se guarda y el error dice cuál fila
 * (`detalles.filas[i].indice`) y en qué campo. La ruta limita el lote a 200.
 */
export class AnotarConstanciasEnLote {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws ConstanciasEnLoteInvalidas con las filas que fallaron. */
  ejecutar(operador: Operador, constancias: readonly PeticionDeConstancia[]): Promise<ResultadoDelLote> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const encontradas = await consultas.buscarVarias(constancias.map((c) => c.retencionId));
      const { preparadas, problemas } = revisarFilas(constancias, new Map(encontradas.map((r) => [r.id, r])));
      if (problemas.length > 0) throw new ConstanciasEnLoteInvalidas(problemas);
      const avisos = await avisosDeNumerosRepetidos(consultas, preparadas);
      for (const preparada of preparadas) await guardarConstancia(this.dependencias, preparada);
      return { cantidad: preparadas.length, avisos };
    });
  }
}
