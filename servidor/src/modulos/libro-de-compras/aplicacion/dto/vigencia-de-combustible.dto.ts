/** Vigencia de combustible tal como lo ve el usuario en pantalla. */
export interface VigenciaDeCombustibleDto {
  id: string;
  combustibleId: string;
  idpPorGalon: string;
  porcentajeDeEtanol: string;
  vigenteDesde: string;
  vigenteHasta: string | null;
  combustibleNombre: string | null;
}

/** Lo que se recibe para registrar o cambiar una vigencia de combustible, ya validado en su forma. */
export type SolicitudDeVigenciaDeCombustible = Omit<VigenciaDeCombustibleDto, 'id' | 'combustibleNombre'>;
