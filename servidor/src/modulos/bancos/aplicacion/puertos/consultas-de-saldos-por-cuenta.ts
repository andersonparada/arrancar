import type { CategoriaEnTransito, MesDeConciliacionDto, PartidaEnTransitoDto } from '../dto/saldos-por-cuenta.dto.js';

/** Qué leer: la fecha de corte, el fin del mes anterior al de la fecha (para saber si está atrasada) y, si se quiere, una cuenta. */
export interface FiltroDeLectura {
  fecha: string;
  finDelMesAnterior: string;
  cuentaBancariaId?: string;
}

/** Lo que la base sabe de una cuenta a la fecha; los montos son texto con dos decimales. */
export interface LecturaDeCuenta {
  cuentaBancariaId: string;
  nombre: string;
  bancoNombre: string | null;
  numero: string;
  activo: boolean;
  libros: string;
  posfechados: string;
  /** Movimientos del día a día (no de la carga inicial) hasta el fin del mes anterior al de la fecha. */
  movimientosAnteriores: number;
  ultimaConciliacion: MesDeConciliacionDto | null;
}

/** Lo que suman las partidas en tránsito de una categoría: `efecto` es el neto en libros (créditos menos débitos). */
export interface SumaEnTransito {
  cuentaBancariaId: string;
  categoria: CategoriaEnTransito;
  cantidad: number;
  efecto: string;
}

export interface LecturaDeSaldos {
  cuentas: LecturaDeCuenta[];
  sumas: SumaEnTransito[];
  partidas: PartidaEnTransitoDto[];
}

/** Lectura agregada para «Saldos por cuenta»; se llama dentro de la unidad de trabajo. */
export interface ConsultasDeSaldosPorCuenta {
  /** @throws RecursoNoEncontrado si se pidió una cuenta que no existe o no es de la empresa. */
  leer(filtro: FiltroDeLectura): Promise<LecturaDeSaldos>;
}
