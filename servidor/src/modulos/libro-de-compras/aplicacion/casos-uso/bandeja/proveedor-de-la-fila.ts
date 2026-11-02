import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { DteRecibido } from '../../../dominio/dte-recibido.js';
import { ProveedorNuevoSinConfirmar } from '../../../dominio/errores-de-bandeja.js';
import {
  propuestaDeProveedorNuevo,
  type PropuestaDeProveedorNuevo,
} from '../../../dominio/propuesta-de-proveedor-nuevo.js';
import { ProveedorNuevoSinPermiso } from '../../errores.js';
import type {
  CreadorDeProveedores,
  PedidoDeProveedorNuevo,
  ProveedorDeLaBandeja,
} from '../../puertos/puertos-de-la-bandeja.js';
import type { RepositorioDeDteRecibidos } from '../../puertos/repositorio-de-dte-recibidos.js';
import type { ProveedorNuevoPedido, ProveedoresNuevosPorNit } from './decisiones-del-dte.js';
import type { DecisionesDelDte } from './solicitud-desde-el-dte.js';

/** Lo que la vista previa le cuenta al usuario del proveedor que se crearía (o recibiría el papel) con la fila. */
export interface ProveedorNuevoDeLaFila {
  /** El NIT del emisor tal como viene en la fila. */
  nit: string;
  nombreDelDte: string;
  /** `crear`: no hay tercero con ese NIT. `agregar_papel`: ya hay uno (p. ej. un cliente) y solo se le da el papel. */
  accion: 'crear' | 'agregar_papel';
  /** El nombre del tercero que ya existe (solo con `agregar_papel`). */
  nombreExistente: string | null;
  /** Lo que se usó: lo pedido para ese NIT o, si no vino, la propuesta en su tipo propuesto. */
  usado: ProveedorNuevoPedido;
  /** Las dos formas propuestas, para cambiar de tipo en la ventana sin partir el nombre en el cliente. */
  propuesta: PropuestaDeProveedorNuevo;
}

export interface OpcionesDelProveedorDeLaFila {
  decisiones: Pick<DecisionesDelDte, 'proveedorId'>;
  proveedoresNuevos: ProveedoresNuevosPorNit;
  /** El usuario tiene `proveedores.crear`. */
  puedeCrearProveedores: boolean;
  /** Al confirmar, un proveedor nuevo sin lo confirmado por el usuario es un error; la vista previa usa la propuesta. */
  exigirConfirmado: boolean;
}

export interface ProveedorResuelto {
  proveedorId: string;
  /** `null` si la fila ya tenía proveedor. */
  nuevo: ProveedorNuevoDeLaFila | null;
}

function pedidoAlTercero(nit: string, pedido: ProveedorNuevoPedido, permiso: boolean): PedidoDeProveedorNuevo {
  const base = { nit, puedeCrearProveedores: permiso };
  if (pedido.tipoDePersona === 'juridica') {
    return { ...base, tipoDePersona: 'juridica', nombres: null, apellidos: null, razonSocial: pedido.razonSocial };
  }
  return {
    ...base,
    tipoDePersona: 'individual',
    nombres: pedido.nombres,
    apellidos: pedido.apellidos,
    razonSocial: null,
  };
}

function pedidoPropuesto({ tipoDePersona, individual, juridica }: PropuestaDeProveedorNuevo): ProveedorNuevoPedido {
  return tipoDePersona === 'juridica' ? { tipoDePersona, ...juridica } : { tipoDePersona, ...individual };
}

function descripcionDelProveedorNuevo(
  fila: DteRecibido,
  respuesta: ProveedorDeLaBandeja,
  datos: Pick<ProveedorNuevoDeLaFila, 'usado' | 'propuesta'>,
): ProveedorNuevoDeLaFila {
  const { nitEmisor, nombreEmisor } = fila.instantanea();
  return {
    nit: nitEmisor,
    nombreDelDte: nombreEmisor,
    accion: respuesta.creado ? 'crear' : 'agregar_papel',
    nombreExistente: respuesta.creado ? null : respuesta.nombre,
    ...datos,
  };
}

/**
 * Resuelve el proveedor de una fila de la bandeja: el que ya tiene o, si es nuevo, lo crea con lo que el usuario
 * confirmó (Terceros no duplica el NIT) y se lo pone a todas las filas pendientes del NIT. Corre en la transacción de
 * quien la llama.
 */
export class ProveedorDeLaFila {
  constructor(
    private readonly dependencias: { creadorDeProveedores: CreadorDeProveedores; filas: RepositorioDeDteRecibidos },
  ) {}

  /** @throws ProveedorNuevoSinPermiso, ProveedorNuevoSinConfirmar y los de Terceros (`falta_el_nombre`, `proveedor_inactivo`...). */
  async resolver(
    operador: Operador,
    fila: DteRecibido,
    opciones: OpcionesDelProveedorDeLaFila,
  ): Promise<ProveedorResuelto> {
    const existente = opciones.decisiones.proveedorId;
    if (existente !== null) return { proveedorId: existente, nuevo: null };
    const { nitEmisor, nombreEmisor } = fila.instantanea();
    if (!opciones.puedeCrearProveedores) throw new ProveedorNuevoSinPermiso(nitEmisor);
    const propuesta = propuestaDeProveedorNuevo(nombreEmisor);
    const usado = this.pedidoPara(nitEmisor, propuesta, opciones);
    const respuesta = await this.dependencias.creadorDeProveedores.crear(
      operador,
      pedidoAlTercero(nitEmisor, usado, opciones.puedeCrearProveedores),
    );
    await this.dependencias.filas.asignarProveedorALasPendientes(nitEmisor, respuesta.proveedorId);
    const nuevo = descripcionDelProveedorNuevo(fila, respuesta, { usado, propuesta });
    return { proveedorId: respuesta.proveedorId, nuevo };
  }

  private pedidoPara(nit: string, propuesta: PropuestaDeProveedorNuevo, opciones: OpcionesDelProveedorDeLaFila) {
    const pedido = opciones.proveedoresNuevos[nit];
    if (pedido) return pedido;
    if (opciones.exigirConfirmado) throw new ProveedorNuevoSinConfirmar(nit);
    return pedidoPropuesto(propuesta);
  }
}
