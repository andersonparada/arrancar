import type { ConsultaDeTipo, TiposDeCambio } from '../tipos-de-cambio.js';

interface Dependencias {
  tiposDeCambio: Pick<TiposDeCambio, 'consultar'>;
}

/** El tipo que rige en una fecha, sin lanzar error: `utilizable` dice si el formulario puede usarlo. */
export class ConsultarTipoVigente {
  constructor(private readonly dependencias: Dependencias) {}

  ejecutar(moneda: string, fecha: string): Promise<ConsultaDeTipo> {
    return this.dependencias.tiposDeCambio.consultar(moneda, fecha);
  }
}
