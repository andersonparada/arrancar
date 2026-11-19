import type { CambiosDeMoneda, Moneda } from '../../dominio/moneda.js';

/** La moneda como la entrega la API: con la descripción de su código del Banguat y si ya tiene tipos cargados con él. */
export interface MonedaDto extends Moneda {
  descripcionBanguat: string | null;
  /** Ya hay tipos del Banguat guardados con su código: solo se puede dejar el mismo o quitarlo. */
  tieneSerieDelBanguat: boolean;
}

/** Una moneda que ofrece el Banguat (`core.monedas_del_banguat`). */
export interface MonedaDelBanguatGuardada {
  codigo: number;
  descripcion: string;
  disponible: boolean;
  vistaPorUltimaVez: string;
}

/** El catálogo de monedas de la instalación (`core.monedas`); sin seguridad por empresa. */
export interface CatalogoDeMonedas {
  listar(): Promise<MonedaDto[]>;
  buscar(codigo: string): Promise<MonedaDto | null>;
  /** Corre dentro de la unidad de trabajo del caso de uso. */
  actualizar(codigo: string, cambios: CambiosDeMoneda): Promise<void>;
  /** La moneda que ya tiene ese código del Banguat, si alguna. */
  duenaDelCodigo(codigoBanguat: number): Promise<string | null>;
  /** El código con que se cargaron los tipos del Banguat de la moneda, si ya hay alguno. */
  codigoDeLaSerie(moneda: string): Promise<number | null>;
}

/** La lista de monedas que ofrece el Banguat, copiada en `core.monedas_del_banguat`. */
export interface MonedasDelBanguat {
  listar(): Promise<MonedaDelBanguatGuardada[]>;
  buscar(codigo: number): Promise<MonedaDelBanguatGuardada | null>;
}
