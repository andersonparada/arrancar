import type { Operador } from '../../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../../core/compartido/dominio/identificador.js';
import { ValorDeInmueble, ValorDeInmuebleRepetido } from '../../../../dominio/valor-de-inmueble.js';
import type { ValorDeInmuebleDto, SolicitudDeValorDeInmueble } from '../../../dto/valor-de-inmueble.dto.js';
import { inmuebleExistente } from '../dependencias-de-inmuebles.js';
import type { DependenciasDeValores } from './dependencias-de-valores.js';

interface NuevoValor {
  inmuebleId: string;
  solicitud: SolicitudDeValorDeInmueble;
}

export class RegistrarValorDeInmueble {
  constructor(private readonly dependencias: DependenciasDeValores) {}

  /**
   * Agrega un valor al histórico del inmueble y avisa a los demás módulos dentro de la misma transacción.
   * @throws RecursoNoEncontrado si el inmueble no existe o el operador no lo ve.
   * @throws ValorDeInmuebleInvalido o CategoriaDeIusiFueraDeMatricula si no cumple las reglas del dominio.
   * @throws ValorDeInmuebleRepetido si ya hay un valor de esa fuente con esa fecha.
   */
  ejecutar(operador: Operador, { inmuebleId, solicitud }: NuevoValor): Promise<ValorDeInmuebleDto> {
    const { unidadDeTrabajo, inmuebles, repositorio, consultas, avisos } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const inmueble = await inmuebleExistente(inmuebles, inmuebleId);
      const valor = ValorDeInmueble.crear(
        { empresaId: Identificador.desde(operador.empresaId), inmuebleId: inmueble.id },
        solicitud,
      );
      if (await repositorio.existe({ inmuebleId: inmueble.id, ...solicitud })) throw new ValorDeInmuebleRepetido();
      await repositorio.agregar(valor);
      await avisos.registrado(operador, {
        inmuebleId,
        valorId: valor.id.valor,
        fuente: solicitud.fuente,
        vigenteDesde: solicitud.vigenteDesde,
      });
      return consultas.obtener({ inmuebleId, valorId: valor.id.valor });
    });
  }
}
