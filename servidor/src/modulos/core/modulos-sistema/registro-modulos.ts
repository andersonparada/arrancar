import { FaltanDependenciasDelModulo, ModuloDesconocido, ModuloEnUso, ModuloEsencial } from './errores.js';
import { verificarDeclaracion } from './declaracion-de-modulos.js';
import type { DefinicionConfiguracion, DefinicionModulo, DefinicionPermiso } from './definicion-modulo.js';

/**
 * Catálogo de los módulos disponibles y sus reglas de activación.
 * Se crea una sola instancia al arrancar (ver `modulos/indice.ts`).
 */
export class RegistroModulos {
  private readonly modulos = new Map<string, DefinicionModulo>();

  constructor(definiciones: readonly DefinicionModulo[]) {
    for (const definicion of definiciones) this.registrar(definicion);
    this.verificarDeclaraciones();
  }

  listar(): DefinicionModulo[] {
    return [...this.modulos.values()];
  }

  obtener(clave: string): DefinicionModulo | undefined {
    return this.modulos.get(clave);
  }

  /** Une los módulos esenciales con los contratados, ignorando claves que ya no existen. */
  resolverActivos(clavesContratadas: Iterable<string>): Set<string> {
    const activos = new Set(
      this.listar()
        .filter((m) => m.esencial)
        .map((m) => m.clave),
    );
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

  /** De los permisos de esos módulos, los que solo puede tener el superacceso (soporte). */
  permisosDeSuperacceso(clavesModulos: Iterable<string>): DefinicionPermiso[] {
    return this.permisosDe(clavesModulos).filter((permiso) => permiso.soloSuperacceso);
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

  /**
   * Recursos con alcance de los módulos activos cuyo permiso de asignar posee el usuario
   * (el acceso total y el superacceso los tienen todos, porque tienen todos los permisos).
   */
  recursosParaAsignar(modulosActivos: Iterable<string>, permisos: ReadonlySet<string>): string[] {
    const recursos: string[] = [];
    for (const clave of modulosActivos) {
      for (const recurso of this.modulos.get(clave)?.recursosConAlcance ?? []) {
        if (permisos.has(recurso.permisoAsignar)) recursos.push(recurso.clave);
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

  /** Definición completa de un permiso (esté o no su módulo activo), o `undefined` si no existe. */
  definicionDePermiso(clave: string): DefinicionPermiso | undefined {
    for (const modulo of this.modulos.values()) {
      const permiso = modulo.permisos.find((p) => p.clave === clave);
      if (permiso) return permiso;
    }
    return undefined;
  }

  /**
   * Comprueba que un módulo se pueda activar con los que ya están activos.
   * @throws ModuloDesconocido o FaltanDependenciasDelModulo.
   */
  validarActivacion(clave: string, activos: ReadonlySet<string>): void {
    const modulo = this.obtenerObligatorio(clave);
    const faltantes = (modulo.dependeDe ?? []).filter((d) => !activos.has(d));
    if (faltantes.length > 0) {
      const nombres = faltantes.map((d) => this.modulos.get(d)?.nombre ?? d).join(', ');
      throw new FaltanDependenciasDelModulo(`${modulo.nombre} depende de: ${nombres}. Actívelos primero.`, {
        faltantes,
      });
    }
  }

  /**
   * Comprueba que un módulo se pueda desactivar sin dejar huérfano a otro activo.
   * @throws ModuloEsencial o ModuloEnUso.
   */
  validarDesactivacion(clave: string, activos: ReadonlySet<string>): void {
    const modulo = this.obtenerObligatorio(clave);
    if (modulo.esencial) throw new ModuloEsencial(modulo.nombre);

    const dependientes = this.listar().filter((m) => activos.has(m.clave) && m.dependeDe?.includes(clave));
    if (dependientes.length > 0) {
      const nombres = dependientes.map((m) => m.nombre).join(', ');
      throw new ModuloEnUso(`No se puede desactivar ${modulo.nombre}: lo usan ${nombres}.`, {
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
    if (!modulo) throw new ModuloDesconocido(clave);
    return modulo;
  }

  private verificarDeclaraciones(): void {
    const instalados = new Set(this.modulos.keys());
    for (const modulo of this.modulos.values()) verificarDeclaracion(modulo, instalados);
  }
}
