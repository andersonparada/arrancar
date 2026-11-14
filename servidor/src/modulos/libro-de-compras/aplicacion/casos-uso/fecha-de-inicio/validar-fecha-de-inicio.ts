import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import {
  FacturasAnterioresPosterioresALaFecha,
  NotasRecibidasAntesDeLaFecha,
} from '../../../dominio/errores-de-factura-anterior.js';
import type { NotasPorFechaDeInicio } from '../../puertos/puertos-de-fecha-de-inicio.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  notas: NotasPorFechaDeInicio;
}

/** Lo que trae el aviso `empresas.fecha_de_inicio_por_cambiar`. */
export interface AvisoDeFechaDeInicio {
  empresaId: string;
  /** La fecha nueva, `AAAA-MM-DD`. */
  fechaDeInicio: string;
}

/**
 * Responde al aviso `empresas.fecha_de_inicio_por_cambiar`, que llega dentro de la transacción de Empresas. Una nota
 * vigente sobre una factura del sistema anterior exige que la factura sea anterior a la fecha de inicio y que la nota
 * se haya recibido desde ella: moverla nunca es libre, así que se revisan las dos cosas en los dos sentidos.
 */
export class ValidarFechaDeInicio {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws FacturasAnterioresPosterioresALaFecha si alguna factura anterior quedaría emitida desde la fecha nueva.
   * @throws NotasRecibidasAntesDeLaFecha si alguna nota quedaría recibida antes de la fecha nueva.
   */
  ejecutar(operador: Operador, { empresaId, fechaDeInicio }: AvisoDeFechaDeInicio): Promise<void> {
    const { unidadDeTrabajo, notas } = this.dependencias;
    return unidadDeTrabajo.ejecutar({ ...operador, empresaId }, async () => {
      const facturas = await notas.conFacturaEmitidaDesde(fechaDeInicio);
      if (facturas.cantidad > 0) throw new FacturasAnterioresPosterioresALaFecha(fechaDeInicio, facturas);
      const recibidas = await notas.recibidasAntesDe(fechaDeInicio);
      if (recibidas.cantidad > 0) throw new NotasRecibidasAntesDeLaFecha(fechaDeInicio, recibidas);
    });
  }
}
