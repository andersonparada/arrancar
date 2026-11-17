import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { etiquetaDe } from '../../../dominio/documento-por-pagar.js';
import {
  evaluarBancarizacionEnEfectivo,
  type CargoDelPagoEnEfectivo,
} from '../../../dominio/bancarizacion-en-efectivo.js';
import {
  EfectivoSobreElUmbral,
  MotivoSinBancarizarObligatorio,
} from '../../../dominio/errores-de-pagos-en-efectivo.js';
import type { LineaRevisada } from '../pagos/dependencias-de-pagos.js';
import type { DependenciasDeEfectivo } from './dependencias-de-efectivo.js';
import type { PagoRevisado } from './peticion-de-efectivo.js';

type Dependencias = Pick<DependenciasDeEfectivo, 'consultasDePagos' | 'fiscal' | 'umbral'>;

/** Lo que resuelve la bancarización de un pago en efectivo: los avisos, y el motivo si se usó la excepción. */
export interface BancarizacionDelPago {
  avisos: string[];
  /** El motivo de la excepción; `null` si no se usó (el pago está bancarizado, no llega al umbral o no tiene efecto). */
  motivoSinBancarizar: string | null;
}

/** El pago a evaluar, con quién lo evalúa y de cuándo es. */
export interface PagoPorBancarizar {
  pago: PagoRevisado;
  fecha: string;
  fechaDeInicio: string | null;
  /** El usuario tiene `pagos.efectivo-sin-bancarizar`. */
  puedeSinBancarizar: boolean;
}

/**
 * La bancarización de un pago en efectivo (§5.3): suma lo pagado al proveedor en el mes con todas las formas, mira qué
 * perdería la empresa según su régimen y el documento (§5.2) y, si el pago llegó al umbral y la empresa perdería algo, lo
 * rechaza salvo que traiga el motivo de quien tiene el permiso. Sin datos fiscales solo avisa.
 */
export class EvaluadorDeBancarizacion {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws EfectivoSobreElUmbral, MotivoSinBancarizarObligatorio
   */
  async evaluar(operador: Operador, por: PagoPorBancarizar): Promise<BancarizacionDelPago> {
    const { consultasDePagos, umbral } = this.dependencias;
    const { pago, fecha } = por;
    const delMes = await consultasDePagos.pagosDelMes(pago.peticion.proveedorId, fecha);
    const resultado = evaluarBancarizacionEnEfectivo({
      proveedorNombre: pago.lineas[0]!.fila.libro.proveedorNombre,
      fecha,
      umbralCentavos: await umbral.centavos(operador),
      montoDelPagoCentavos: pago.lineas.reduce((suma, { montoCentavos }) => suma + montoCentavos, 0),
      pagadoEnElMesCentavos: delMes.reduce((suma, { montoCentavos }) => suma + montoCentavos, 0),
      cargos: await this.cargos(pago.lineas, por.fechaDeInicio),
    });
    if (resultado.tipo === 'libre') return { avisos: [], motivoSinBancarizar: null };
    if (resultado.tipo === 'avisar') return { avisos: [resultado.mensaje], motivoSinBancarizar: null };
    return { avisos: [resultado.mensaje], motivoSinBancarizar: this.motivo(por, resultado.mensaje) };
  }

  /** El motivo de la excepción; sin él, quien tiene el permiso lo escribe y quien no lo tiene no puede pagar así. */
  private motivo({ pago, puedeSinBancarizar }: PagoPorBancarizar, mensaje: string): string {
    const motivo = pago.peticion.motivoSinBancarizar?.trim();
    if (motivo) return motivo;
    if (puedeSinBancarizar) throw new MotivoSinBancarizarObligatorio(pago.indice);
    throw new EfectivoSobreElUmbral(mensaje, pago.indice);
  }

  private async cargos(
    lineas: readonly LineaRevisada[],
    fechaDeInicio: string | null,
  ): Promise<CargoDelPagoEnEfectivo[]> {
    const efectos = await this.dependencias.fiscal.efectoDe(
      lineas.map(({ fila }) => fila.documento.id),
      fechaDeInicio,
    );
    return lineas.map(({ fila: { documento } }) => ({
      etiqueta: etiquetaDe(documento),
      totalCentavos: documento.totalCentavos,
      efecto: efectos.get(documento.id) ?? null,
      esSaldoInicial: documento.origen === 'saldo_inicial',
    }));
  }
}
