import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import type { ValorDeInmuebleDto, ValoresVigentesDeInmueble } from '../aplicacion/dto/valor-de-inmueble.dto.js';
import type {
  AvisoDeValorDeInmueble,
  AvisosDeValorDeInmueble,
  ConsultasValoresDeInmueble,
  RepositorioValoresDeInmueble,
} from '../aplicacion/puertos/valores-de-inmueble.js';
import type { InmuebleId } from '../dominio/inmueble.js';
import type { FuenteDeValor } from '../dominio/tipos-de-valor-de-inmueble.js';
import type { ValorDeInmueble } from '../dominio/valor-de-inmueble.js';

function aDto(valor: ValorDeInmueble): ValorDeInmuebleDto {
  const { id, empresaId, inmuebleId, ...datos } = valor.instantanea();
  return { ...datos, id: id.valor, inmuebleId: inmuebleId.valor, archivoId: null };
}

/** Guarda los valores en memoria y responde tanto de repositorio como de consultas. */
export class ValoresDeInmuebleEnMemoria implements RepositorioValoresDeInmueble, ConsultasValoresDeInmueble {
  private readonly registros = new Map<string, ValorDeInmuebleDto>();

  async agregar(valor: ValorDeInmueble): Promise<void> {
    this.registros.set(valor.id.valor, aDto(valor));
  }

  async eliminar(valorId: string): Promise<void> {
    this.registros.delete(valorId);
  }

  async existe(datos: { inmuebleId: InmuebleId; fuente: FuenteDeValor; vigenteDesde: string }): Promise<boolean> {
    return [...this.registros.values()].some(
      (valor) =>
        valor.inmuebleId === datos.inmuebleId.valor &&
        valor.fuente === datos.fuente &&
        valor.vigenteDesde === datos.vigenteDesde,
    );
  }

  async listar(inmuebleId: string): Promise<ValorDeInmuebleDto[]> {
    return [...this.registros.values()]
      .filter((valor) => valor.inmuebleId === inmuebleId)
      .sort((a, b) => b.vigenteDesde.localeCompare(a.vigenteDesde));
  }

  async obtener({ inmuebleId, valorId }: { inmuebleId: string; valorId: string }): Promise<ValorDeInmuebleDto> {
    const valor = this.registros.get(valorId);
    if (!valor || valor.inmuebleId !== inmuebleId) throw new RecursoNoEncontrado('El valor del inmueble');
    return valor;
  }

  async vigentes(fecha: string): Promise<Map<string, ValoresVigentesDeInmueble>> {
    const vigentes = new Map<string, ValoresVigentesDeInmueble>();
    const hasta = [...this.registros.values()]
      .filter((valor) => valor.vigenteDesde <= fecha)
      .sort((a, b) => a.vigenteDesde.localeCompare(b.vigenteDesde));
    for (const valor of hasta) {
      const actual = vigentes.get(valor.inmuebleId) ?? { matriculaFiscal: null, catastroMunicipal: null };
      if (valor.fuente === 'matricula_fiscal') actual.matriculaFiscal = valor;
      else actual.catastroMunicipal = valor;
      vigentes.set(valor.inmuebleId, actual);
    }
    return vigentes;
  }
}

/** Recuerda los avisos; `rechazarEliminacion` hace de un módulo que no acepta que el valor se elimine. */
export class AvisosDeValorEnMemoria implements AvisosDeValorDeInmueble {
  readonly registrados: AvisoDeValorDeInmueble[] = [];
  readonly porEliminarAvisados: AvisoDeValorDeInmueble[] = [];
  rechazarEliminacion: Error | null = null;

  async registrado(_operador: Operador, aviso: AvisoDeValorDeInmueble): Promise<void> {
    this.registrados.push(aviso);
  }

  async porEliminar(_operador: Operador, aviso: AvisoDeValorDeInmueble): Promise<void> {
    this.porEliminarAvisados.push(aviso);
    if (this.rechazarEliminacion) throw this.rechazarEliminacion;
  }
}
