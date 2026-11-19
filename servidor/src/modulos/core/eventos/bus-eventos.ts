/**
 * Mapa de eventos de dominio: nombre del evento → datos que transporta.
 * Cada módulo amplía esta interfaz con `declare module` para publicar sus eventos
 * sin que el núcleo conozca a los módulos.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface EventosDominio {}

type NombreEvento = keyof EventosDominio;
type Suscriptor<N extends NombreEvento> = (datos: EventosDominio[N]) => Promise<void> | void;

/** Cómo se informa que un suscriptor falló: el evento, quién era y el error (nunca los datos del evento). */
export type RegistroDeFallosDelBus = (evento: string, suscriptor: string, error: unknown) => void;

const registroPorOmision: RegistroDeFallosDelBus = (evento, suscriptor, error) => {
  const detalle = error instanceof Error ? error.message : String(error);
  process.stderr.write(
    `${JSON.stringify({ nivel: 'error', msg: 'Falló un suscriptor de eventos', evento, suscriptor, detalle })}\n`,
  );
};

/**
 * Publicador/suscriptor (patrón Observer) para que los módulos reaccionen a lo que
 * ocurre en otros sin depender de ellos: si el módulo suscriptor está desactivado
 * o no existe, el publicador sigue funcionando igual.
 */
export class BusEventos {
  private readonly suscriptores = new Map<NombreEvento, Suscriptor<never>[]>();

  constructor(private registro: RegistroDeFallosDelBus = registroPorOmision) {}

  /** Cambia dónde se registran los fallos de los suscriptores (la aplicación lo apunta a su registro). */
  usarRegistro(registro: RegistroDeFallosDelBus): void {
    this.registro = registro;
  }

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

  /**
   * Como `suscribir`, pero un fallo del suscriptor se atrapa y se registra en vez de propagarse: si no, quien publicó
   * (un caso de uso que ya confirmó su transacción) respondería error por algo que ya se guardó, y los demás
   * suscriptores no se enterarían. Todo suscriptor con efectos de negocio (correo, contabilidad) debe usar este.
   * `descripcion` dice quién es, para el registro.
   */
  suscribirSinRomper<N extends NombreEvento>(
    evento: N,
    suscriptor: Suscriptor<N>,
    descripcion = 'suscriptor',
  ): () => void {
    return this.suscribir(evento, async (datos) => {
      try {
        await suscriptor(datos);
      } catch (error) {
        this.registro(evento, descripcion, error);
      }
    });
  }

  /** Notifica a todos los suscriptores en orden y espera a que terminen. */
  async publicar<N extends NombreEvento>(evento: N, datos: EventosDominio[N]): Promise<void> {
    for (const suscriptor of this.suscriptores.get(evento) ?? []) {
      await (suscriptor as Suscriptor<N>)(datos);
    }
  }
}

export const busEventos = new BusEventos();
