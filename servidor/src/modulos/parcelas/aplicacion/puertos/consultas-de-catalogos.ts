import type { OpcionDeCatalogoDto } from '../dto/catalogos.dto.js';

/** Lecturas de Empresas que Parcelas ofrece a sus pantallas; corren dentro de la unidad de trabajo. */
export interface ConsultasDeCatalogos {
  /** Localidades activas que el operador ve, por nombre. */
  localidades(): Promise<OpcionDeCatalogoDto[]>;
  /** Inmuebles activos de la empresa, por nombre. */
  inmuebles(): Promise<OpcionDeCatalogoDto[]>;
}
