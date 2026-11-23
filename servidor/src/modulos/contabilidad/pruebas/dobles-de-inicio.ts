import type { CargaInicial, EstadoDeLaCarga } from '../aplicacion/puertos/carga-inicial.js';
import type { BloqueoDelInicio, RepositorioInicios } from '../aplicacion/puertos/repositorio-inicios.js';
import type { InicioContable } from '../dominio/inicio.js';

/** El inicio de la contabilidad de una sola empresa, en memoria. */
export class IniciosEnMemoria implements RepositorioInicios {
  private inicio: InicioContable | null = null;

  async obtener(_bloqueo?: BloqueoDelInicio): Promise<InicioContable | null> {
    return this.inicio;
  }

  async agregar(inicio: InicioContable): Promise<void> {
    this.inicio = inicio;
  }

  async guardar(inicio: InicioContable): Promise<void> {
    this.inicio = inicio;
  }
}

/** La carga inicial de la empresa, con el estado que la prueba le ponga. */
export class CargaInicialFija implements CargaInicial {
  constructor(public estado: EstadoDeLaCarga = { fechaDeInicio: '2026-01-01', cerrada: false }) {}

  async obtener(): Promise<EstadoDeLaCarga> {
    return this.estado;
  }
}
