import { bd } from '../../core/base-datos/conexion.js';
import { ErrorNoEncontrado, ErrorReglaNegocio } from '../../core/errores/errores.js';
import { empresasRepositorio, type Empresa } from '../../core/repositorios/empresas.repositorio.js';
import type { EmpresaSolicitada } from '../validaciones/empresas.validaciones.js';

/** Quién opera y en qué cuenta; las empresas siempre se gestionan dentro de una cuenta. */
export interface OperadorCuenta {
  usuarioId: string;
  esSuperacceso: boolean;
  cuentaId: string;
  empresaActivaId: string;
}

function presentar(empresa: Empresa) {
  return {
    id: empresa.id,
    nombre: empresa.nombre,
    nit: empresa.nit,
    direccion: empresa.direccion,
    telefono: empresa.telefono,
    correo: empresa.correo,
    monedaBase: empresa.monedaBase,
    activa: empresa.activa,
    actualizadoEn: empresa.actualizadoEn,
  };
}

/** Ids de las empresas a las que el operador tiene acceso; `null` significa todas (superacceso). */
async function empresasAccesibles(operador: OperadorCuenta): Promise<Set<string> | null> {
  if (operador.esSuperacceso) return null;
  return new Set(await empresasRepositorio.listarAccesosDeUsuario(operador.usuarioId));
}

export const empresasServicio = {
  /** Empresas de la cuenta a las que el operador tiene acceso, activas o no. */
  async listar(operador: OperadorCuenta) {
    const accesibles = await empresasAccesibles(operador);
    const empresas = await empresasRepositorio.listarDeCuenta(operador.cuentaId);
    return empresas.filter((e) => !accesibles || accesibles.has(e.id)).map(presentar);
  },

  async obtener(operador: OperadorCuenta, empresaId: string) {
    return presentar(await this.obtenerAccesible(operador, empresaId));
  },

  /**
   * Crea la empresa dentro de la cuenta y le da acceso a quien la crea,
   * con el mismo rol que tiene en la empresa activa.
   */
  async crear(operador: OperadorCuenta, datos: EmpresaSolicitada) {
    const acceso = await empresasRepositorio.obtenerAcceso(operador.usuarioId, operador.empresaActivaId);
    return bd.transaction(async (tx) => {
      const empresa = await empresasRepositorio.crear({ ...datos, cuentaId: operador.cuentaId }, tx);
      if (acceso) await empresasRepositorio.asignarAcceso(empresa.id, operador.usuarioId, acceso.rolId, tx);
      return presentar(empresa);
    });
  },

  /**
   * @throws ErrorReglaNegocio si se intenta desactivar la empresa con la que se está trabajando.
   */
  async actualizar(operador: OperadorCuenta, empresaId: string, datos: EmpresaSolicitada) {
    await this.obtenerAccesible(operador, empresaId);
    if (!datos.activa && empresaId === operador.empresaActivaId) {
      throw new ErrorReglaNegocio('No puede desactivar la empresa con la que está trabajando.');
    }
    return presentar(await empresasRepositorio.actualizar(empresaId, datos));
  },

  /**
   * @throws ErrorNoEncontrado si la empresa no es de la cuenta o el operador no tiene acceso a ella.
   */
  async obtenerAccesible(operador: OperadorCuenta, empresaId: string): Promise<Empresa> {
    const empresa = await empresasRepositorio.buscarDeCuenta(empresaId, operador.cuentaId);
    const accesibles = await empresasAccesibles(operador);
    if (!empresa || (accesibles && !accesibles.has(empresaId))) throw new ErrorNoEncontrado('La empresa');
    return empresa;
  },
};
