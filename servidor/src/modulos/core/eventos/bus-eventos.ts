/**
 * Mapa de eventos de dominio: nombre del evento → datos que transporta.
 * Cada módulo amplía esta interfaz con `declare module` para publicar sus eventos
 * sin que el núcleo conozca a los módulos.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface EventosDominio {}

type NombreEvento = keyof EventosDominio;
type Suscriptor<N extends NombreEvento> = (datos: EventosDominio[N]) => Promise<void> | void;

/**
 * Publicador/suscriptor (patrón Observer) para que los módulos reaccionen a lo que
 * ocurre en otros sin depender de ellos: si el módulo suscriptor está desactivado
 * o no existe, el publicador sigue funcionando igual.
 */
export class BusEventos {
  private readonly suscriptores = new Map<NombreEvento, Suscriptor<never>[]>();

  /** Registra un suscriptor y devuelve la función que lo da de baja. */
  suscribir<N extends NombreEvento>(evento: N, suscriptor: Suscriptor<N>): () => void {
    const lista = this.suscriptores.get(evento) ?? [];
    lista.push(suscriptor as Suscriptor<never>);
    this.suscriptores.set(evento, lista);
    return () => {
      const actual = this.suscriptores.get(evento) ?? [];
      this.suscriptores.set(
        evento,
        actual.filter((s) => s !== suscriptor),
      );
    };
  }

  /** Notifica a todos los suscriptores en orden y espera a que terminen. */
  async publicar<N extends NombreEvento>(evento: N, datos: EventosDominio[N]): Promise<void> {
    for (const suscriptor of this.suscriptores.get(evento) ?? []) {
      await (suscriptor as Suscriptor<N>)(datos);
    }
  }
}

export const busEventos = new BusEventos();
