import { auditarCambioDeEstado } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { datosDeDepartamento } from '../../datos-de-departamento.js';
import type { DepartamentoDto, SolicitudDeDepartamento } from '../../dto/departamento.dto.js';
import { departamentoExistente, type DependenciasDeDepartamentos } from './dependencias-de-departamentos.js';

interface CambioDeDepartamento {
  departamentoId: string;
  solicitud: SolicitudDeDepartamento;
}

export class ActualizarDepartamento {
  constructor(private readonly dependencias: DependenciasDeDepartamentos) {}

  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  ejecutar(operador: Operador, { departamentoId, solicitud }: CambioDeDepartamento): Promise<DepartamentoDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const departamento = await departamentoExistente(repositorio, departamentoId);
      await consultas.exigirReferencias(solicitud);
      const anterior = await consultas.obtener(departamentoId);
      departamento.cambiarDatos(datosDeDepartamento(solicitud));
      await repositorio.guardar(departamento);
      await auditarCambioDeEstado(this.dependencias.auditoria, {
        recurso: 'empresas.departamentos',
        registroId: departamentoId,
        anterior,
        activoAntes: anterior.activo,
        activoDespues: solicitud.activo,
      });
      return consultas.obtener(departamentoId);
    });
  }
}
