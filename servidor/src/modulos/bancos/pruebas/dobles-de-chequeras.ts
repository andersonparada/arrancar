import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import type { ChequeraDto } from '../aplicacion/dto/chequera.dto.js';
import type { ConsultasChequeras } from '../aplicacion/puertos/consultas-chequeras.js';
import type { RepositorioChequeras } from '../aplicacion/puertos/repositorio-chequeras.js';
import { Chequera, type ChequeraId } from '../dominio/chequera.js';
import type { ChequesEnMemoria } from './dobles-de-cheques.js';

const copia = (chequera: Chequera) => Chequera.reconstruir(chequera.instantanea());

/** Guarda las chequeras en memoria; los conteos por estado los saca del doble de cheques que recibe. */
export class ChequerasEnMemoria implements RepositorioChequeras, ConsultasChequeras {
  private readonly registros = new Map<string, Chequera>();

  constructor(private readonly cheques: ChequesEnMemoria) {}

  async buscar(id: ChequeraId): Promise<Chequera | null> {
    const guardada = this.registros.get(id.valor);
    return guardada ? copia(guardada) : null;
  }

  async agregar(chequera: Chequera): Promise<void> {
    this.registros.set(chequera.id.valor, copia(chequera));
  }

  async guardar(chequera: Chequera): Promise<void> {
    this.registros.set(chequera.id.valor, copia(chequera));
  }

  async rangosDeLaCuenta(cuentaBancariaId: string): Promise<{ serie: string | null; desde: number; hasta: number }[]> {
    return [...this.registros.values()]
      .filter((c) => c.instantanea().cuentaBancariaId === cuentaBancariaId)
      .map((c) => {
        const { serie, desde, hasta } = c.instantanea();
        return { serie, desde, hasta };
      });
  }

  async listarDeLaCuenta(cuentaBancariaId: string): Promise<ChequeraDto[]> {
    return [...this.registros.values()]
      .filter((c) => c.instantanea().cuentaBancariaId === cuentaBancariaId)
      .map((c) => this.aDto(c));
  }

  async obtener(chequeraId: string): Promise<ChequeraDto> {
    const chequera = this.registros.get(chequeraId);
    if (!chequera) throw new RecursoNoEncontrado('La chequera');
    return this.aDto(chequera);
  }

  /** Chequeras activas de una cuenta, con su serie: lo que necesita `ChequesEnMemoria.siguienteDisponible`. */
  activasDeLaCuenta(cuentaBancariaId: string): { chequeraId: string; serie: string | null }[] {
    return [...this.registros.values()]
      .filter((c) => c.instantanea().cuentaBancariaId === cuentaBancariaId && c.estaActiva)
      .map((c) => ({ chequeraId: c.id.valor, serie: c.instantanea().serie }));
  }

  private aDto(chequera: Chequera): ChequeraDto {
    const { id, empresaId: _empresaId, ...datos } = chequera.instantanea();
    const propios = [...this.cheques.registros.values()].filter((ch) => ch.instantanea().chequeraId === id.valor);
    const contar = (estado: string) => propios.filter((ch) => ch.instantanea().estado === estado).length;
    return {
      ...datos,
      id: id.valor,
      disponibles: contar('disponible'),
      emitidos: contar('emitido'),
      anulados: contar('anulado'),
    };
  }
}
