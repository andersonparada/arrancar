import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { PagoConLineas } from '../../../dominio/pago-con-lineas.js';
import type { PagoDto } from '../../dto/registro-de-pago.dto.js';
import type { MovimientoCreado } from '../../puertos/puertos-de-pagos.js';
import { saldoDeLaFila } from '../aplicaciones/dependencias-de-aplicaciones.js';
import { datosDelEfectivo, dtoDelPago } from './armado-del-pago.js';
import type { LineaConRetencion } from './avisos-del-pago.js';
import type { DependenciasDeCambiarPagos } from './dependencias-de-pagos.js';

type Dependencias = Pick<
  DependenciasDeCambiarPagos,
  'consultas' | 'consultasDePagos' | 'movimientos' | 'reloj' | 'ajustes'
>;

/** Un pago guardado como lo ve la pantalla, con las líneas de las que sale (cada una con su cargo y su contraseña). */
export interface PagoLeido {
  lineas: LineaConRetencion[];
  dto: PagoDto;
}

/**
 * Arma el `PagoDto` de un pago ya guardado, vigente o anulado: sirve para auditarlo como estaba antes de cambiarlo y para
 * responder cómo quedó. La contraseña de cada línea es la guardada en ella, no la que el cargo tenga hoy.
 */
export class LectorDelPago {
  constructor(private readonly dependencias: Dependencias) {}

  async leer(operador: Operador, pago: PagoConLineas): Promise<PagoLeido> {
    const lineas = await this.lineas(pago);
    const movimiento = await this.movimiento(pago.movimientoId);
    const diferencias = await this.dependencias.ajustes.vigentesDelPago(pago.id);
    const dto = dtoDelPago({
      pagoId: pago.id,
      numero: { numero: pago.numero, anio: pago.anioDeNumero },
      forma: pago.forma,
      observaciones: pago.observaciones,
      motivo: pago.motivo,
      conCargaCerrada: pago.conCargaCerrada,
      ...datosDelEfectivo(pago),
      fecha: pago.fecha,
      hoy: await this.dependencias.reloj.hoy(operador),
      beneficiario: this.beneficiario(lineas, movimiento),
      movimiento: movimiento?.creado ?? null,
      lineas,
      diferencias: diferencias.map(({ documentoId, montoCentavos }) => ({ cargoId: documentoId, montoCentavos })),
      avisos: [],
      estado: pago.estado,
      anulacion: pago.estado === 'anulado' ? { fecha: pago.fechaDeAnulacion!, motivo: pago.motivoDeAnulacion! } : null,
    });
    return { lineas, dto };
  }

  private async lineas(pago: PagoConLineas): Promise<LineaConRetencion[]> {
    const { consultas, consultasDePagos } = this.dependencias;
    const contrasenas = await consultasDePagos.contrasenas(pago.lineas.map(({ contrasenaId }) => contrasenaId));
    const lineas: LineaConRetencion[] = [];
    for (const [indice, linea] of pago.lineas.entries()) {
      const fila = await consultas.buscar(linea.cargoId);
      if (!fila) throw new RecursoNoEncontrado('El documento');
      const contrasena = { id: linea.contrasenaId, numero: contrasenas.get(linea.contrasenaId)?.numero ?? '' };
      lineas.push({ indice, fila, saldoCentavos: saldoDeLaFila(fila), contrasena, ...linea });
    }
    return lineas;
  }

  private async movimiento(movimientoId: string | null) {
    if (movimientoId === null) return null;
    const datos = await this.dependencias.movimientos.datosDe(movimientoId);
    if (!datos) return null;
    const creado: MovimientoCreado = {
      movimientoId,
      cuentaBancariaId: datos.cuentaBancariaId,
      numero: datos.numero,
      avisos: [],
    };
    return { creado, beneficiario: datos.beneficiario };
  }

  /** El del cheque o la nota; sin movimiento propio, el proveedor de los cargos. */
  private beneficiario(
    lineas: readonly LineaConRetencion[],
    movimiento: { beneficiario: string | null } | null,
  ): string {
    return movimiento?.beneficiario ?? lineas[0]!.fila.libro.proveedorNombre;
  }
}
