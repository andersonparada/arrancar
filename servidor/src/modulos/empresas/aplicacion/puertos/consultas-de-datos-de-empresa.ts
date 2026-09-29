import type { CargaInicialDto, DatosDeIdentificacionDto, DatosFiscalesDto } from '../dto/datos-de-empresa.dto.js';

/** Lecturas para pantallas y para otros módulos: datos planos, sin reconstruir entidades. */
export interface ConsultasDeDatosDeEmpresa {
  datosFiscales(empresaId: string): Promise<DatosFiscalesDto>;
  cargaInicial(empresaId: string): Promise<CargaInicialDto>;
  /**
   * La carga inicial, tomando un bloqueo compartido: quien la lee para registrar saldos iniciales
   * hace esperar a quien intente cerrarla hasta que termine su transacción.
   */
  cargaInicialBloqueandoElCierre(empresaId: string): Promise<CargaInicialDto>;
  /** @throws RecursoNoEncontrado si la empresa no existe. */
  datosDeIdentificacion(empresaId: string): Promise<DatosDeIdentificacionDto>;
}
