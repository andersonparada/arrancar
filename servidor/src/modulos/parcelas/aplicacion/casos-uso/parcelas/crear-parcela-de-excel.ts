import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { ParcelaMadreInexistente } from '../../../dominio/errores-de-parcela.js';
import type { FichaDeParcelaDto } from '../../dto/parcela.dto.js';
import {
  inmueblesPorNombre,
  medicionDeLaFila,
  nombresDeInmuebles,
  type SolicitudDeParcelaEnExcel,
} from '../../parcelas-en-excel.js';
import type { CrearParcela } from './crear-parcela.js';
import type { DependenciasDeParcelas } from './dependencias-de-parcelas.js';

/** Importar una fila: pasa por el mismo caso de uso del formulario, con la madre y los inmuebles buscados por su nombre. */
export class CrearParcelaDeExcel {
  constructor(
    private readonly dependencias: DependenciasDeParcelas,
    private readonly crear: CrearParcela,
  ) {}

  /**
   * @throws ParcelaMadreInexistente si el código de la madre no es de ninguna parcela.
   * @throws ParcelaInvalida si falta la unidad de la superficie o no existe un inmueble.
   */
  ejecutar(operador: Operador, fila: SolicitudDeParcelaEnExcel): Promise<FichaDeParcelaDto> {
    const { unidadDeTrabajo, consultas, configuracion, reloj } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const { parcelaMadreCodigo, inmuebles, ...datos } = fila;
      const parcelaMadreId = parcelaMadreCodigo
        ? await consultas.buscarIdPorCodigo(parcelaMadreCodigo.toUpperCase())
        : null;
      if (parcelaMadreCodigo && !parcelaMadreId) throw new ParcelaMadreInexistente(parcelaMadreCodigo);
      const medicion = medicionDeLaFila(fila, {
        hoy: await reloj.hoy(operador),
        varasPorLadoDeCuerda: await configuracion.varasPorLadoDeCuerda(operador),
      });
      const ids = inmueblesPorNombre(nombresDeInmuebles(inmuebles), await consultas.inmueblesPorNombre());
      const ligas = ids.map((inmuebleId) => ({ inmuebleId, superficieM2: null }));
      return this.crear.ejecutar(operador, { ...datos, parcelaMadreId, medicion, inmuebles: ligas });
    });
  }
}
