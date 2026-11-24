import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import type { MedicionDto } from '../aplicacion/dto/medicion.dto.js';
import type { InmuebleDeParcelaDto, LigaConInmueble, ParcelaDto } from '../aplicacion/dto/parcela.dto.js';
import type {
  AvisoDeBajaDeParcela,
  AvisosDeParcela,
  ConfiguracionDeParcelas,
} from '../aplicacion/puertos/configuracion-y-avisos.js';
import type { ConsultasParcelas } from '../aplicacion/puertos/consultas-parcelas.js';
import type {
  ConsultasMediciones,
  RepositorioMediciones,
  SuperficieVigente,
} from '../aplicacion/puertos/mediciones.js';
import type { LigasDeInmuebles, RepositorioParcelas } from '../aplicacion/puertos/repositorio-parcelas.js';
import type { Medicion, MedicionId } from '../dominio/medicion.js';
import type { Parcela, ParcelaId } from '../dominio/parcela.js';
import { avisosDelPunto } from '../dominio/reglas-de-parcela.js';

/** Guarda las parcelas en memoria y responde tanto de repositorio como de consultas. */
export class ParcelasEnMemoria implements RepositorioParcelas, ConsultasParcelas {
  readonly registros = new Map<string, Parcela>();

  async buscar(id: ParcelaId): Promise<Parcela | null> {
    return this.registros.get(id.valor) ?? null;
  }

  async buscarBloqueando(id: ParcelaId): Promise<Parcela | null> {
    return this.buscar(id);
  }

  async agregar(parcela: Parcela): Promise<void> {
    this.registros.set(parcela.id.valor, parcela);
  }

  async guardar(parcela: Parcela): Promise<void> {
    this.registros.set(parcela.id.valor, parcela);
  }

  async eliminar(parcela: Parcela): Promise<void> {
    this.registros.delete(parcela.id.valor);
  }

  async listar(): Promise<ParcelaDto[]> {
    return [...this.registros.values()].map((parcela) => this.aDto(parcela));
  }

  async obtener(parcelaId: string): Promise<ParcelaDto> {
    const parcela = this.registros.get(parcelaId);
    if (!parcela) throw new RecursoNoEncontrado('La parcela');
    return this.aDto(parcela);
  }

  async contarHijasActivas(parcelaId: string): Promise<number> {
    return this.hijasDe(parcelaId).filter((hija) => hija.instantanea().activo).length;
  }

  async contarHijas(parcelaId: string): Promise<number> {
    return this.hijasDe(parcelaId).length;
  }

  async buscarIdPorCodigo(codigo: string): Promise<string | null> {
    return [...this.registros.values()].find((parcela) => parcela.instantanea().codigo === codigo)?.id.valor ?? null;
  }

  async inmueblesPorNombre(): Promise<Array<{ id: string; nombre: string }>> {
    return [];
  }

  readonly localidadesInactivas = new Set<string>();

  async localidadEstaActiva(localidadId: string): Promise<boolean> {
    return !this.localidadesInactivas.has(localidadId);
  }

  async exigirReferencias(): Promise<void> {}

  private hijasDe(parcelaId: string): Parcela[] {
    return [...this.registros.values()].filter((parcela) => parcela.instantanea().parcelaMadreId === parcelaId);
  }

  private aDto(parcela: Parcela): ParcelaDto {
    const { id, empresaId, ...datos } = parcela.instantanea();
    const madre = datos.parcelaMadreId ? this.registros.get(datos.parcelaMadreId) : undefined;
    return {
      ...datos,
      id: id.valor,
      localidadNombre: 'Finca',
      tipoNombre: 'Potrero',
      parcelaMadreCodigo: madre?.instantanea().codigo ?? null,
      avisos: avisosDelPunto(datos.latitud, datos.longitud),
    };
  }
}

/** Guarda las mediciones en memoria y responde tanto de repositorio como de consultas. */
export class MedicionesEnMemoria implements RepositorioMediciones, ConsultasMediciones {
  readonly registros = new Map<string, Medicion>();

  async buscar(id: MedicionId): Promise<Medicion | null> {
    return this.registros.get(id.valor) ?? null;
  }

  async agregar(medicion: Medicion): Promise<void> {
    this.registros.set(medicion.id.valor, medicion);
  }

  async guardar(medicion: Medicion): Promise<void> {
    this.registros.set(medicion.id.valor, medicion);
  }

