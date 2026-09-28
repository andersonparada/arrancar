import type { EmpresaSesion } from '../../../compartido/aplicacion/contexto-de-sesion.js';

/** El rol con que el usuario trabaja en una empresa activa de una cuenta activa. */
export interface AccesoDelUsuario {
  rolId: string;
  rolNombre: string;
  accesoTotal: boolean;
}

/** Las empresas a las que se puede entrar y lo que la cuenta tiene contratado. */
export interface EmpresasDeLaSesion {
  buscar(empresaId: string): Promise<EmpresaSesion | null>;
  accesoDe(usuarioId: string, empresaId: string): Promise<AccesoDelUsuario | null>;
  /** Activas, de cuentas activas, donde trabaja el usuario; ordenadas por cuenta y nombre. */
  disponiblesPara(usuarioId: string): Promise<EmpresaSesion[]>;
  /** Todas las del servidor, para soporte. */
  todas(): Promise<EmpresaSesion[]>;
  modulosContratados(cuentaId: string): Promise<string[]>;
}

/** Los módulos instalados: cuáles quedan activos y qué permisos traen. */
export interface CatalogoDeModulos {
  /** Los contratados más los esenciales y sus dependencias. */
  activos(contratados: string[]): ReadonlySet<string>;
  permisosDe(modulosActivos: ReadonlySet<string>): ReadonlySet<string>;
  /** De esos permisos, los que solo puede tener el superacceso (soporte). */
  permisosDeSuperacceso(modulosActivos: ReadonlySet<string>): ReadonlySet<string>;
  recursosConAlcanceTotal(
    modulosActivos: ReadonlySet<string>,
    permisos: ReadonlySet<string>,
    accesoTotal: boolean,
  ): readonly string[];
}
