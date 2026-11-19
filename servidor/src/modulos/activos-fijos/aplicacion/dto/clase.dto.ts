import type { IncisoFiscal } from '../../dominio/incisos-fiscales.js';

/** Clase de activo tal como lo ve el usuario en pantalla. */
export interface ClaseDto {
  id: string;
  nombre: string;
  incisoFiscal: IncisoFiscal;
  porcentajeFiscal: string;
  vidaUtilContableMeses: number | null;
  valorResidualPorcentaje: string;
  activo: boolean;
}

/** Lo que se recibe para registrar o cambiar una clase de activo, ya validado en su forma. */
export type SolicitudDeClase = Omit<ClaseDto, 'id'>;
