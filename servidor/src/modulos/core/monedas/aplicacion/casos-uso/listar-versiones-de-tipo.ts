import type { TipoDeCambioDto, TiposDeCambioGuardados } from '../puertos/tipos-de-cambio-guardados.js';

interface Dependencias {
  guardados: Pick<TiposDeCambioGuardados, 'versiones'>;
}

/** Todas las versiones de un día, de la más nueva a la más vieja (lo que soporte revisa antes de corregir). */
export class ListarVersionesDeTipo {
  constructor(private readonly dependencias: Dependencias) {}

  ejecutar(moneda: string, fecha: string): Promise<TipoDeCambioDto[]> {
    return this.dependencias.guardados.versiones(moneda, fecha);
  }
}
