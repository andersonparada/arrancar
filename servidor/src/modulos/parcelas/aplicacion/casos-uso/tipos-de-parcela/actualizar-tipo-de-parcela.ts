import { auditarCambioDeEstado } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { datosDeTipoDeParcela } from '../../datos-de-tipo-de-parcela.js';
import type { TipoDeParcelaDto, SolicitudDeTipoDeParcela } from '../../dto/tipo-de-parcela.dto.js';
import { tipoDeParcelaExistente, type DependenciasDeTiposDeParcela } from './dependencias-de-tipos-de-parcela.js';

interface CambioDeTipoDeParcela {
  tipoDeParcelaId: string;
  solicitud: SolicitudDeTipoDeParcela;
}

export class ActualizarTipoDeParcela {
  constructor(private readonly dependencias: DependenciasDeTiposDeParcela) {}

  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  ejecutar(operador: Operador, { tipoDeParcelaId, solicitud }: CambioDeTipoDeParcela): Promise<TipoDeParcelaDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const tipoDeParcela = await tipoDeParcelaExistente(repositorio, tipoDeParcelaId);
      const anterior = await consultas.obtener(tipoDeParcelaId);
      tipoDeParcela.cambiarDatos(datosDeTipoDeParcela(solicitud));
      await repositorio.guardar(tipoDeParcela);
      await auditarCambioDeEstado(this.dependencias.auditoria, {
        recurso: 'parcelas.tipos-de-parcela',
        registroId: tipoDeParcelaId,
        anterior,
        activoAntes: anterior.activo,
        activoDespues: solicitud.activo,
      });
      return consultas.obtener(tipoDeParcelaId);
    });
  }
}
