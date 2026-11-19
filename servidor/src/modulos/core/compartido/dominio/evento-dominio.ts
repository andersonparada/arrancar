import { randomUUID } from 'node:crypto';

/**
 * Algo que ya ocurrió en el negocio y que a otros módulos les puede interesar,
 * por ejemplo "se creó un tercero". Se nombra en pasado y es inmutable.
 *
 * El nombre sigue la forma `<modulo>.<hecho>` y debe coincidir con el que el
 * módulo declara en el catálogo `EventosDominio` del bus.
 *
 * Lleva un `id` propio (es la llave del registro de eventos) y una `version` del
 * contrato de sus datos: quien cambie la forma de los datos sube la versión.
 */
export abstract class EventoDominio<Datos extends object = object> {
  abstract readonly nombre: string;
  readonly id: string = randomUUID();
  readonly version: number = 1;
  readonly ocurridoEn = new Date();

  protected constructor(readonly datos: Readonly<Datos>) {}
}
