import { ErrorReglaNegocio } from '../errores/errores.js';
import type { DefinicionConfiguracion, DefinicionModulo, DefinicionPermiso } from './definicion-modulo.js';

/**
 * Catálogo de los módulos disponibles y sus reglas de activación.
 * Se crea una sola instancia al arrancar (ver `modulos/indice.ts`).
 */
export class RegistroModulos {
  private readonly modulos = new Map<string, DefinicionModulo>();

  constructor(definiciones: readonly DefinicionModulo[]) {
    for (const definicion of definiciones) this.registrar(definicion);
    this.verificarDependenciasDeclaradas();
  }

  listar(): DefinicionModulo[] {
    return [...this.modulos.values()];
  }

  obtener(clave: string): DefinicionModulo | undefined {
    return this.modulos.get(clave);
  }

  /** Une los módulos esenciales con los contratados, ignorando claves que ya no existen. */
  resolverActivos(clavesContratadas: Iterable<string>): Set<string> {
    const activos = new Set(this.listar().filter((m) => m.esencial).map((m) => m.clave));
    for (const clave of clavesContratadas) {
      if (this.modulos.has(clave)) activos.add(clave);
    }
    return activos;
  }

  /** Permisos que aportan los módulos indicados. */
  permisosDe(clavesModulos: Iterable<string>): DefinicionPermiso[] {
    const permisos: DefinicionPermiso[] = [];
    for (const clave of clavesModulos) permisos.push(...(this.modulos.get(clave)?.permisos ?? []));
    return permisos;
  }

  /**
   * Recursos con alcance de los módulos activos que el usuario ve completos:
   * todos si tiene acceso total, o aquellos cuyo permiso "ver todos" posee.
   */
  recursosConAlcanceTotal(
    modulosActivos: Iterable<string>,
    permisos: ReadonlySet<string>,
    accesoTotal: boolean,
  ): string[] {
    const recursos: string[] = [];
    for (const clave of modulosActivos) {
      for (const recurso of this.modulos.get(clave)?.recursosConAlcance ?? []) {
        if (accesoTotal || permisos.has(recurso.permisoVerTodos)) recursos.push(recurso.clave);
      }
    }
    return recursos;
  }

  /** Variables de configuración de los módulos indicados (todos los instalados si se omite). */
  configuracionesDe(clavesModulos?: Iterable<string>): DefinicionConfiguracion[] {
    const claves = clavesModulos ? [...clavesModulos] : [...this.modulos.keys()];
    return claves.flatMap((clave) => [...(this.modulos.get(clave)?.configuracion ?? [])]);
  }

  definicionConfiguracion(clave: string): DefinicionConfiguracion | undefined {
    return this.configuracionesDe().find((c) => c.clave === clave);
  }

  /** Módulo al que pertenece un permiso, o `undefined` si ningún módulo lo declara. */
  moduloDelPermiso(permiso: string): string | undefined {
    return this.listar().find((m) => m.permisos.some((p) => p.clave === permiso))?.clave;
  }

  /**
   * Comprueba que un módulo se pueda activar con los que ya están activos.
   * @throws ErrorReglaNegocio si el módulo no existe o le falta alguna dependencia.
   */
  validarActivacion(clave: string, activos: ReadonlySet<string>): void {
    const modulo = this.obtenerObligatorio(clave);
    const faltantes = (modulo.dependeDe ?? []).filter((d) => !activos.has(d));
    if (faltantes.length > 0) {
      const nombres = faltantes.map((d) => this.modulos.get(d)?.nombre ?? d).join(', ');
      throw new ErrorReglaNegocio(`${modulo.nombre} depende de: ${nombres}. Actívelos primero.`, { faltantes });
    }
  }

  /**
   * Comprueba que un módulo se pueda desactivar sin dejar huérfano a otro activo.
   * @throws ErrorReglaNegocio si es esencial o si otro módulo activo depende de él.
   */
  validarDesactivacion(clave: string, activos: ReadonlySet<string>): void {
    const modulo = this.obtenerObligatorio(clave);
    if (modulo.esencial) throw new ErrorReglaNegocio(`${modulo.nombre} es esencial y no se puede desactivar.`);

    const dependientes = this.listar().filter((m) => activos.has(m.clave) && m.dependeDe?.includes(clave));
    if (dependientes.length > 0) {
      const nombres = dependientes.map((m) => m.nombre).join(', ');
      throw new ErrorReglaNegocio(`No se puede desactivar ${modulo.nombre}: lo usan ${nombres}.`, {
        dependientes: dependientes.map((m) => m.clave),
      });
    }
  }

  private registrar(definicion: DefinicionModulo): void {
    if (this.modulos.has(definicion.clave)) {
      throw new Error(`El módulo "${definicion.clave}" está registrado dos veces.`);
    }
    this.modulos.set(definicion.clave, definicion);
  }

  private obtenerObligatorio(clave: string): DefinicionModulo {
    const modulo = this.modulos.get(clave);
    if (!modulo) throw new ErrorReglaNegocio(`El módulo "${clave}" no existe.`);
    return modulo;
  }

  private verificarDependenciasDeclaradas(): void {
    for (const modulo of this.modulos.values()) {
      for (const variable of modulo.configuracion ?? []) {
        if (!variable.clave.startsWith(`${modulo.clave}.`)) {
          throw new Error(`La configuración "${variable.clave}" debe empezar con "${modulo.clave}.".`);
        }
        if (!variable.esquema.safeParse(variable.predeterminado).success) {
          throw new Error(`El valor predeterminado de "${variable.clave}" no cumple su esquema.`);
        }
      }
      for (const recurso of modulo.recursosConAlcance ?? []) {
        if (!modulo.permisos.some((p) => p.clave === recurso.permisoVerTodos)) {
          throw new Error(`El recurso "${recurso.clave}" usa el permiso "${recurso.permisoVerTodos}", que su módulo no declara.`);
        }
      }
      for (const dependencia of modulo.dependeDe ?? []) {
        if (!this.modulos.has(dependencia)) {
          throw new Error(`El módulo "${modulo.clave}" depende de "${dependencia}", que no está registrado.`);
        }
      }
    }
  }
}
