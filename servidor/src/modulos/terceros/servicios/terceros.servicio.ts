import type { Transaccion } from '../../core/base-datos/conexion.js';
import { ejecutarEnEmpresa, type ContextoEmpresa } from '../../core/base-datos/contexto-empresa.js';
import { ErrorConflicto, ErrorNoEncontrado } from '../../core/errores/errores.js';
import { busEventos } from '../../core/eventos/bus-eventos.js';
import '../eventos/eventos.js';
import { clientesRepositorio } from '../repositorios/clientes.repositorio.js';
import { contactosRepositorio } from '../repositorios/contactos.repositorio.js';
import { proveedoresRepositorio } from '../repositorios/proveedores.repositorio.js';
import { tercerosRepositorio, type Tercero } from '../repositorios/terceros.repositorio.js';
import { trabajadoresRepositorio } from '../repositorios/trabajadores.repositorio.js';
import { NIT_CONSUMIDOR_FINAL } from '../esquemas/terceros.esquema.js';
import { calcularNombreMostrar } from '../utilidades/nombre-mostrar.js';
import type { FiltrosListarTerceros, TerceroSolicitado } from '../validaciones/terceros.validaciones.js';

/** Qué papeles puede ver el operador; controla si se le ocultan los datos sensibles del trabajador. */
export interface OpcionesVisibilidad {
  puedeVerTrabajadores: boolean;
}

/** Datos del tercero, ocultando DPI y teléfono si es trabajador y el operador no puede verlos. */
function presentar(tercero: Tercero, opciones: OpcionesVisibilidad, esTrabajador: boolean) {
  const ocultarSensibles = esTrabajador && !opciones.puedeVerTrabajadores;
  return {
    id: tercero.id,
    tipo: tercero.tipo,
    nombres: tercero.nombres,
    apellidos: tercero.apellidos,
    razonSocial: tercero.razonSocial,
    nombreComercial: tercero.nombreComercial,
    nombreMostrar: tercero.nombreMostrar,
    nit: tercero.nit,
    dpi: ocultarSensibles ? null : tercero.dpi,
    telefono: ocultarSensibles ? null : tercero.telefono,
    whatsapp: tercero.whatsapp,
    correo: tercero.correo,
    departamentoCodigo: tercero.departamentoCodigo,
    municipioCodigo: tercero.municipioCodigo,
    direccion: tercero.direccion,
    fotoArchivoId: tercero.fotoArchivoId,
    notas: tercero.notas,
    activo: tercero.activo,
    actualizadoEn: tercero.actualizadoEn,
  };
}

async function papelesDe(tx: Parameters<typeof clientesRepositorio.terceroIdsConPapel>[0], terceroIds: string[]) {
  const [cliente, proveedor, trabajador] = await Promise.all([
    clientesRepositorio.terceroIdsConPapel(tx, terceroIds),
    proveedoresRepositorio.terceroIdsConPapel(tx, terceroIds),
    trabajadoresRepositorio.terceroIdsConPapel(tx, terceroIds),
  ]);
  return { cliente, proveedor, trabajador };
}