  async eliminarAnuladasDe(parcelaId: string): Promise<void> {
    for (const [id, medicion] of this.registros) {
      const { parcelaId: deLaMedicion, estado } = medicion.instantanea();
      if (deLaMedicion === parcelaId && estado === 'anulada') this.registros.delete(id);
    }
  }

  async listar(parcelaId: string): Promise<MedicionDto[]> {
    return this.deLaParcela(parcelaId).map((medicion) => this.aDto(medicion));
  }

  async superficieVigente(parcelaId: string): Promise<SuperficieVigente | null> {
    return this.superficieEnFecha(parcelaId, '9999-12-31');
  }

  async superficieEnFecha(parcelaId: string, fecha: string): Promise<SuperficieVigente | null> {
    const vigentes = this.deLaParcela(parcelaId)
      .map((medicion) => medicion.instantanea())
      .filter(({ estado, vigenteDesde }) => estado === 'vigente' && vigenteDesde <= fecha);
    const ultima = vigentes.sort((a, b) => b.vigenteDesde.localeCompare(a.vigenteDesde))[0];
    return ultima ? { total: ultima.superficieTotalM2, util: ultima.superficieUtilM2 } : null;
  }

  async hayVigentes(parcelaId: string): Promise<boolean> {
    return this.deLaParcela(parcelaId).some((medicion) => medicion.instantanea().estado === 'vigente');
  }

  async obtener(medicionId: string): Promise<MedicionDto> {
    const medicion = this.registros.get(medicionId);
    if (!medicion) throw new RecursoNoEncontrado('La medición');
    return this.aDto(medicion);
  }

  async vigentesPorParcela(): Promise<Map<string, MedicionDto>> {
    return new Map();
  }

  private deLaParcela(parcelaId: string): Medicion[] {
    return [...this.registros.values()].filter((medicion) => medicion.instantanea().parcelaId === parcelaId);
  }

  private aDto(medicion: Medicion): MedicionDto {
    const { id, empresaId, archivoId, anuladaPor, anuladaEn, ...datos } = medicion.instantanea();
    return { ...datos, id: id.valor, anuladaEn: anuladaEn?.toISOString() ?? null };
  }
}

/** Las ligas con inmuebles en memoria (por parcela). */
export class LigasEnMemoria implements LigasDeInmuebles {
  readonly porParcela = new Map<string, LigaConInmueble[]>();

  async listar(parcelaId: string): Promise<InmuebleDeParcelaDto[]> {
    return (this.porParcela.get(parcelaId) ?? []).map((liga) => ({ ...liga, inmuebleNombre: liga.inmuebleId }));
  }

  async nombresPorParcela(): Promise<Map<string, string[]>> {
    return new Map();
  }

  async reemplazar(
    { parcelaId }: { empresaId: string; parcelaId: string },
    ligas: LigaConInmueble[],
  ): Promise<InmuebleDeParcelaDto[]> {
    const nuevos = new Set(ligas.map(({ inmuebleId }) => inmuebleId));
    const quitadas = (await this.listar(parcelaId)).filter(({ inmuebleId }) => !nuevos.has(inmuebleId));
    this.porParcela.set(parcelaId, ligas);
    return quitadas;
  }
}

/** Configuración fija: los factores del INE, tres niveles y cuerdas de 25 varas. */
export class ConfiguracionDeParcelasFija implements ConfiguracionDeParcelas {
  constructor(private readonly niveles = 3) {}

  async factores() {
    return { metrosPorVara: 0.835905, varasCuadradasPorManzana: 10000, varasCuadradasPorCaballeria: 645816 };
  }

  async nivelesMaximos(): Promise<number> {
    return this.niveles;
  }

  async varasPorLadoDeCuerda(): Promise<number> {
    return 25;
  }
}

/** Anota los avisos de baja y, si se le pide, los rechaza como lo haría un módulo de rubro. */
export class AvisosDeParcelaEnMemoria implements AvisosDeParcela {
  readonly recibidos: string[] = [];
  rechazarCon: Error | null = null;

  async porInactivar(_operador: Operador, aviso: AvisoDeBajaDeParcela): Promise<void> {
    this.recibidos.push(`inactivar:${aviso.parcelaId}:${aviso.fecha}`);
    if (this.rechazarCon) throw this.rechazarCon;
  }

  async porEliminar(_operador: Operador, aviso: { parcelaId: string }): Promise<void> {
    this.recibidos.push(`eliminar:${aviso.parcelaId}`);
    if (this.rechazarCon) throw this.rechazarCon;
  }
}
