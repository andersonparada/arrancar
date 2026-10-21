import { AsyncLocalStorage } from 'node:async_hooks';
import type { BaseDatos, Transaccion } from '../../base-datos/conexion.js';
import type { ContextoEmpresa } from '../aplicacion/contexto-empresa.js';
import type { UnidadDeTrabajo } from '../aplicacion/unidad-de-trabajo.js';
import { fijarVariablesDeSeguridad } from './variables-de-seguridad.js';

type Tarea = () => Promise<void>;

interface TrabajoEnCurso {
  transaccion: Transaccion;
  contexto: ContextoEmpresa;
  /** Lo que espera a que la transacción más externa se confirme. */
  alConfirmar: Tarea[];
}

const trabajoEnCurso = new AsyncLocalStorage<TrabajoEnCurso>();

/** Error de programación: se consultó la base de datos sin abrir antes una unidad de trabajo. */
export class ConsultaFueraDeUnidadDeTrabajo extends Error {
  constructor() {
    super('Consulta fuera de una unidad de trabajo: sin contexto, la seguridad por filas no sabe qué mostrar.');
  }
}

/** Error de programación: un caso de uso intentó trabajar con otro contexto dentro de la misma transacción. */
export class ContextoDistintoEnLaTransaccion extends Error {
  constructor() {
    super('Una unidad de trabajo anidada no puede cambiar de empresa, cuenta o usuario.');
  }
}

function mismoContexto(a: ContextoEmpresa, b: ContextoEmpresa): boolean {
  const lista = (recursos?: readonly string[]) => [...(recursos ?? [])].sort().join(',');
  return (
    a.empresaId === b.empresaId &&
    a.cuentaId === b.cuentaId &&
    a.usuarioId === b.usuarioId &&
    lista(a.recursosAlcanceTotal) === lista(b.recursosAlcanceTotal) &&
    lista(a.recursosParaAsignar) === lista(b.recursosParaAsignar) &&
    Boolean(a.sinAsignarAlCrear) === Boolean(b.sinAsignarAlCrear)
  );
}

/**
 * Transacción de PostgreSQL con las variables de seguridad del contexto. Los
 * repositorios la obtienen con `transaccionEnCurso()`, sin recibirla por parámetro.
 * Si ya hay una en curso con el mismo contexto, el trabajo se une a ella.
 */
export class UnidadDeTrabajoPostgres implements UnidadDeTrabajo {
  constructor(private readonly baseDatos: BaseDatos) {}

  async ejecutar<Resultado>(contexto: ContextoEmpresa, trabajo: () => Promise<Resultado>): Promise<Resultado> {
    const enCurso = trabajoEnCurso.getStore();
    if (enCurso) return this.unirseAl(enCurso, contexto, trabajo);

    const alConfirmar: Tarea[] = [];
    const resultado = await this.baseDatos.transaction(async (transaccion) => {
      await fijarVariablesDeSeguridad(transaccion, contexto);
      return trabajoEnCurso.run({ transaccion, contexto, alConfirmar }, trabajo);
    });
    for (const tarea of alConfirmar) await tarea();
    return resultado;
  }

  private unirseAl<Resultado>(
    enCurso: TrabajoEnCurso,
    contexto: ContextoEmpresa,
    trabajo: () => Promise<Resultado>,
  ): Promise<Resultado> {
    if (!mismoContexto(enCurso.contexto, contexto)) throw new ContextoDistintoEnLaTransaccion();
    return trabajo();
  }
}

/** La transacción de la unidad de trabajo actual; falla si no hay ninguna, para no consultar sin seguridad. */
export function transaccionEnCurso(): Transaccion {
  const enCurso = trabajoEnCurso.getStore();
  if (!enCurso) throw new ConsultaFueraDeUnidadDeTrabajo();
  return enCurso.transaccion;
}

/** El contexto (empresa, cuenta y usuario) de la unidad de trabajo actual; falla si no hay ninguna. */
export function contextoEnCurso(): ContextoEmpresa {
  const enCurso = trabajoEnCurso.getStore();
  if (!enCurso) throw new ConsultaFueraDeUnidadDeTrabajo();
  return enCurso.contexto;
}

/**
 * Deja una tarea para después de que se confirme la transacción más externa (si esa se deshace, la tarea se descarta).
 * Devuelve `false` si no hay ninguna unidad de trabajo en curso: quien llama debe hacer la tarea de inmediato.
 */
export function despuesDeConfirmar(tarea: Tarea): boolean {
  const enCurso = trabajoEnCurso.getStore();
  if (!enCurso) return false;
  enCurso.alConfirmar.push(tarea);
  return true;
}
