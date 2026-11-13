import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import {
  exigirNotaQueSeAplica,
  fechaMinimaDeAplicacion,
  proponerReparto,
  superaElUmbralDeBancarizacion,
} from '../../../dominio/aplicacion-manual.js';
import type { CargoParaAplicarDto, CargosParaAplicarDto } from '../../dto/cargos-para-aplicar.dto.js';
import type { FilaDeDocumento } from '../../puertos/puertos-de-consultas.js';
import { filaExistente, saldoDeLaFila, type DependenciasParaListarCargos } from './dependencias-de-aplicaciones.js';

type CargoConFila = {
  id: string;
  saldoCentavos: number;
  autorizado: boolean;
  vencimiento: string | null;
  fechaEmision: string;
  fila: FilaDeDocumento;
};

/**
 * Los cargos del proveedor que una nota de crédito puede rebajar, en el orden en que se ofrecen, con el monto que se
 * propone aplicar a cada uno (primero los autorizados, luego por vencimiento), si superan el umbral de bancarización y
 * desde qué fecha puede aplicarse la nota. Solo lee: no bloquea nada.
 */
export class ListarCargosParaAplicar {
  constructor(private readonly dependencias: DependenciasParaListarCargos) {}

  /**
   * @throws RecursoNoEncontrado si la nota no existe o es de otra empresa.
   * @throws NoEsNotaConSaldo si no es una nota de crédito vigente.
   */
  ejecutar(operador: Operador, notaId: string): Promise<CargosParaAplicarDto> {
    const { unidadDeTrabajo, consultas, umbral } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const nota = await filaExistente(consultas, notaId);
      exigirNotaQueSeAplica(nota.documento);
      const saldoLibre = saldoDeLaFila(nota);
      const umbralCentavos = await umbral.centavos(operador);
      const cargos = (await consultas.cargosConSaldoDe(nota.documento.proveedorId)).map(comoCargoOrdenable);
      return {
        saldoLibre: deCentavos(Math.max(saldoLibre, 0)),
        fechaMinima: await this.fechaMinima(operador, nota),
        cargos: proponerReparto(saldoLibre, cargos).map(({ cargo, propuestoCentavos }) =>
          dtoDeCargo(cargo.fila, propuestoCentavos, umbralCentavos),
        ),
      };
    });
  }

  /** La recepción de la nota, o la fecha de inicio de la empresa si es un saldo inicial. */
  private async fechaMinima(operador: Operador, { documento }: FilaDeDocumento): Promise<string | null> {
    const { cargaInicial, fechasDeEntrada } = this.dependencias;
    const recepcion = (await fechasDeEntrada.deDocumentos([documento.id])).get(documento.id) ?? null;
    const fechaDeInicio = recepcion === null ? (await cargaInicial.obtener(operador)).fechaDeInicio : null;
    return fechaMinimaDeAplicacion({ recepciones: [recepcion], fechaDeInicio });
  }
}

function comoCargoOrdenable(fila: FilaDeDocumento): CargoConFila {
  const { documento } = fila;
  return {
    id: documento.id,
    saldoCentavos: saldoDeLaFila(fila),
    autorizado: documento.estado === 'autorizado',
    vencimiento: documento.vencimiento,
    fechaEmision: documento.fechaEmision,
    fila,
  };
}

function dtoDeCargo(fila: FilaDeDocumento, propuestoCentavos: number, umbralCentavos: number): CargoParaAplicarDto {
  const { documento, libro } = fila;
  return {
    id: documento.id,
    tipo: documento.tipo,
    serie: documento.serie,
    numero: documento.numero,
    fechaEmision: documento.fechaEmision,
    fechaRecepcion: libro.fechaRecepcion,
    vencimiento: documento.vencimiento,
    estado: documento.estado,
    total: deCentavos(documento.totalCentavos),
    saldo: deCentavos(saldoDeLaFila(fila)),
    propuesto: deCentavos(propuestoCentavos),
    origen: documento.origen,
    sobreUmbralDeBancarizacion: superaElUmbralDeBancarizacion(documento.totalCentavos, umbralCentavos),
  };
}
