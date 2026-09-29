/** Deja correr como máximo `maximo` tareas a la vez; las demás esperan su turno en orden. */
export class Semaforo {
  private libres: number;
  private readonly espera: (() => void)[] = [];

  constructor(maximo: number) {
    this.libres = maximo;
  }

  async ejecutar<Resultado>(tarea: () => Promise<Resultado>): Promise<Resultado> {
    await this.tomar();
    try {
      return await tarea();
    } finally {
      this.soltar();
    }
  }

  private tomar(): Promise<void> {
    if (this.libres > 0) {
      this.libres -= 1;
      return Promise.resolve();
    }
    return new Promise((resolver) => this.espera.push(resolver));
  }

  private soltar(): void {
    const siguiente = this.espera.shift();
    if (siguiente) siguiente();
    else this.libres += 1;
  }
}