export const tercerosServicio = {
  /** Listado con búsqueda por nombre, NIT, DPI o teléfono y filtro por papel y por estado. */
  async listar(contexto: ContextoEmpresa, filtros: FiltrosListarTerceros, opciones: OpcionesVisibilidad) {
    return ejecutarEnEmpresa(contexto, async (tx) => {
      const lista = await tercerosRepositorio.listar(tx, { texto: filtros.texto, activo: filtros.activo });
      const papeles = await papelesDe(tx, lista.map((t) => t.id));
      const filtrada = filtros.papel ? lista.filter((t) => papeles[filtros.papel!].has(t.id)) : lista;

      return filtrada.map((tercero) => ({
        ...presentar(tercero, opciones, papeles.trabajador.has(tercero.id)),
        papeles: {
          cliente: papeles.cliente.has(tercero.id),
          proveedor: papeles.proveedor.has(tercero.id),
          trabajador: papeles.trabajador.has(tercero.id),
        },
      }));
    });
  },

  /** Ficha completa: datos generales, contactos y el detalle de cada papel que tenga. */
  async obtenerFicha(contexto: ContextoEmpresa, terceroId: string, opciones: OpcionesVisibilidad) {
    return ejecutarEnEmpresa(contexto, async (tx) => {
      const tercero = await tercerosRepositorio.buscarPorId(tx, terceroId);
      if (!tercero) throw new ErrorNoEncontrado('El tercero');

      const [contactos, cliente, proveedor, trabajador] = await Promise.all([
        contactosRepositorio.listarDeTercero(tx, terceroId),
        clientesRepositorio.buscarPorTercero(tx, terceroId),
        proveedoresRepositorio.buscarPorTercero(tx, terceroId),
        trabajadoresRepositorio.buscarPorTercero(tx, terceroId),
      ]);

      return {
        ...presentar(tercero, opciones, !!trabajador),
        contactos,
        cliente: cliente ?? null,
        proveedor: proveedor ?? null,
        trabajador: opciones.puedeVerTrabajadores ? (trabajador ?? null) : null,
      };
    });
  },

  /**
   * Crea el tercero. Si hay posibles duplicados (mismo NIT, mismo DPI o nombre muy
   * parecido) y no se pidió `confirmarDuplicado`, no lo crea y avisa con la lista.
   * @throws ErrorConflicto con los posibles duplicados en `detalles.duplicados`.
   */
  async crear(contexto: ContextoEmpresa, datos: TerceroSolicitado) {
    const nombreMostrar = calcularNombreMostrar(datos);
    return ejecutarEnEmpresa(contexto, async (tx) => {
      await avisarSiHayDuplicados(tx, { ...datos, nombreMostrar });

      const { confirmarDuplicado, ...campos } = datos;
      const tercero = await tercerosRepositorio.crear(tx, { ...campos, nombreMostrar, cuentaId: contexto.cuentaId });
      await busEventos.publicar('terceros.creado', { terceroId: tercero.id, cuentaId: contexto.cuentaId });
      return presentar(tercero, { puedeVerTrabajadores: true }, false);
    });
  },

  /**
   * Actualiza el tercero. Si se inactiva (`activo: false`), inactiva también sus papeles.
   * @throws ErrorConflicto con los posibles duplicados en `detalles.duplicados`.
   */
  async actualizar(contexto: ContextoEmpresa, terceroId: string, datos: TerceroSolicitado) {
    const nombreMostrar = calcularNombreMostrar(datos);
    return ejecutarEnEmpresa(contexto, async (tx) => {
      const existente = await tercerosRepositorio.buscarPorId(tx, terceroId);
      if (!existente) throw new ErrorNoEncontrado('El tercero');

      await avisarSiHayDuplicados(tx, { ...datos, nombreMostrar }, terceroId);

      const { confirmarDuplicado, ...campos } = datos;
      const tercero = await tercerosRepositorio.actualizar(tx, terceroId, { ...campos, nombreMostrar });

      if (existente.activo && !tercero.activo) {
        await Promise.all([
          inactivarPapelSiExiste(clientesRepositorio, tx, terceroId),
          inactivarPapelSiExiste(proveedoresRepositorio, tx, terceroId),
          inactivarPapelSiExiste(trabajadoresRepositorio, tx, terceroId),
        ]);
        await busEventos.publicar('terceros.inactivado', { terceroId, cuentaId: contexto.cuentaId });
      } else {
        await busEventos.publicar('terceros.actualizado', { terceroId, cuentaId: contexto.cuentaId });
      }

      return presentar(tercero, { puedeVerTrabajadores: true }, false);
    });
  },
};

async function avisarSiHayDuplicados(
  tx: Parameters<typeof tercerosRepositorio.buscarPosiblesDuplicados>[0],
  datos: { nombreMostrar: string; nit: string | null; dpi: string | null; confirmarDuplicado: boolean },
  excluirId?: string,
) {
  if (datos.confirmarDuplicado) return;
  const duplicados = await tercerosRepositorio.buscarPosiblesDuplicados(
    tx,
    { nombreMostrar: datos.nombreMostrar, nit: datos.nit, dpi: datos.dpi },
    excluirId,
  );
  if (duplicados.length === 0) return;
  throw new ErrorConflicto('Hay terceros con datos parecidos; confirme para guardarlo de todas formas.', {
    duplicados: duplicados.map((d) => ({ id: d.id, nombreMostrar: d.nombreMostrar, nit: d.nit, dpi: d.dpi })),
  });
}

interface RepositorioPapel<T extends Transaccion> {
  buscarPorTercero(tx: T, terceroId: string): Promise<{ id: string; activo: boolean } | undefined>;
  actualizar(tx: T, id: string, cambios: { activo: boolean }): Promise<unknown>;
}

async function inactivarPapelSiExiste<T extends Transaccion>(
  repositorio: RepositorioPapel<T>,
  tx: T,
  terceroId: string,
): Promise<void> {
  const papel = await repositorio.buscarPorTercero(tx, terceroId);
  if (papel && papel.activo) await repositorio.actualizar(tx, papel.id, { activo: false });
}

export { NIT_CONSUMIDOR_FINAL };
