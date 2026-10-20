import type { HojaSimple } from '../../../../core/intercambio/aplicacion/puertos/libro-de-excel.js';
import type { RangoDePeriodos } from '../../../dominio/analisis/rango-de-periodos.js';
import type { ConsultasDeAnalisis } from '../../puertos/consultas-de-analisis.js';

/** Lo que se le pide a un análisis. */
export interface SolicitudDeAnalisis {
  desde: string;
  hasta: string;
  /** Solo lo usa «compras por proveedor»; los demás análisis lo ignoran. */
  incluirFueraDelLibro: boolean;
}

/** Con qué se arma un análisis: las consultas, la empresa activa y el rango ya validado. */
export interface ContextoDeAnalisis {
  consultas: ConsultasDeAnalisis;
  empresaId: string;
  rango: RangoDePeriodos;
  incluirFueraDelLibro: boolean;
}

/**
 * Un análisis de compras: cómo se arma, cómo se responde y cómo se escribe en Excel. Los casos de uso
 * `ConsultarAnalisis` y `ExportarAnalisis` sirven a los cinco con esta misma forma (patrón Estrategia).
 */
export interface DefinicionDeAnalisis<Armado, Dto> {
  /** La ruta (`compras-por-proveedor`) y la base del nombre del archivo. */
  clave: string;
  armar(contexto: ContextoDeAnalisis): Promise<Armado>;
  dto(armado: Armado): Dto;
  hoja(armado: Armado): HojaSimple;
}
