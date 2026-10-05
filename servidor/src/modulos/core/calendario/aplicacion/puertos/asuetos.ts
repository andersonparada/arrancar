import type { OrigenDeFeriado } from '../../dominio/feriado.js';

/** Un asueto guardado: lo carga soporte cuando la SAT o el gobierno lo declaran. */
export interface AsuetoDto {
  id: string;
  /** `AAAA-MM-DD`. */
  fecha: string;
  nombre: string;
  origen: OrigenDeFeriado;
}

export interface NuevoAsueto {
  fecha: string;
  nombre: string;
}

/** Asuetos de `core.feriados`. Es una tabla nacional, sin seguridad por empresa. */
export interface Asuetos {
  /** Sin unidad de trabajo: la usa también el cálculo de días hábiles. */
  delAnio(anio: number): Promise<AsuetoDto[]>;
  /** Estas tres corren dentro de la unidad de trabajo del caso de uso. */
  buscarPorId(id: string): Promise<AsuetoDto | null>;
  agregar(nuevo: NuevoAsueto): Promise<AsuetoDto>;
  eliminar(id: string): Promise<void>;
}
