import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import type { InmuebleId } from '../../dominio/inmueble.js';
import type { ValorDeInmueble } from '../../dominio/valor-de-inmueble.js';
import type { FuenteDeValor } from '../../dominio/tipos-de-valor-de-inmueble.js';
import type { ValorDeInmuebleDto, ValoresVigentesDeInmueble } from '../dto/valor-de-inmueble.dto.js';

/** Guarda los valores. La seguridad por empresa (RLS) limita lo que se ve. */
export interface RepositorioValoresDeInmueble {
  agregar(valor: ValorDeInmueble): Promise<void>;
  eliminar(valorId: string): Promise<void>;
  /** Si ya hay un valor de esa fuente con esa fecha en el inmueble. */
  existe(datos: { inmuebleId: InmuebleId; fuente: FuenteDeValor; vigenteDesde: string }): Promise<boolean>;
}

/** Lecturas para pantallas: devuelven datos planos. */
export interface ConsultasValoresDeInmueble {
  /** Del más reciente al más antiguo. */
  listar(inmuebleId: string): Promise<ValorDeInmuebleDto[]>;
  /** @throws RecursoNoEncontrado si no existe en ese inmueble. */
  obtener(datos: { inmuebleId: string; valorId: string }): Promise<ValorDeInmuebleDto>;
  /** Por id de inmueble, el valor vigente de cada fuente en `fecha` (`AAAA-MM-DD`). */
  vigentes(fecha: string): Promise<Map<string, ValoresVigentesDeInmueble>>;
}

/** Datos que se avisan a los demás módulos de un valor. */
export interface AvisoDeValorDeInmueble {
  inmuebleId: string;
  valorId: string;
  fuente: FuenteDeValor;
  vigenteDesde: string;
}

/**
 * Avisa a los módulos activos, dentro de la misma transacción, que se registró un valor o que se va a eliminar.
 * El que no acepta la eliminación lanza su error y todo se deshace.
 */
export interface AvisosDeValorDeInmueble {
  registrado(operador: Operador, aviso: AvisoDeValorDeInmueble): Promise<void>;
  porEliminar(operador: Operador, aviso: AvisoDeValorDeInmueble): Promise<void>;
}
