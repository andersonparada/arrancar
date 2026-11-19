import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { CargoPorBancarizar } from '../../../../core/contratos/libro-de-compras.contratos.js';
import { etiquetaDe } from '../../../dominio/documento-por-pagar.js';
import {
  EfectivoSobreElUmbral,
  MotivoSinBancarizarObligatorio,
} from '../../../dominio/errores-de-pagos-en-efectivo.js';
import type { LineaRevisada } from '../pagos/dependencias-de-pagos.js';
import type { DependenciasDeEfectivo } from './dependencias-de-efectivo.js';
import type { PagoRevisado } from './peticion-de-efectivo.js';

type Dependencias = Pick<DependenciasDeEfectivo, 'fiscal' | 'bancarizacionDelLibro'>;

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
 * La bancarización de un pago en efectivo (§5.3): le pide al libro que la evalúe (`libro-de-compras.evaluar_bancarizacion`:
 * suma lo pagado al proveedor en el mes por todos los módulos, mira qué perdería la empresa según su régimen y el documento y
 * dice si el pago llega al umbral). Si el libro dice `bloquear`, el pago se rechaza salvo que traiga el motivo de quien tiene
 * el permiso. Sin datos fiscales solo avisa.
 */
export class EvaluadorDeBancarizacion {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws EfectivoSobreElUmbral, MotivoSinBancarizarObligatorio
   */
  async evaluar(operador: Operador, por: PagoPorBancarizar): Promise<BancarizacionDelPago> {
    const { pago, fecha } = por;
    const evaluacion = await this.dependencias.bancarizacionDelLibro.evaluar(operador, {
      proveedorId: pago.peticion.proveedorId,
      proveedorNombre: pago.lineas[0]!.fila.libro.proveedorNombre,
      fecha,
      montoEnEfectivoCentavos: pago.lineas.reduce((suma, { montoCentavos }) => suma + montoCentavos, 0),
      cargos: await this.cargos(pago.lineas, por.fechaDeInicio),
    });
    if (evaluacion.resultado === 'libre') return { avisos: [], motivoSinBancarizar: null };
    const mensaje = evaluacion.mensaje ?? '';
    if (evaluacion.resultado === 'avisar') return { avisos: [mensaje], motivoSinBancarizar: null };
    return { avisos: [mensaje], motivoSinBancarizar: this.motivo(por, mensaje) };
  }

  /** El motivo de la excepción; sin él, quien tiene el permiso lo escribe y quien no lo tiene no puede pagar así. */
  private motivo({ pago, puedeSinBancarizar }: PagoPorBancarizar, mensaje: string): string {
    const motivo = pago.peticion.motivoSinBancarizar?.trim();
    if (motivo) return motivo;
    if (puedeSinBancarizar) throw new MotivoSinBancarizarObligatorio(pago.indice);
    throw new EfectivoSobreElUmbral(mensaje, pago.indice);
  }

  /** Los cargos para el libro: el id de su documento y, en un saldo inicial, lo que pierde según la fecha de inicio. */
  private async cargos(lineas: readonly LineaRevisada[], fechaDeInicio: string | null): Promise<CargoPorBancarizar[]> {
    const delSaldoInicial = lineas.some(({ fila }) => fila.documento.documentoId === null)
      ? await this.efectoDelSaldoInicial(fechaDeInicio)
      : null;
    return lineas.map(({ fila: { documento } }) => ({
      documentoDeCompraId: documento.documentoId,
      etiqueta: etiquetaDe(documento),
      totalCentavos: documento.totalCentavos,
      ...(documento.documentoId === null ? { efectoDeSaldoInicial: delSaldoInicial } : {}),
    }));
  }

  /** Un saldo inicial pierde lo que dice el régimen de la empresa en su fecha de inicio; sin ella no se sabe. */
  private efectoDelSaldoInicial(fechaDeInicio: string | null) {
    return fechaDeInicio === null ? Promise.resolve(null) : this.dependencias.fiscal.efectoDeLaEmpresa(fechaDeInicio);
  }
}
