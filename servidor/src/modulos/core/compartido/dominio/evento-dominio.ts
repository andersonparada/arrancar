/**
 * Algo que ya ocurrió en el negocio y que a otros módulos les puede interesar,
 * por ejemplo "se creó un tercero". Se nombra en pasado y es inmutable.
 *
 * El nombre sigue la forma `<modulo>.<hecho>` y debe coincidir con el que el
 * módulo declara en el catálogo `EventosDominio` del bus.
 */
export abstract class EventoDominio<Datos extends object = object> {
  abstract readonly nombre: string;
  readonly ocurridoEn = new Date();

  protected constructor(readonly datos: Readonly<Datos>) {}
}
