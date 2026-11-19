import { AccesoDenegado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { Nit } from '../../../../core/compartido/dominio/objetos-valor/nit.js';
import { ClienteInactivo } from '../../../dominio/errores.js';
import { IdentidadDeTercero } from '../../../dominio/identidad-de-tercero.js';
import type { PapelDeCliente } from '../../../dominio/papeles.js';
import { Tercero } from '../../../dominio/tercero.js';
import type { ConsultasTerceros } from '../../puertos/consultas.js';
import type { RepositorioTerceros } from '../../puertos/repositorios.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioTerceros;
  consultas: ConsultasTerceros;
}

export interface PedidoDeClienteDesdeDte {
  nit: string;
  tipoDePersona: 'individual' | 'juridica';
  /** Solo con `individual`. */
  nombres: string | null;
  apellidos: string | null;
  /** Solo con `juridica`. */
  razonSocial: string | null;
  /** El usuario de quien manda tiene `clientes.crear`. */
  puedeCrearClientes: boolean;
}

export interface ClienteDesdeDte {
  clienteId: string;
  terceroId: string;
  creado: boolean;
  /** El nombre para mostrar del tercero, nuevo o existente. */
  nombre: string;
}

const PAPEL_NUEVO: PapelDeCliente = { tipo: 'cliente', clase: 'directo', activo: true, notas: null };

/**
 * Atiende la orden `terceros.crear_cliente_desde_dte`: el cliente de un DTE emitido, sin duplicar el NIT.
 * Corre en la transacción de quien la manda (la unidad de trabajo se une a ella), así que cualquier rechazo
 * deshace también lo suyo. El alta de clientes no audita (no es baja, inactivación ni anulación); la autoría
 * la fija la transacción. Los eventos de dominio no se publican: la transacción aún no está confirmada.
 * El consumidor final (`CF`) no es un tercero: no crea nada y responde `null`.
 */
export class CrearClienteDesdeDte {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws AccesoDenegado si el usuario de quien manda no puede crear clientes (con `detalles.accion`).
   * @throws NitInvalido o FaltaElNombre si los datos no sirven.
   * @throws ClienteInactivo si el NIT es de un cliente inactivo.
   */
  async ejecutar(operador: Operador, pedido: PedidoDeClienteDesdeDte): Promise<ClienteDesdeDte | null> {
    const nit = Nit.crear(pedido.nit);
    if (nit.esConsumidorFinal()) return null;
    if (!pedido.puedeCrearClientes) throw await this.denegado(operador, nit);
    const identidad = this.identidadDe(pedido);

    return this.dependencias.unidadDeTrabajo.ejecutar(operador, async () => {
      const existente = await this.dependencias.repositorio.buscarPorNit(nit.valor);
      const tercero = existente ?? this.nuevo(operador, identidad, nit);
      if (existente) await this.asegurarPapel(existente);
      else await this.dependencias.repositorio.agregar(tercero);
      const terceroId = tercero.id.valor;
      const { id: clienteId } = await this.dependencias.consultas.obtenerPapel(terceroId, 'cliente');
      return { clienteId, terceroId, creado: !existente, nombre: tercero.nombreParaMostrar };
    });
  }

  /** El rechazo por falta de permiso dice, en `detalles.accion`, si el NIT es nuevo (`crear`) o ya es de un tercero. */
  private async denegado(operador: Operador, nit: Nit): Promise<AccesoDenegado> {
    const existente = await this.dependencias.unidadDeTrabajo.ejecutar(operador, () =>
      this.dependencias.repositorio.buscarPorNit(nit.valor),
    );
    return new AccesoDenegado('No tiene permiso para realizar esta acción.', {
      accion: existente ? 'agregar_papel' : 'crear',
    });
  }

  private identidadDe({ tipoDePersona, nombres, apellidos, razonSocial }: PedidoDeClienteDesdeDte) {
    return IdentidadDeTercero.crear(tipoDePersona, { nombres, apellidos, razonSocial, nombreComercial: null });
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

  /** Si ya es cliente activo no cambia nada; si no tiene el papel, se lo asigna. */
  private async asegurarPapel(tercero: Tercero): Promise<void> {
    const papel = tercero.papel('cliente');
    if (papel && !papel.activo) throw new ClienteInactivo(tercero.nombreParaMostrar);
    if (papel) return;
    tercero.asignarPapel(PAPEL_NUEVO);
    await this.dependencias.repositorio.guardar(tercero);
  }
}
