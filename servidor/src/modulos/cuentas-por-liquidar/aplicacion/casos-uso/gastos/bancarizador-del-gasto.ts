import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { totalPagadoDelGasto, type Gasto } from '../../../dominio/gastos.js';
import { etiquetaDelDocumento } from '../../../dominio/reglas-del-gasto.js';
import type { DatosDelDocumentoDelLibro } from '../../puertos/puertos-de-gastos.js';
import type { DependenciasDeGastos } from './dependencias-de-gastos.js';

/** Lo que resuelve la bancarización de un gasto: los avisos y si queda marcado «sin bancarizar». */
export interface BancarizacionDelGasto {
  avisos: string[];
  sinBancarizar: boolean;
}

export interface GastoPorBancarizar {
  gasto: Gasto;
  documento: DatosDelDocumentoDelLibro;
  /** La fecha con que se asigna: fija el mes. */
  fecha: string;
}

/**
 * La bancarización de lo gastado con un anticipo (CC-h = A): el dinero ya salió en efectivo, así que nunca bloquea. Le pide al
 * libro que evalúe el pago con lo pagado al proveedor en el mes por todos los módulos; con `bloquear` marca el gasto
 * `sin_bancarizar` y avisa; con `avisar`, solo avisa. Las notas de crédito no son pagos y no se evalúan. Lo que se paga es el
 * neto más la retención.
 */
export class BancarizadorDelGasto {
  constructor(private readonly dependencias: Pick<DependenciasDeGastos, 'bancarizacion'>) {}

  async evaluar(operador: Operador, { gasto, documento, fecha }: GastoPorBancarizar): Promise<BancarizacionDelGasto> {
    if (gasto.resta || gasto.proveedorId === null) return { avisos: [], sinBancarizar: false };
    const totalCentavos = totalPagadoDelGasto(gasto);
    const evaluacion = await this.dependencias.bancarizacion.evaluar(operador, {
      proveedorId: gasto.proveedorId,
      proveedorNombre: documento.proveedorNombre,
      fecha,
      montoEnEfectivoCentavos: totalCentavos,
      cargos: [
        { documentoDeCompraId: gasto.documentoDeCompraId, etiqueta: etiquetaDelDocumento(documento), totalCentavos },
      ],
    });
    return {
      avisos: evaluacion.mensaje === null ? [] : [evaluacion.mensaje],
      sinBancarizar: evaluacion.resultado === 'bloquear',
    };
  }
}
