/** Tipo de parcela tal como lo ve el usuario en pantalla. */
export interface TipoDeParcelaDto {
  id: string;
  nombre: string;
  activo: boolean;
}

/** Lo que se recibe para registrar o cambiar un tipo de parcela, ya validado en su forma. */
export type SolicitudDeTipoDeParcela = Omit<TipoDeParcelaDto, 'id'>;
