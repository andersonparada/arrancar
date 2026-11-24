import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { LocalidadInactiva } from '../../../dominio/errores-de-parcela.js';
import { Parcela } from '../../../dominio/parcela.js';
import { datosDeParcela, inmueblesDe } from '../../datos-de-parcela.js';
import type { FichaDeParcelaDto, SolicitudDeParcela } from '../../dto/parcela.dto.js';
import { registrarMedicionDeParcela } from '../mediciones/medicion-de-parcela.js';
import { fichaDeParcela, parcelaExistente, type DependenciasDeParcelas } from './dependencias-de-parcelas.js';

export class CrearParcela {
  constructor(private readonly dependencias: DependenciasDeParcelas) {}

  /**
   * Crea la parcela con sus inmuebles y, si ya se conoce, su primera medición, todo en la misma transacción.
   * @throws RecursoNoEncontrado si la localidad, la madre, el tipo o un inmueble no existen o son ajenos.
   * @throws LocalidadInactiva, ParcelaInvalida, MadreInactiva, ParcelaDeOtraLocalidad o NivelMaximoDeParcelas si no cumple las reglas.
   * @throws RecursoDuplicado si repite el código o el nombre.
   */
  ejecutar(operador: Operador, solicitud: SolicitudDeParcela): Promise<FichaDeParcelaDto> {
    const { unidadDeTrabajo, repositorio, ligas, configuracion } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await this.exigirReferencias(solicitud);
      const madre = solicitud.parcelaMadreId
        ? await parcelaExistente(repositorio, solicitud.parcelaMadreId, 'La parcela madre')
        : null;
      const parcela = Parcela.crear(Identificador.desde(operador.empresaId), datosDeParcela(solicitud), {
        localidadId: solicitud.localidadId,
        madre,
        nivelesMaximos: await configuracion.nivelesMaximos(operador),
      });
      await repositorio.agregar(parcela);
      const destino = { empresaId: operador.empresaId, parcelaId: parcela.id.valor };
      await ligas.reemplazar(destino, solicitud.inmuebles);
      if (solicitud.medicion) {
        await registrarMedicionDeParcela(this.dependencias, operador, { parcela, datos: solicitud.medicion });
      }
      return fichaDeParcela(this.dependencias, parcela.id.valor);
    });
  }

  private async exigirReferencias(solicitud: SolicitudDeParcela): Promise<void> {
    const { consultas } = this.dependencias;
    await consultas.exigirReferencias({
      localidadId: solicitud.localidadId,
      tipoId: solicitud.tipoId,
      inmuebleIds: inmueblesDe(solicitud),
    });
    if (!(await consultas.localidadEstaActiva(solicitud.localidadId))) throw new LocalidadInactiva();
  }
}
