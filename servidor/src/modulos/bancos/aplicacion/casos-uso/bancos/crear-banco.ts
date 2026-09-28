import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { Banco } from '../../../dominio/banco.js';
import { datosDeBanco } from '../../datos-de-banco.js';
import type { BancoDto, SolicitudDeBanco } from '../../dto/banco.dto.js';
import type { DependenciasDeBancos } from './dependencias-de-bancos.js';

export class CrearBanco {
  constructor(private readonly dependencias: DependenciasDeBancos) {}

  /**
   * @throws BancoInvalido u otro error de datos si no cumple las reglas del dominio.
   * @throws RecursoDuplicado si repite un dato que debe ser único.
   */
  async ejecutar(operador: Operador, solicitud: SolicitudDeBanco): Promise<BancoDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    const banco = Banco.crear(Identificador.desde(operador.empresaId), datosDeBanco(solicitud));
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await repositorio.agregar(banco);
      return consultas.obtener(banco.id.valor);
    });
  }
}
