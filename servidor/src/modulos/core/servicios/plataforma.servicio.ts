import { ErrorNoEncontrado } from '../errores/errores.js';
import { obtenerRegistroModulos } from '../modulos-sistema/registro-global.js';
import { bitacoraRepositorio } from '../repositorios/bitacora.repositorio.js';
import { cuentasRepositorio } from '../repositorios/cuentas.repositorio.js';
import type { CambioCuenta } from '../validaciones/plataforma.validaciones.js';

export interface EstadoModulo {
  clave: string;
  nombre: string;
  descripcion: string;
  esencial: boolean;
  dependeDe: string[];
  activo: boolean;
}

/** Operaciones de soporte sobre las cuentas suscriptoras (solo superacceso). */
export const plataformaServicio = {
  listarCuentas() {
    return cuentasRepositorio.listar();
  },

  async actualizarCuenta(cuentaId: string, cambios: CambioCuenta) {
    await this.obtenerCuentaObligatoria(cuentaId);
    await cuentasRepositorio.actualizar(cuentaId, cambios);
  },

  /** Catálogo de módulos con su estado en la cuenta; sin cuenta, todos inactivos salvo los esenciales. */
  async listarModulos(cuentaId?: string): Promise<EstadoModulo[]> {
    const registro = obtenerRegistroModulos();
    const activos = registro.resolverActivos(cuentaId ? await cuentasRepositorio.clavesModulos(cuentaId) : []);
    return registro.listar().map((m) => ({
      clave: m.clave,
      nombre: m.nombre,
      descripcion: m.descripcion,
      esencial: m.esencial ?? false,
      dependeDe: [...(m.dependeDe ?? [])],
      activo: activos.has(m.clave),
    }));
  },

  /**
   * @throws ErrorReglaNegocio si faltan dependencias del módulo.
   */
  async activarModulo(cuentaId: string, clave: string) {
    await this.obtenerCuentaObligatoria(cuentaId);
    const registro = obtenerRegistroModulos();
    const activos = registro.resolverActivos(await cuentasRepositorio.clavesModulos(cuentaId));
    registro.validarActivacion(clave, activos);
    await cuentasRepositorio.activarModulo(cuentaId, clave);
    return this.listarModulos(cuentaId);
  },

  /**
   * Los datos del módulo se conservan; solo deja de estar disponible.
   * @throws ErrorReglaNegocio si es esencial o si otro módulo activo depende de él.
   */
  async desactivarModulo(cuentaId: string, clave: string) {
    await this.obtenerCuentaObligatoria(cuentaId);
    const registro = obtenerRegistroModulos();
    const activos = registro.resolverActivos(await cuentasRepositorio.clavesModulos(cuentaId));
    registro.validarDesactivacion(clave, activos);
    await cuentasRepositorio.desactivarModulo(cuentaId, clave);
    return this.listarModulos(cuentaId);
  },

  listarBitacora() {
    return bitacoraRepositorio.listarRecientes();
  },

  async obtenerCuentaObligatoria(cuentaId: string) {
    const cuenta = await cuentasRepositorio.buscarPorId(cuentaId);
    if (!cuenta) throw new ErrorNoEncontrado('La cuenta');
    return cuenta;
  },
};
