import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { ProveedorNoDisponible } from '../../../dominio/errores-de-saldos-iniciales.js';
import { proponerVencimiento } from '../../../dominio/propuesta-de-vencimiento.js';
import { prepararSaldoInicial, type DatosDeSaldoInicial } from '../../../dominio/saldo-inicial.js';
import { claseDe } from '../../../dominio/tipos-de-documento.js';
import { datosDeSolicitud } from '../../dto/dto-de-saldo-inicial.js';
import type { SolicitudDeSaldoInicial } from '../../dto/saldo-inicial.dto.js';
import type { CondicionesDeProveedores, PlazoPorOmision } from '../../puertos/puertos-de-documentos.js';
import type { ProveedoresParaSaldos, SaldoInicialAGuardar } from '../../puertos/puertos-de-saldos-iniciales.js';

interface Dependencias {
  proveedores: ProveedoresParaSaldos;
  condiciones: CondicionesDeProveedores;
  plazo: PlazoPorOmision;
}

/**
 * Las validaciones de §5 que comparten cargar y corregir: la emisión, los montos, el proveedor y el vencimiento. Un
 * cargo sin vencimiento recibe la propuesta de siempre, contada desde la emisión (no hay recepción).
 */
export class PreparadorDeSaldoInicial {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws los errores de dominio de los datos, ProveedorNoDisponible y VencimientoInvalido.
   */
  async preparar(
    operador: Operador,
    solicitud: SolicitudDeSaldoInicial,
    fechaDeInicio: string,
  ): Promise<SaldoInicialAGuardar> {
    const datos = prepararSaldoInicial(datosDeSolicitud(solicitud), fechaDeInicio);
    if (!(await this.dependencias.proveedores.estaDisponible(datos.proveedorId))) throw new ProveedorNoDisponible();
    return { ...datos, vencimiento: await this.vencimientoDe(operador, datos) };
  }

  private async vencimientoDe(operador: Operador, datos: DatosDeSaldoInicial): Promise<string | null> {
    if (datos.vencimiento !== null || claseDe(datos.tipo) === 'abono') return datos.vencimiento;
    const { condiciones, plazo } = this.dependencias;
    const { diasDeCredito } = await condiciones.deProveedor(datos.proveedorId);
    return proponerVencimiento({
      fechaBase: datos.fechaEmision,
      diasDeCredito,
      mesesPorOmision: await plazo.meses(operador),
    });
  }
}
