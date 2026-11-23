import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { FichaDeParcelaDto } from '../../dto/parcela.dto.js';
import type { SolicitudDeMedicion } from '../../dto/medicion.dto.js';
import { fichaDeParcela, parcelaExistente, type DependenciasDeParcelas } from '../parcelas/dependencias-de-parcelas.js';
import { registrarMedicionDeParcela } from './medicion-de-parcela.js';

interface RegistroDeMedicion {
  parcelaId: string;
  solicitud: SolicitudDeMedicion;
}

export class RegistrarMedicion {
  constructor(private readonly dependencias: DependenciasDeParcelas) {}

  /**
   * Registra la medición y la copia a la parcela si es la vigente más reciente. Devuelve la ficha ya actualizada.
   * @throws RecursoNoEncontrado si la parcela no existe o el operador no la ve.
   * @throws SuperficieInvalida, UnidadSinVarasDeCuerda o SuperficieUtilMayorQueTotal si la cifra no sirve.
   * @throws RecursoDuplicado si ya hay otra medición vigente con esa fecha.
   */
  ejecutar(operador: Operador, { parcelaId, solicitud }: RegistroDeMedicion): Promise<FichaDeParcelaDto> {
    const { unidadDeTrabajo, repositorio } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const parcela = await parcelaExistente(repositorio, parcelaId);
      await registrarMedicionDeParcela(this.dependencias, operador, { parcela, datos: solicitud });
      return fichaDeParcela(this.dependencias, parcelaId);
    });
  }
}
