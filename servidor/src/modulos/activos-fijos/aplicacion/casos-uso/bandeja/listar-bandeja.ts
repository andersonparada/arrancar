import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type { BandejaDto, FiltrosDeBandeja, LineaDeBandejaDto } from '../../dto/bandeja.dto.js';
import type { FilaDeBandeja } from '../../puertos/consultas-bandeja.js';
import type { DependenciasDeBandeja } from './dependencias-de-bandeja.js';

interface ReferenciasDeLaEmpresa {
  umbralCentavos: number;
  fechaDeInicio: string | null;
}

/** Pasa la fila de la base a la línea que ve el usuario: pendiente, «bajo el umbral» y «anterior al inicio». */
function lineaDeBandeja(
  { costoCentavos, capitalizadoCentavos, ...fila }: FilaDeBandeja,
  { umbralCentavos, fechaDeInicio }: ReferenciasDeLaEmpresa,
): LineaDeBandejaDto {
  return {
    ...fila,
    costo: deCentavos(costoCentavos),
    capitalizado: deCentavos(capitalizadoCentavos),
    pendiente: deCentavos(costoCentavos - capitalizadoCentavos),
    bajoElUmbral: umbralCentavos > 0 && costoCentavos > 0 && costoCentavos < umbralCentavos,
    anteriorALaFechaDeInicio: fechaDeInicio !== null && fila.fechaEmision < fechaDeInicio,
  };
}

type Lectura = Pick<DependenciasDeBandeja, 'unidadDeTrabajo' | 'bandeja' | 'umbral' | 'cargaInicial'>;

export class ListarBandeja {
  constructor(private readonly dependencias: Lectura) {}

  /**
   * Las líneas del libro con costo por capitalizar: marcadas como activo fijo (o de notas de crédito de facturas ya
   * capitalizadas), de documentos vigentes, sin descarte y con costo pendiente (diseño §6.2).
   */
  ejecutar(operador: Operador, filtros: FiltrosDeBandeja = {}): Promise<BandejaDto> {
    const { unidadDeTrabajo, bandeja, umbral, cargaInicial } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const filas = await bandeja.listar(filtros);
      const umbralCentavos = await umbral.paraEmpresa(operador);
      const { fechaDeInicio } = await cargaInicial.obtener(operador);
      return {
        umbral: umbralCentavos > 0 ? deCentavos(umbralCentavos) : null,
        lineas: filas.map((fila) => lineaDeBandeja(fila, { umbralCentavos, fechaDeInicio })),
      };
    });
  }
}
