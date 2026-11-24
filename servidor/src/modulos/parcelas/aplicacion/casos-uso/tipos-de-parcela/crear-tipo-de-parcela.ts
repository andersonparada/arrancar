import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { TipoDeParcela } from '../../../dominio/tipo-de-parcela.js';
import { datosDeTipoDeParcela } from '../../datos-de-tipo-de-parcela.js';
import type { TipoDeParcelaDto, SolicitudDeTipoDeParcela } from '../../dto/tipo-de-parcela.dto.js';
import type { DependenciasDeTiposDeParcela } from './dependencias-de-tipos-de-parcela.js';

export class CrearTipoDeParcela {
  constructor(private readonly dependencias: DependenciasDeTiposDeParcela) {}

  /**
   * @throws TipoDeParcelaInvalido u otro error de datos si no cumple las reglas del dominio.
   * @throws RecursoDuplicado si repite un dato que debe ser único.
   */
  async ejecutar(operador: Operador, solicitud: SolicitudDeTipoDeParcela): Promise<TipoDeParcelaDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    const tipoDeParcela = TipoDeParcela.crear(Identificador.desde(operador.empresaId), datosDeTipoDeParcela(solicitud));
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await repositorio.agregar(tipoDeParcela);
      return consultas.obtener(tipoDeParcela.id.valor);
    });
  }
}
