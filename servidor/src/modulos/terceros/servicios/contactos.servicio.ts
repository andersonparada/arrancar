import { ejecutarEnEmpresa, type ContextoEmpresa } from '../../core/base-datos/contexto-empresa.js';
import { ErrorNoEncontrado } from '../../core/errores/errores.js';
import { contactosRepositorio } from '../repositorios/contactos.repositorio.js';
import { tercerosRepositorio } from '../repositorios/terceros.repositorio.js';
import type { ContactoSolicitado } from '../validaciones/contactos.validaciones.js';

async function obtenerTerceroONoEncontrado(
  tx: Parameters<typeof tercerosRepositorio.buscarPorId>[0],
  terceroId: string,
) {
  const tercero = await tercerosRepositorio.buscarPorId(tx, terceroId);
  if (!tercero) throw new ErrorNoEncontrado('El tercero');
  return tercero;
}

export const contactosServicio = {
  listar(contexto: ContextoEmpresa, terceroId: string) {
    return ejecutarEnEmpresa(contexto, async (tx) => {
      await obtenerTerceroONoEncontrado(tx, terceroId);
      return contactosRepositorio.listarDeTercero(tx, terceroId);
    });
  },

  crear(contexto: ContextoEmpresa, terceroId: string, datos: ContactoSolicitado) {
    return ejecutarEnEmpresa(contexto, async (tx) => {
      await obtenerTerceroONoEncontrado(tx, terceroId);
      return contactosRepositorio.crear(tx, { ...datos, terceroId, cuentaId: contexto.cuentaId });
    });
  },

  async actualizar(contexto: ContextoEmpresa, contactoId: string, datos: ContactoSolicitado) {
    return ejecutarEnEmpresa(contexto, async (tx) => {
      const existente = await contactosRepositorio.buscarPorId(tx, contactoId);
      if (!existente) throw new ErrorNoEncontrado('El contacto');
      return contactosRepositorio.actualizar(tx, contactoId, datos);
    });
  },

  async eliminar(contexto: ContextoEmpresa, contactoId: string): Promise<void> {
    return ejecutarEnEmpresa(contexto, async (tx) => {
      const existente = await contactosRepositorio.buscarPorId(tx, contactoId);
      if (!existente) throw new ErrorNoEncontrado('El contacto');
      await contactosRepositorio.eliminar(tx, contactoId);
    });
  },
};
