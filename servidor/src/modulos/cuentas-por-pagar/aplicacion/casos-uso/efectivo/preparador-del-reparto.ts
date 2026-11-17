import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { exigirFechaDelPagoEnEfectivo, exigirQueAlcanzaElRetiro } from '../../../dominio/reparto-de-efectivo.js';
import { disponibleDelRetiro, type RetiroDeEfectivo } from '../../../dominio/retiros.js';
import { exigirDiferenciasDelPago, fechaMinimaDeLasLineas, sumaDe } from '../pagos/comunes-del-registro.js';
import type { DependenciasDeEfectivo } from './dependencias-de-efectivo.js';
import { enElPago } from './errores-por-pago.js';
import { EvaluadorDeBancarizacion, type BancarizacionDelPago } from './evaluador-de-bancarizacion.js';
import type { PagoRevisado } from './peticion-de-efectivo.js';

type Dependencias = Pick<
  DependenciasDeEfectivo,
  'topeDeDiferencia' | 'consultasDePagos' | 'consultasDeRetiros' | 'fiscal' | 'umbral'
>;

/** Lo que vale para todos los pagos del reparto. */
export interface ContextoDelReparto {
  retiro: RetiroDeEfectivo;
  hoy: string;
  fechaDeInicio: string | null;
  puedeSinBancarizar: boolean;
}

/** Un pago que pasó todas las revisiones: tiene su fecha y su bancarización resuelta. */
export interface PagoListo {
  pago: PagoRevisado;
  fecha: string;
  bancarizacion: BancarizacionDelPago;
}

/**
 * Todo lo que se revisa del reparto con las filas bloqueadas y antes de guardar nada: que alcance el efectivo del retiro y,
 * en cada pago, su fecha, su diferencia de centavos y la bancarización. Cualquier error sale con el índice de su pago.
 */
export class PreparadorDelReparto {
  private readonly evaluador: EvaluadorDeBancarizacion;

  constructor(private readonly dependencias: Dependencias) {
    this.evaluador = new EvaluadorDeBancarizacion(dependencias);
  }

  /**
   * @throws PagoMayorQueElRetiro, FechaDePagoEnEfectivoInvalida, EfectivoSobreElUmbral, MotivoSinBancarizarObligatorio y las
   * diferencias de centavos.
   */
  async preparar(
    operador: Operador,
    { pagos, contexto }: { pagos: readonly PagoRevisado[]; contexto: ContextoDelReparto },
  ): Promise<PagoListo[]> {
    await this.exigirQueAlcanza(contexto.retiro, pagos);
    const listos: PagoListo[] = [];
    for (const pago of pagos) {
      listos.push(await enElPago(pago.indice, () => this.prepararUno(operador, pago, contexto)));
    }
    return listos;
  }

  private async exigirQueAlcanza(retiro: RetiroDeEfectivo, pagos: readonly PagoRevisado[]): Promise<void> {
    const pagado = await this.dependencias.consultasDeRetiros.repartoDelRetiro(retiro.id);
    exigirQueAlcanzaElRetiro(retiro, {
      disponibleCentavos: disponibleDelRetiro(retiro, pagado.totalCentavos),
      repartoCentavos: pagos.reduce((suma, { lineas }) => suma + sumaDe(lineas), 0),
    });
  }

  private async prepararUno(operador: Operador, pago: PagoRevisado, contexto: ContextoDelReparto): Promise<PagoListo> {
    const { retiro, hoy, fechaDeInicio, puedeSinBancarizar } = contexto;
    const fecha = pago.peticion.fecha ?? hoy;
    const minima = fechaMinimaDeLasLineas(pago.lineas, fechaDeInicio);
    exigirFechaDelPagoEnEfectivo(fecha, { minima, fechaDelRetiro: retiro.fecha, hoy });
    const diferencias = pago.pedidas.diferencias;
    await exigirDiferenciasDelPago(this.dependencias.topeDeDiferencia, operador, { lineas: pago.lineas, diferencias });
    const bancarizacion = await this.evaluador.evaluar(operador, { pago, fecha, fechaDeInicio, puedeSinBancarizar });
    return { pago, fecha, bancarizacion };
  }
}
