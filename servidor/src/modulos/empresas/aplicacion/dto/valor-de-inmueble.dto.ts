import type { DatosDeValorDeInmueble } from '../../dominio/valor-de-inmueble.js';

/** Valor de un inmueble tal como lo ve el usuario en pantalla. */
export interface ValorDeInmuebleDto extends DatosDeValorDeInmueble {
  id: string;
  inmuebleId: string;
  archivoId: string | null;
}

/** Lo que se recibe para registrar un valor, ya validado en su forma. */
export type SolicitudDeValorDeInmueble = DatosDeValorDeInmueble;

/** Los valores vigentes de cada fuente en una fecha, por inmueble: lo que muestran el Excel y los reportes. */
export interface ValoresVigentesDeInmueble {
  matriculaFiscal: ValorDeInmuebleDto | null;
  catastroMunicipal: ValorDeInmuebleDto | null;
}
