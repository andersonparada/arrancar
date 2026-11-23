import type { Traslado } from '../../dominio/traslado.js';

/** Una fila vigente del historial de ubicación (también la del alta): dónde estuvo el activo desde esa fecha. */
export interface UbicacionRegistrada {
  trasladoId: string;
  fecha: string;
  localidadId: string | null;
  departamentoId: string | null;
  responsable: string | null;
  aBodega: boolean;
}

/** Guarda y recupera los traslados. La seguridad por empresa (RLS) limita lo que se ve. */
export interface RepositorioTraslados {
  agregarVarios(traslados: readonly Traslado[]): Promise<void>;
  /** Los renglones de una boleta (vigentes o anulados); vacío si el grupo no existe. */
  delGrupo(grupoId: string): Promise<Traslado[]>;
  /**
   * Como `delGrupo`, pero con `FOR SHARE`: espera a quien esté anulando la boleta y no deja anularla hasta cerrar la
   * transacción. Para guardar algo que solo vale en una boleta vigente.
   */
  delGrupoBloqueando(grupoId: string): Promise<Traslado[]>;
  /** Guarda el cambio de un traslado (anularlo). */
  guardar(traslado: Traslado): Promise<void>;
  /** Las últimas filas vigentes del activo, la más reciente primero, por `(fecha, creado_en)`; la del alta cuenta. */
  recientesDeActivo(activoId: string, cantidad: number): Promise<UbicacionRegistrada[]>;
}
