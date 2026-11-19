import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { deCentavosEnteros } from '../../../dominio/decimales.js';
import type { FiltrosDePorRecibir, LineaPorRecibirDto, PorRecibirDto } from '../../dto/por-recibir.dto.js';
import type { FilaPorRecibir } from '../../puertos/consultas-por-recibir.js';
import type { DependenciasDeRecepciones } from './dependencias-de-recepciones.js';

/** Pasa la fila de la base a la línea que ve el usuario: pendiente y «anterior al inicio». */
function lineaPorRecibir(
  { costoCentavos, recibidoCentavos, ...fila }: FilaPorRecibir,
  fechaDeInicio: string | null,
): LineaPorRecibirDto {
  return {
    ...fila,
    costo: deCentavosEnteros(costoCentavos),
    recibido: deCentavosEnteros(recibidoCentavos),
    pendiente: deCentavosEnteros(costoCentavos - recibidoCentavos),
    anteriorALaFechaDeInicio: fechaDeInicio !== null && fila.fechaEmision < fechaDeInicio,
  };
}

type Lectura = Pick<DependenciasDeRecepciones, 'unidadDeTrabajo' | 'porRecibir' | 'cargaInicial'>;

export class ListarPorRecibir {
  constructor(private readonly dependencias: Lectura) {}

  /**
   * Las líneas del libro con algo por recibir (§6.3): marcadas como inventario de documentos vigentes, sin descarte y
   * con costo pendiente, y las notas de crédito de facturas con recepciones vigentes (para devolver o rebajar). Las de
   * documentos anteriores a la fecha de inicio de la empresa se marcan: si ya estaban en el saldo inicial, se descartan.
   */
  ejecutar(operador: Operador, filtros: FiltrosDePorRecibir = {}): Promise<PorRecibirDto> {
    const { unidadDeTrabajo, porRecibir, cargaInicial } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const filas = await porRecibir.listar(filtros);
      const { fechaDeInicio } = await cargaInicial.obtener(operador);
      return { lineas: filas.map((fila) => lineaPorRecibir(fila, fechaDeInicio)) };
    });
  }
}
