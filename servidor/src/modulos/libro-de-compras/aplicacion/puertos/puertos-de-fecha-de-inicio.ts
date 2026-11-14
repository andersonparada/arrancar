import type { NotasQueEstorban } from '../../dominio/errores-de-factura-anterior.js';

/** Lo que Libro de compras pregunta a sus datos para aceptar una fecha de inicio nueva; solo cuenta notas vigentes. */
export interface NotasPorFechaDeInicio {
  /** Las notas con factura anterior cuya factura tiene emisión igual o posterior a la fecha (`AAAA-MM-DD`). */
  conFacturaEmitidaDesde(fecha: string): Promise<NotasQueEstorban>;
  /** Las notas con factura anterior recibidas antes de la fecha (`AAAA-MM-DD`). */
  recibidasAntesDe(fecha: string): Promise<NotasQueEstorban>;
}
