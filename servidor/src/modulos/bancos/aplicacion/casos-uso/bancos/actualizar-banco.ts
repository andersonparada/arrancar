import { auditarCambioDeEstado } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { datosDeBanco } from '../../datos-de-banco.js';
import type { BancoDto, SolicitudDeBanco } from '../../dto/banco.dto.js';
import { bancoExistente, type DependenciasDeBancos } from './dependencias-de-bancos.js';

interface CambioDeBanco {
  bancoId: string;
  solicitud: SolicitudDeBanco;
}

export class ActualizarBanco {
  constructor(private readonly dependencias: DependenciasDeBancos) {}

  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  ejecutar(operador: Operador, { bancoId, solicitud }: CambioDeBanco): Promise<BancoDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const banco = await bancoExistente(repositorio, bancoId);
      const anterior = await consultas.obtener(bancoId);
      banco.cambiarDatos(datosDeBanco(solicitud));
      await repositorio.guardar(banco);
      await auditarCambioDeEstado(this.dependencias.auditoria, {
        recurso: 'bancos.bancos',
        registroId: bancoId,
        anterior,
        activoAntes: anterior.activo,
        activoDespues: solicitud.activo,
      });
      return consultas.obtener(bancoId);
    });
  }
}
