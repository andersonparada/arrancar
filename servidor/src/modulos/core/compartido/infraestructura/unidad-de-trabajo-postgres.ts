import { AsyncLocalStorage } from 'node:async_hooks';
import type { BaseDatos, Transaccion } from '../../base-datos/conexion.js';
import type { ContextoEmpresa } from '../aplicacion/contexto-empresa.js';
import type { UnidadDeTrabajo } from '../aplicacion/unidad-de-trabajo.js';
import { fijarVariablesDeSeguridad } from './variables-de-seguridad.js';

type Tarea = () => Promise<void>;

/** Una tarea pendiente y cómo nombrarla en el registro si falla (nunca contenido, solo una ruta relativa o similar). */
interface TareaPendiente {
  ejecutar: Tarea;
  descripcion: string;
}

/** Cómo se informa que una tarea de la transacción falló; recibe el momento, la descripción y el error. */
export type RegistroDeFallos = (momento: 'al_confirmar' | 'al_deshacer', descripcion: string, error: unknown) => void;

const registroPorOmision: RegistroDeFallos = (momento, descripcion, error) => {
  const detalle = error instanceof Error ? error.message : String(error);
  process.stderr.write(
    `${JSON.stringify({ nivel: 'error', msg: 'Falló una tarea de la transacción', momento, descripcion, detalle })}\n`,
  );
};

interface TrabajoEnCurso {
  transaccion: Transaccion;
  contexto: ContextoEmpresa;
  /** Lo que espera a que la transacción más externa se confirme. */
  alConfirmar: TareaPendiente[];
  /** Lo que espera a que la transacción más externa se deshaga. */
  alDeshacer: TareaPendiente[];
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
  constructor(
    private readonly baseDatos: BaseDatos,
    private readonly registro: RegistroDeFallos = registroPorOmision,
  ) {}

  async ejecutar<Resultado>(contexto: ContextoEmpresa, trabajo: () => Promise<Resultado>): Promise<Resultado> {
    const enCurso = trabajoEnCurso.getStore();
    if (enCurso) return this.unirseAl(enCurso, contexto, trabajo);

    const trabajoNuevo = { contexto, alConfirmar: [] as TareaPendiente[], alDeshacer: [] as TareaPendiente[] };
    const resultado = await this.ejecutarEnTransaccion(trabajoNuevo, trabajo);
    await this.correr(trabajoNuevo.alConfirmar, 'al_confirmar');
    return resultado;
  }

  async aislar<Resultado>(trabajo: () => Promise<Resultado>): Promise<Resultado> {
    const enCurso = trabajoEnCurso.getStore();
    if (!enCurso) return trabajo();
    return enCurso.transaccion.transaction((punto) => trabajoEnCurso.run({ ...enCurso, transaccion: punto }, trabajo));
  }

  private async ejecutarEnTransaccion<Resultado>(
    nuevo: Omit<TrabajoEnCurso, 'transaccion'>,
    trabajo: () => Promise<Resultado>,
  ): Promise<Resultado> {
    try {
      return await this.baseDatos.transaction(async (transaccion) => {
        await fijarVariablesDeSeguridad(transaccion, nuevo.contexto);
        return trabajoEnCurso.run({ ...nuevo, transaccion }, trabajo);
      });
    } catch (error) {
      await this.correr(nuevo.alDeshacer, 'al_deshacer');
      throw error;
    }
  }

  /** Corre todas las tareas; las que fallan se registran y no cambian la respuesta (la transacción ya terminó). */
  private async correr(tareas: TareaPendiente[], momento: 'al_confirmar' | 'al_deshacer'): Promise<void> {
    for (const { ejecutar, descripcion } of tareas) {
      await ejecutar().catch((error: unknown) => this.registro(momento, descripcion, error));
    }
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
 * Deja una tarea para después de que se confirme la transacción más externa (si esa se deshace, la tarea se descarta). Una tarea que falla se registra y no cambia la respuesta.
 * Devuelve `false` si no hay ninguna unidad de trabajo en curso: quien llama debe hacer la tarea de inmediato.
 */
export function despuesDeConfirmar(tarea: Tarea, descripcion = 'tarea'): boolean {
  const enCurso = trabajoEnCurso.getStore();
  if (!enCurso) return false;
  enCurso.alConfirmar.push({ ejecutar: tarea, descripcion });
  return true;
}

/**
 * Deja una tarea para si se deshace la transacción más externa (si se confirma, se descarta). Sin unidad de trabajo
 * en curso devuelve `false` y no hace nada: no hay nada que deshacer. Una tarea que falla se registra y no tapa el error original.
 */
export function siSeDeshace(tarea: Tarea, descripcion = 'tarea'): boolean {
  const enCurso = trabajoEnCurso.getStore();
  if (!enCurso) return false;
  enCurso.alDeshacer.push({ ejecutar: tarea, descripcion });
  return true;
}

/** Si hay una unidad de trabajo en curso (para exigir que ciertas operaciones largas corran fuera de ella). */
export function hayUnidadDeTrabajoEnCurso(): boolean {
  return trabajoEnCurso.getStore() !== undefined;
}
