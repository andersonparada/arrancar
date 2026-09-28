import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import type { ChequeraDto, FiltroDeChequeras } from '../aplicacion/dto/chequera.dto.js';
import type { ConsultasChequeras } from '../aplicacion/puertos/consultas-chequeras.js';
import type { RepositorioChequeras } from '../aplicacion/puertos/repositorio-chequeras.js';
import { Chequera, type ChequeraId } from '../dominio/chequera.js';
import type { ChequesEnMemoria } from './dobles-de-cheques.js';

const copia = (chequera: Chequera) => Chequera.reconstruir(chequera.instantanea());

const porCuentaSerieYDesde = (a: ChequeraDto, b: ChequeraDto) =>
  a.cuentaBancariaNombre.localeCompare(b.cuentaBancariaNombre) ||
  (a.serie ?? '').localeCompare(b.serie ?? '') ||
  a.desde - b.desde;

/** Guarda las chequeras en memoria; los conteos por estado los saca del doble de cheques que recibe. */
export class ChequerasEnMemoria implements RepositorioChequeras, ConsultasChequeras {
  private readonly registros = new Map<string, Chequera>();
  /** El nombre de cuenta que usa `listar`; sin registrarlo, se usa el id. */
  private readonly nombresDeCuenta = new Map<string, string>();

  constructor(private readonly cheques: ChequesEnMemoria) {}

  /** Para que `listar` devuelva el nombre real de la cuenta en las pruebas que lo necesiten. */
  nombrarCuenta(cuentaBancariaId: string, nombre: string): void {
    this.nombresDeCuenta.set(cuentaBancariaId, nombre);
  }

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

  /** Todas las chequeras, opcionalmente de una cuenta; por cuenta, serie y desde. */
  async listar({ cuentaBancariaId }: FiltroDeChequeras): Promise<ChequeraDto[]> {
    return [...this.registros.values()]
      .filter((c) => !cuentaBancariaId || c.instantanea().cuentaBancariaId === cuentaBancariaId)
      .map((c) => this.aDto(c))
      .sort(porCuentaSerieYDesde);
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

  /** La serie y la cuenta de una chequera, con su nombre: lo que necesita `ChequesEnMemoria.listarDeLaEmpresa`. */
  datosDe(chequeraId: string): { serie: string | null; cuentaBancariaId: string; cuentaBancariaNombre: string } {
    const chequera = this.registros.get(chequeraId);
    if (!chequera) throw new RecursoNoEncontrado('La chequera');
    const { serie, cuentaBancariaId } = chequera.instantanea();
    return {
      serie,
      cuentaBancariaId,
      cuentaBancariaNombre: this.nombresDeCuenta.get(cuentaBancariaId) ?? cuentaBancariaId,
    };
  }

  private aDto(chequera: Chequera): ChequeraDto {
    const { id, empresaId: _empresaId, ...datos } = chequera.instantanea();
    const propios = [...this.cheques.registros.values()].filter((ch) => ch.instantanea().chequeraId === id.valor);
    const contar = (estado: string) => propios.filter((ch) => ch.instantanea().estado === estado).length;
    return {
      ...datos,
      id: id.valor,
      cuentaBancariaNombre: this.nombresDeCuenta.get(datos.cuentaBancariaId) ?? datos.cuentaBancariaId,
      disponibles: contar('disponible'),
      emitidos: contar('emitido'),
      anulados: contar('anulado'),
    };
  }
}
