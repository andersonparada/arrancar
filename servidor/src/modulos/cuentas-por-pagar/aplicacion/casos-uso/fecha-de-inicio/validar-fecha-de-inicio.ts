import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { SaldosInicialesPosterioresALaFecha } from '../../../dominio/errores-de-saldos-iniciales.js';
import type { SaldosInicialesPorFecha } from '../../puertos/puertos-de-fecha-de-inicio.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  saldosIniciales: SaldosInicialesPorFecha;
}

/** Lo que trae el aviso `empresas.fecha_de_inicio_por_cambiar`. */
export interface AvisoDeFechaDeInicio {
  empresaId: string;
  /** La fecha nueva, `AAAA-MM-DD`. */
  fechaDeInicio: string;
}

/**
 * Responde al aviso `empresas.fecha_de_inicio_por_cambiar`, que llega dentro de la transacción de Empresas. Un saldo
 * inicial debe haberse emitido antes de la fecha de inicio: si alguno quedaría con emisión igual o posterior a la
 * fecha nueva, lanza el error y Empresas no cambia la fecha. Mover la fecha hacia atrás, o hacia delante sin tocar
 * ninguna emisión, pasa sin más.
 */
export class ValidarFechaDeInicio {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws SaldosInicialesPosterioresALaFecha si algún saldo inicial quedaría emitido desde la fecha nueva. */
  ejecutar(operador: Operador, aviso: AvisoDeFechaDeInicio): Promise<void> {
    const { unidadDeTrabajo, saldosIniciales } = this.dependencias;
    return unidadDeTrabajo.ejecutar({ ...operador, empresaId: aviso.empresaId }, async () => {
      const cantidad = await saldosIniciales.contarEmitidosDesde(aviso.fechaDeInicio);
      if (cantidad > 0) throw new SaldosInicialesPosterioresALaFecha(cantidad);
    });
  }
}
