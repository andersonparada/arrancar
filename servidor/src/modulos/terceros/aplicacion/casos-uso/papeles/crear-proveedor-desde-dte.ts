import { AccesoDenegado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { Nit } from '../../../../core/compartido/dominio/objetos-valor/nit.js';
import { NitDeProveedorSinNumero, ProveedorInactivo } from '../../../dominio/errores.js';
import { IdentidadDeTercero } from '../../../dominio/identidad-de-tercero.js';
import type { PapelDeProveedor } from '../../../dominio/papeles.js';
import { Tercero } from '../../../dominio/tercero.js';
import type { ConsultasTerceros } from '../../puertos/consultas.js';
import type { RepositorioTerceros } from '../../puertos/repositorios.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioTerceros;
  consultas: ConsultasTerceros;
}

export interface PedidoDeProveedorDesdeDte {
  nit: string;
  nombre: string;
  tipoDePersona: 'individual' | 'juridica';
  /** El usuario de quien manda tiene `proveedores.crear`. */
  puedeCrearProveedores: boolean;
}

export interface ProveedorDesdeDte {
  proveedorId: string;
  terceroId: string;
  creado: boolean;
}

const PAPEL_NUEVO: PapelDeProveedor = { tipo: 'proveedor', categoriaId: null, activo: true, notas: null };

/**
 * Atiende la orden `terceros.crear_proveedor_desde_dte`: el proveedor de un DTE recibido, sin duplicar el NIT.
 * Corre en la transacción de quien la manda (la unidad de trabajo se une a ella), así que cualquier rechazo
 * deshace también lo suyo. El alta de proveedores no audita (no es baja, inactivación ni anulación); la autoría
 * la fija la transacción. Los eventos de dominio no se publican: la transacción aún no está confirmada.
 */
export class CrearProveedorDesdeDte {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws AccesoDenegado si el usuario de quien manda no puede crear proveedores.
   * @throws NitInvalido, NitDeProveedorSinNumero o FaltaElNombre si los datos no sirven.
   * @throws ProveedorInactivo si el NIT es de un proveedor inactivo.
   * @throws TerceroInactivo si el NIT es de un tercero inactivo sin papel de proveedor.
   */
  async ejecutar(operador: Operador, pedido: PedidoDeProveedorDesdeDte): Promise<ProveedorDesdeDte> {
    if (!pedido.puedeCrearProveedores) throw new AccesoDenegado();
    const nit = Nit.crear(pedido.nit);
    if (nit.esConsumidorFinal()) throw new NitDeProveedorSinNumero();
    const identidad = this.identidadDe(pedido);

    return this.dependencias.unidadDeTrabajo.ejecutar(operador, async () => {
      const existente = await this.dependencias.repositorio.buscarPorNit(nit.valor);
      const tercero = existente ?? this.nuevo(operador, identidad, nit);
      if (existente) await this.asegurarPapel(existente);
      else await this.dependencias.repositorio.agregar(tercero);
      const terceroId = tercero.id.valor;
      const { id: proveedorId } = await this.dependencias.consultas.obtenerPapel(terceroId, 'proveedor');
      return { proveedorId, terceroId, creado: !existente };
    });
  }

  private identidadDe({ tipoDePersona, nombre }: PedidoDeProveedorDesdeDte): IdentidadDeTercero {
    const nombres = { nombres: null, apellidos: null, razonSocial: null, nombreComercial: null };
    return IdentidadDeTercero.crear(tipoDePersona, {
      ...nombres,
      ...(tipoDePersona === 'individual' ? { nombres: nombre } : { razonSocial: nombre }),
    });
  }

  private nuevo(operador: Operador, identidad: IdentidadDeTercero, nit: Nit): Tercero {
    const tercero = Tercero.registrar(Identificador.desde(operador.cuentaId), {
      identidad,
      nit,
      dpi: null,
      telefono: null,
      whatsapp: null,
      correo: null,
      ubicacion: { departamentoCodigo: null, municipioCodigo: null, direccion: null },
      fotoArchivoId: null,
      notas: null,
      activo: true,
    });
    tercero.asignarPapel(PAPEL_NUEVO);
    return tercero;
  }

  /** Si ya es proveedor activo no cambia nada; si no tiene el papel, se lo asigna. */
  private async asegurarPapel(tercero: Tercero): Promise<void> {
    const papel = tercero.papel('proveedor');
    if (papel && !papel.activo) throw new ProveedorInactivo(tercero.nombreParaMostrar);
    if (papel) return;
    tercero.asignarPapel(PAPEL_NUEVO);
    await this.dependencias.repositorio.guardar(tercero);
  }
}
