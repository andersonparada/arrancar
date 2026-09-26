import { obtenerValorInstalacion } from '../configuracion/instalacion.js';
import { resolverValor, type OrigenValor, type ValoresPorNivel } from '../configuracion/resolucion.js';
import { ErrorNoEncontrado, ErrorReglaNegocio, ErrorSolicitudInvalida } from '../errores/errores.js';
import type { DefinicionConfiguracion, NivelConfiguracion } from '../modulos-sistema/definicion-modulo.js';
import { obtenerRegistroModulos } from '../modulos-sistema/registro-global.js';
import {
  configuracionesRepositorio,
  type DestinoConfiguracion,
  type NivelGuardado,
  type ValorGuardado,
} from '../repositorios/configuraciones.repositorio.js';

export interface VariableConfiguracion {
  clave: string;
  descripcion: string;
  niveles: NivelConfiguracion[];
  predeterminado: unknown;
  valores: ValoresPorNivel;
  efectivo: unknown;
  origen: OrigenValor;
}

/** Sin destino de cuenta: solo cuentan los valores de la instalación. */
export const DESTINO_INSTALACION: DestinoConfiguracion = { cuentaId: null, empresaId: null };

/**
 * Valores de una variable en cada nivel. En la instalación, lo guardado desde el
 * panel de soporte tiene prioridad sobre el archivo del servidor.
 */
function valoresDe(clave: string, guardados: ValorGuardado[]): ValoresPorNivel {
  const guardado = (nivel: NivelGuardado) => guardados.find((g) => g.nivel === nivel && g.clave === clave)?.valor;
  return {
    empresa: guardado('empresa'),
    cuenta: guardado('cuenta'),
    instalacion: guardado('instalacion') ?? obtenerValorInstalacion(clave),
  };
}

/** Definiciones de los módulos indicados, o de todos los instalados si se omiten. */
function definiciones(modulosActivos?: ReadonlySet<string>): DefinicionConfiguracion[] {
  return obtenerRegistroModulos().configuracionesDe(modulosActivos);
}

function definicionObligatoria(clave: string, modulosActivos?: ReadonlySet<string>): DefinicionConfiguracion {
  const definicion = definiciones(modulosActivos).find((c) => c.clave === clave);
  if (!definicion) throw new ErrorNoEncontrado('La configuración');
  return definicion;
}

export const configuracionServicio = {
  /**
   * Valor efectivo de una variable para una cuenta y empresa.
   * Es lo que usan los módulos para decidir su comportamiento.
   */
  async obtener<T>(clave: string, destino: DestinoConfiguracion): Promise<T> {
    const definicion = obtenerRegistroModulos().definicionConfiguracion(clave);
    if (!definicion) throw new Error(`La configuración "${clave}" no está declarada.`);
    const guardados = await configuracionesRepositorio.listar(destino);
    return resolverValor(definicion, valoresDe(clave, guardados)).valor as T;
  },

  /** Variables con su valor en cada nivel y el efectivo (de todos los módulos si se omiten los activos). */
  async listar(destino: DestinoConfiguracion, modulosActivos?: ReadonlySet<string>): Promise<VariableConfiguracion[]> {
    const guardados = await configuracionesRepositorio.listar(destino);
    return definiciones(modulosActivos).map((definicion) => {
      const valores = valoresDe(definicion.clave, guardados);
      const { valor, origen } = resolverValor(definicion, valores);
      return {
        clave: definicion.clave,
        descripcion: definicion.descripcion,
        niveles: [...definicion.niveles],
        predeterminado: definicion.predeterminado,
        valores,
        efectivo: valor,
        origen,
      };
    });
  },

  /** Valores efectivos de las variables públicas; viajan al navegador con la sesión. */
  async valoresPublicos(destino: DestinoConfiguracion, modulosActivos?: ReadonlySet<string>) {
    const publicas = new Set(
      definiciones(modulosActivos)
        .filter((c) => c.publica)
        .map((c) => c.clave),
    );
    const variables = await this.listar(destino, modulosActivos);
    return Object.fromEntries(variables.filter((v) => publicas.has(v.clave)).map((v) => [v.clave, v.efectivo]));
  },

  /**
   * @throws ErrorReglaNegocio si la variable no admite ese nivel.
   * @throws ErrorSolicitudInvalida si el valor no cumple el esquema de la variable.
   */
  async establecer(
    destino: DestinoConfiguracion,
    modulosActivos: ReadonlySet<string> | undefined,
    clave: string,
    nivel: NivelGuardado,
    valor: unknown,
    usuarioId: string,
  ): Promise<void> {
    const definicion = definicionObligatoria(clave, modulosActivos);
    if (!definicion.niveles.includes(nivel)) {
      throw new ErrorReglaNegocio(`Esta configuración no se puede fijar por ${nivel}.`);
    }
    const validado = definicion.esquema.safeParse(valor);
    if (!validado.success) {
      const motivo = validado.error.issues[0]?.message;
      throw new ErrorSolicitudInvalida(`El valor no es válido para esta configuración${motivo ? `: ${motivo}` : '.'}`);
    }
    await configuracionesRepositorio.guardar(nivel, destino, clave, validado.data, usuarioId);
  },

  /** Quita el valor del nivel para que vuelva a heredar del nivel superior. */
  async restablecer(
    destino: DestinoConfiguracion,
    modulosActivos: ReadonlySet<string> | undefined,
    clave: string,
    nivel: NivelGuardado,
  ): Promise<void> {
    definicionObligatoria(clave, modulosActivos);
    await configuracionesRepositorio.eliminar(nivel, destino, clave);
  },
};
