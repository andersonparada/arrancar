const MILISEGUNDOS_POR_DIA = 86_400_000;

/**
 * Cuánto dura una sesión. Si al usarla ya consumió más de la mitad de su
 * duración, se renueva: así un usuario activo no tiene que volver a entrar.
 */
export class VigenciaDeSesion {
  private readonly duracion: number;

  constructor(duracionEnDias: number) {
    this.duracion = duracionEnDias * MILISEGUNDOS_POR_DIA;
  }

  vencimientoDesde(ahora: Date): Date {
    return new Date(ahora.getTime() + this.duracion);
  }

  debeRenovarse(expiraEn: Date, ahora: Date): boolean {
    return expiraEn.getTime() - ahora.getTime() < this.duracion / 2;
  }
}
