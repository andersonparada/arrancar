import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { armarReporteDeIntereses } from '../../calculo-de-intereses.js';
import type { FiltroDeIntereses, ReporteDeInteresesDto } from '../../dto/intereses.dto.js';
import type { ConsultasDeIntereses } from '../../puertos/consultas-de-intereses.js';

export interface DependenciasDelReporteDeIntereses {
  unidadDeTrabajo: UnidadDeTrabajo;
  consultas: ConsultasDeIntereses;
}

/**
 * Intereses y retenciones (H8): el interés bruto, el ISR retenido y el neto de las notas de intereses del
 * rango, por nota y por cuenta, para la declaración anual. Solo lectura.
 */
export class ReporteDeIntereses {
  constructor(private readonly dependencias: DependenciasDelReporteDeIntereses) {}

  ejecutar(operador: Operador, filtro: FiltroDeIntereses): Promise<ReporteDeInteresesDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      if (filtro.cuentaBancariaId) await consultas.exigirCuenta(filtro.cuentaBancariaId);
      const notas = await consultas.listar(filtro);
      const notasSinDatos = await consultas.contarSinDatos(filtro);
      return armarReporteDeIntereses(notas, { filtro, notasSinDatos });
    });
  }
}
