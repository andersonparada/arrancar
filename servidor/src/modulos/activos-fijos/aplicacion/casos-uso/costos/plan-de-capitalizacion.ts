import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { Activo } from '../../../dominio/activo.js';
import { AltaConjuntaSinActivosVigentes } from '../../../dominio/errores-de-costo.js';
import type { IncisoFiscal } from '../../../dominio/incisos-fiscales.js';
import type { LineaCapitalizable } from '../../../dominio/linea-capitalizable.js';
import { repartirEnPartes } from '../../../dominio/reparto-de-costos.js';
import type { AsignacionDeLinea } from '../../dto/capitalizacion.dto.js';
import { codigosDeLasUnidades } from './codigos-de-unidades.js';
import type { DependenciasDeCostos } from './dependencias-de-costos.js';
import { crearUnidades } from './unidades-de-asignacion.js';

/** Lo que le toca a un activo de una asignación: su parte del monto de la línea. */
export interface ParteDeCosto {
  activo: Activo;
  linea: LineaCapitalizable;
  asignacion: AsignacionDeLinea;
  montoCentavos: number;
}

/** Todo lo que una capitalización va a guardar, ya revisado campo por campo y sin tocar la base todavía. */
export class PlanDeCapitalizacion {
  readonly partes: ParteDeCosto[] = [];
  readonly nuevos: Activo[] = [];
  /** Los activos que ya existían, bloqueados, por id. */
  readonly existentes = new Map<string, Activo>();
  readonly altasConjuntas: string[] = [];
  private readonly incisos = new Map<string, IncisoFiscal>();

  constructor(private readonly dependencias: DependenciasDeCostos) {}

  recordarInciso(claseId: string, inciso: IncisoFiscal): void {
    this.incisos.set(claseId, inciso);
  }

  /** El inciso fiscal de la clase (lo que decide si «no es edificación» aplica y se manda en los eventos). */
  async incisoDe(claseId: string): Promise<IncisoFiscal> {
    const guardado = this.incisos.get(claseId);
    if (guardado) return guardado;
    const clase = await this.dependencias.clases.buscar(Identificador.desde(claseId));
    if (!clase) throw new RecursoNoEncontrado('La clase de activo');
    const inciso = clase.instantanea().incisoFiscal;
    this.incisos.set(claseId, inciso);
    return inciso;
  }
}

interface EntradaDeDestinos {
  asignacion: AsignacionDeLinea;
  indice: number;
  linea: LineaCapitalizable;
}

/** Con qué trabaja el planificador: las dependencias, quien opera y el plan que va llenando. */
interface ContextoDelPlan {
  dependencias: DependenciasDeCostos;
  operador: Operador;
  plan: PlanDeCapitalizacion;
}

class Planificador {
  private readonly dependencias: DependenciasDeCostos;
  private readonly operador: Operador;
  private readonly plan: PlanDeCapitalizacion;

  constructor(
    contexto: ContextoDelPlan,
    private readonly codigos: ReadonlyMap<string, string>,
    private readonly bloqueados: ReadonlyMap<string, Activo>,
  ) {
    ({ dependencias: this.dependencias, operador: this.operador, plan: this.plan } = contexto);
  }

  /** Los activos que reciben esta asignación: uno existente, los N nuevos o los vigentes de una compra conjunta. */
  async destinos({ asignacion, indice, linea }: EntradaDeDestinos): Promise<Activo[]> {
    if (asignacion.activoNuevo) return this.nuevos(asignacion.activoNuevo, { indice, linea });
    if (asignacion.altaConjuntaId) return this.deAltaConjunta(asignacion.altaConjuntaId);
    const activo = this.bloqueados.get(asignacion.activoId ?? '');
    if (!activo) throw new RecursoNoEncontrado('El activo');
    this.plan.existentes.set(activo.id.valor, activo);
    return [activo];
  }

  private async nuevos(
    solicitud: NonNullable<AsignacionDeLinea['activoNuevo']>,
    { indice, linea }: Omit<EntradaDeDestinos, 'asignacion'>,
  ): Promise<Activo[]> {
    const creadas = await crearUnidades(this.dependencias, this.operador, {
      indice,
      solicitud,
      linea,
      codigos: this.codigos,
    });
    this.plan.nuevos.push(...creadas.activos);
    this.plan.recordarInciso(solicitud.claseId, creadas.incisoFiscal);
    if (creadas.altaConjuntaId) this.plan.altasConjuntas.push(creadas.altaConjuntaId);
    return creadas.activos;
  }

  private async deAltaConjunta(altaConjuntaId: string): Promise<Activo[]> {
    const vigentes = await this.dependencias.repositorio.vigentesDeAltaConjunta(altaConjuntaId);
    if (vigentes.length === 0) throw new AltaConjuntaSinActivosVigentes();
    for (const activo of vigentes) this.plan.existentes.set(activo.id.valor, activo);
    return vigentes;
  }
}

/**
 * Arma el plan: crea en memoria los activos nuevos, resuelve a qué activos va cada asignación (con los existentes ya
 * bloqueados) y reparte el monto entre ellos, con el sobrante en el último (identificación específica, AFI).
 * @throws CodigosDeUnidadesRepetidos antes de crear nada si la cuadrícula trae códigos malos.
 */
export async function armarPlan(
  dependencias: DependenciasDeCostos,
  operador: Operador,
  entrada: { asignaciones: readonly AsignacionDeLinea[]; lineas: ReadonlyMap<string, LineaCapitalizable> },
): Promise<PlanDeCapitalizacion> {
  const { asignaciones, lineas } = entrada;
  const codigos = await codigosDeLasUnidades(dependencias, operador, asignaciones);
  const ids = asignaciones.flatMap(({ activoId }) => (activoId ? [activoId] : []));
  const bloqueados = new Map((await dependencias.repositorio.buscarBloqueando(ids)).map((a) => [a.id.valor, a]));
  const plan = new PlanDeCapitalizacion(dependencias);
  const planificador = new Planificador({ dependencias, operador, plan }, codigos, bloqueados);
  for (const [indice, asignacion] of asignaciones.entries()) {
    const linea = lineas.get(asignacion.lineaId)!;
    const destinos = await planificador.destinos({ asignacion, indice, linea });
    repartirEnPartes(asignacion.montoCentavos, destinos.length).forEach((montoCentavos, posicion) =>
      plan.partes.push({ activo: destinos[posicion]!, linea, asignacion, montoCentavos }),
    );
  }
  return plan;
}
