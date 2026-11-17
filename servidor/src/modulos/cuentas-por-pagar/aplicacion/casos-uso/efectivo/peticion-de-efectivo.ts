import type { PagoDto } from '../../dto/registro-de-pago.dto.js';
import type { RetiroDto } from '../../dto/retiros.dto.js';
import type { PeticionDeEfectivo } from '../pagos/peticion-de-pago.js';
import type { PedidoEnCentavos } from '../pagos/comunes-del-registro.js';
import type { LineaRevisada } from '../pagos/dependencias-de-pagos.js';

/** Un pago del reparto: lo que se le paga a un proveedor con el efectivo del retiro. El dinero va como texto con dos decimales. */
export interface PagoDelRepartoSolicitado {
  proveedorId: string;
  /** `AAAA-MM-DD`; hoy si falta. Ni futura ni anterior al retiro. */
  fecha?: string;
  /** Quien recibió el efectivo por el proveedor (el que firma el recibo). */
  recibidoPor?: string | null;
  /** El número del recibo del proveedor, si dio uno. */
  referencia?: string | null;
  observaciones?: string | null;
  /** Para pagar en efectivo sobre el umbral de bancarización: pide el permiso `pagos.efectivo-sin-bancarizar`. */
  motivoSinBancarizar?: string | null;
  /** De 1 a 100 cargos autorizados de contraseñas vigentes del proveedor. */
  aplicaciones: Array<{ cargoId: string; monto: string }>;
  diferencias?: Array<{ cargoId: string; monto: string }>;
}

/** Repartir el efectivo de un retiro entre uno o varios proveedores en una sola operación (1 a 20 pagos, todo o nada). */
export interface PeticionDeReparto {
  retiroId: string;
  pagos: PagoDelRepartoSolicitado[];
  /** El usuario tiene `pagos.efectivo-sin-bancarizar`: decide si un bloqueo de bancarización pide motivo o se rechaza. */
  puedeSinBancarizar: boolean;
}

/** Un pago del reparto ya pasado a centavos, con su lugar en la operación. */
export interface PagoPedido {
  indice: number;
  peticion: PeticionDeEfectivo;
  pedidas: PedidoEnCentavos;
}

/** Un pago del reparto con sus cargos ya revisados. */
export interface PagoRevisado extends PagoPedido {
  lineas: LineaRevisada[];
}

/** Lo que responde el reparto: el retiro con su disponible nuevo, los pagos creados (para imprimir los recibos) y los avisos. */
export interface RepartoDto {
  retiro: RetiroDto;
  pagos: PagoDto[];
  avisos: string[];
}
