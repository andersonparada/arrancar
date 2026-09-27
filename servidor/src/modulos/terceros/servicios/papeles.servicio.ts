import { ejecutarEnEmpresa, type ContextoEmpresa } from '../../core/base-datos/contexto-empresa.js';
import { ErrorNoEncontrado, ErrorReglaNegocio } from '../../core/errores/errores.js';
import { busEventos } from '../../core/eventos/bus-eventos.js';
import '../eventos/eventos.js';
import { clientesRepositorio } from '../repositorios/clientes.repositorio.js';
import { proveedoresRepositorio } from '../repositorios/proveedores.repositorio.js';
import { tercerosRepositorio } from '../repositorios/terceros.repositorio.js';
import { trabajadoresRepositorio } from '../repositorios/trabajadores.repositorio.js';
import type { CategoriaProveedorSolicitada, ClienteSolicitado, ProveedorSolicitado, TrabajadorSolicitado } from '../validaciones/papeles.validaciones.js';

async function tercerroActivoONoEncontrado(tx: Parameters<typeof tercerosRepositorio.buscarPorId>[0], terceroId: string) {
  const tercero = await tercerosRepositorio.buscarPorId(tx, terceroId);
  if (!tercero) throw new ErrorNoEncontrado('El tercero');
  if (!tercero.activo) throw new ErrorReglaNegocio('El tercero está inactivo; actívelo antes de asignarle un papel.');
  return tercero;
}

export const papelesServicio = {
  async asignarCliente(contexto: ContextoEmpresa, terceroId: string, datos: ClienteSolicitado) {
    return ejecutarEnEmpresa(contexto, async (tx) => {
      await tercerroActivoONoEncontrado(tx, terceroId);
      const existente = await clientesRepositorio.buscarPorTercero(tx, terceroId);
      const cliente = existente
        ? await clientesRepositorio.actualizar(tx, existente.id, datos)
        : await clientesRepositorio.crear(tx, { ...datos, terceroId, cuentaId: contexto.cuentaId });
      await busEventos.publicar('terceros.papel_asignado', { terceroId, cuentaId: contexto.cuentaId, papel: 'cliente' });
      return cliente;
    });
  },

  async quitarCliente(contexto: ContextoEmpresa, terceroId: string) {
    return ejecutarEnEmpresa(contexto, async (tx) => {
      const existente = await clientesRepositorio.buscarPorTercero(tx, terceroId);
      if (!existente) throw new ErrorNoEncontrado('El papel de cliente');
      const cliente = await clientesRepositorio.actualizar(tx, existente.id, { activo: false });
      await busEventos.publicar('terceros.papel_quitado', { terceroId, cuentaId: contexto.cuentaId, papel: 'cliente' });
      return cliente;
    });
  },

  async asignarProveedor(contexto: ContextoEmpresa, terceroId: string, datos: ProveedorSolicitado) {
    return ejecutarEnEmpresa(contexto, async (tx) => {
      await tercerroActivoONoEncontrado(tx, terceroId);
      if (datos.categoriaId && !(await proveedoresRepositorio.buscarCategoriaPorId(tx, datos.categoriaId))) {
        throw new ErrorNoEncontrado('La categoría de proveedor');
      }
      const existente = await proveedoresRepositorio.buscarPorTercero(tx, terceroId);
      const proveedor = existente
        ? await proveedoresRepositorio.actualizar(tx, existente.id, datos)
        : await proveedoresRepositorio.crear(tx, { ...datos, terceroId, cuentaId: contexto.cuentaId });
      await busEventos.publicar('terceros.papel_asignado', { terceroId, cuentaId: contexto.cuentaId, papel: 'proveedor' });
      return proveedor;
    });
  },

  async quitarProveedor(contexto: ContextoEmpresa, terceroId: string) {
    return ejecutarEnEmpresa(contexto, async (tx) => {
      const existente = await proveedoresRepositorio.buscarPorTercero(tx, terceroId);
      if (!existente) throw new ErrorNoEncontrado('El papel de proveedor');
      const proveedor = await proveedoresRepositorio.actualizar(tx, existente.id, { activo: false });
      await busEventos.publicar('terceros.papel_quitado', { terceroId, cuentaId: contexto.cuentaId, papel: 'proveedor' });
      return proveedor;
    });
  },

  listarCategorias(contexto: ContextoEmpresa) {
    return ejecutarEnEmpresa(contexto, (tx) => proveedoresRepositorio.listarCategorias(tx));
  },

  crearCategoria(contexto: ContextoEmpresa, datos: CategoriaProveedorSolicitada) {
    return ejecutarEnEmpresa(contexto, (tx) => proveedoresRepositorio.crearCategoria(tx, contexto.cuentaId, datos.nombre));
  },

  async actualizarCategoria(contexto: ContextoEmpresa, categoriaId: string, datos: CategoriaProveedorSolicitada) {
    return ejecutarEnEmpresa(contexto, async (tx) => {
      const existente = await proveedoresRepositorio.buscarCategoriaPorId(tx, categoriaId);
      if (!existente) throw new ErrorNoEncontrado('La categoría de proveedor');
      return proveedoresRepositorio.actualizarCategoria(tx, categoriaId, datos);
    });
  },

  async asignarTrabajador(contexto: ContextoEmpresa, terceroId: string, datos: TrabajadorSolicitado) {
    return ejecutarEnEmpresa(contexto, async (tx) => {
      await tercerroActivoONoEncontrado(tx, terceroId);
      const existente = await trabajadoresRepositorio.buscarPorTercero(tx, terceroId);
      const trabajador = existente
        ? await trabajadoresRepositorio.actualizar(tx, existente.id, datos)
        : await trabajadoresRepositorio.crear(tx, { ...datos, terceroId, cuentaId: contexto.cuentaId });
      await busEventos.publicar('terceros.papel_asignado', { terceroId, cuentaId: contexto.cuentaId, papel: 'trabajador' });
      return trabajador;
    });
  },

  async quitarTrabajador(contexto: ContextoEmpresa, terceroId: string) {
    return ejecutarEnEmpresa(contexto, async (tx) => {
      const existente = await trabajadoresRepositorio.buscarPorTercero(tx, terceroId);
      if (!existente) throw new ErrorNoEncontrado('El papel de trabajador');
      const trabajador = await trabajadoresRepositorio.actualizar(tx, existente.id, { activo: false });
      await busEventos.publicar('terceros.papel_quitado', { terceroId, cuentaId: contexto.cuentaId, papel: 'trabajador' });
      return trabajador;
    });
  },
};
