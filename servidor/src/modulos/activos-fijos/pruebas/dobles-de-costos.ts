import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import { deCentavos } from '../../core/compartido/dominio/centavos.js';
import type { CostoDto, CostosDeActivoDto } from '../aplicacion/dto/costo.dto.js';
import type { ConsultasCostos } from '../aplicacion/puertos/consultas-costos.js';
import type { LineaConReferencia, LineasDelLibro } from '../aplicacion/puertos/lineas-del-libro.js';
import type { LectorDeUmbral } from '../aplicacion/puertos/lector-de-umbral.js';
import type {
  DescarteDeLinea,
  NuevoDescarte,
  RepositorioDescartes,
} from '../aplicacion/puertos/repositorio-descartes.js';
import type { RepositorioCostos } from '../aplicacion/puertos/repositorio-costos.js';
import type { Costo, CostoId } from '../dominio/costo.js';
import type { ActivosEnMemoria } from './dobles-de-activos.js';

function aDto(costo: Costo): CostoDto {
  const c = costo.instantanea();
  return {
    id: c.id.valor,
    activoId: c.activoId,
    origen: c.origen,
    claseDeCosto: c.claseDeCosto,
    documentoDeCompraId: c.documentoDeCompraId,
    lineaDeDocumentoId: c.lineaDeDocumentoId,
    mejoraId: c.mejoraId,
    documento: null,
    proveedorNombre: null,
    fecha: c.fecha,
    monto: deCentavos(c.montoCentavos),
    aplicaAlLibroFiscal: c.aplicaAlLibroFiscal,
    motivoFueraDelLibroFiscal: c.motivoFueraDelLibroFiscal,
    noEsEdificacion: c.noEsEdificacion,
    documentoDeSoporte: c.documentoDeSoporte,
    descripcion: c.descripcion,
    estado: c.estado,
    anuladoEn: c.anuladoEn?.toISOString() ?? null,
    motivoDeAnulacion: c.motivoDeAnulacion,
  };
}

/** Guarda los costos en memoria y responde tanto de repositorio como de consultas. */
export class CostosEnMemoria implements RepositorioCostos, ConsultasCostos {
  readonly registros = new Map<string, Costo>();
  /** Las líneas que se bloquearon, en el orden en que se pidió. */
  readonly lineasBloqueadas: string[] = [];

  constructor(private readonly activos: ActivosEnMemoria) {}

  async agregarVarios(costos: readonly Costo[]): Promise<void> {
    for (const costo of costos) this.registros.set(costo.id.valor, costo);
  }

  async buscar(id: CostoId): Promise<Costo | null> {
    return this.registros.get(id.valor) ?? null;
  }

  async guardar(costo: Costo): Promise<void> {
    this.registros.set(costo.id.valor, costo);
  }

  async bloquearLineas(lineaIds: readonly string[]): Promise<void> {
    this.lineasBloqueadas.push(...[...new Set(lineaIds)].sort());
  }

  async totalesVigentes(activoIds: readonly string[]): Promise<Map<string, number>> {
    const totales = new Map<string, number>(activoIds.map((id) => [id, 0]));
    for (const costo of this.vigentes()) {
      const { activoId, montoCentavos } = costo.instantanea();
      if (totales.has(activoId)) totales.set(activoId, totales.get(activoId)! + montoCentavos);
    }
    return totales;
  }

  async vigentesDeActivo(activoId: string): Promise<Costo[]> {
    return this.vigentes().filter((costo) => costo.instantanea().activoId === activoId);
  }

  async vigentesDeMejora(mejoraId: string): Promise<Costo[]> {
    return this.vigentes().filter((costo) => costo.instantanea().mejoraId === mejoraId);
  }

  async vigentesDeDivision(divisionId: string): Promise<Costo[]> {
    return this.vigentes().filter((costo) => costo.instantanea().divisionId === divisionId);
  }

  /** En memoria no hay divisiones: ningún costo es anterior a una. */
  async esAnteriorAUnaDivisionVigente(_costoId: string): Promise<boolean> {
    return false;
  }

  async codigosDeActivosConCostosDelDocumento(documentoId: string): Promise<string[]> {
    const activoIds = new Set(
      this.vigentes()
        .filter((costo) => costo.instantanea().documentoDeCompraId === documentoId)
        .map((costo) => costo.instantanea().activoId),
    );
    return [...activoIds].map((id) => this.activos.registros.get(id)!.instantanea().codigo).sort();
  }

  capitalizadoDeLinea(lineaId: string): number {
    return this.vigentes()
      .filter((costo) => costo.instantanea().lineaDeDocumentoId === lineaId)
      .reduce((suma, costo) => suma + costo.instantanea().montoCentavos, 0);
  }

  async deActivo(activoId: string): Promise<CostosDeActivoDto> {
    const suyos = [...this.registros.values()].filter((costo) => costo.instantanea().activoId === activoId);
    const total = suyos
      .filter((c) => c.instantanea().estado === 'vigente')
      .reduce((suma, c) => suma + c.instantanea().montoCentavos, 0);
    return { costos: suyos.map(aDto), total: deCentavos(total) };
  }

  async obtener(costoId: string): Promise<CostoDto> {
    const costo = this.registros.get(costoId);
    if (!costo) throw new RecursoNoEncontrado('El costo');
    return aDto(costo);
  }

  private vigentes(): Costo[] {
    return [...this.registros.values()].filter((costo) => costo.instantanea().estado === 'vigente');
  }
}

type LineaSembrada = Omit<LineaConReferencia, 'capitalizadoCentavos' | 'descartada'>;

/** Las líneas del libro en memoria; lo capitalizado sale de los costos y lo descartado, de los descartes. */
export class LineasEnMemoria implements LineasDelLibro {
  private readonly lineas = new Map<string, LineaSembrada>();

  constructor(
    private readonly costos: CostosEnMemoria,
    private readonly descartes: DescartesEnMemoria,
  ) {}

  sembrar(linea: LineaSembrada): void {
    this.lineas.set(linea.lineaId, linea);
  }

  async buscar(lineaIds: readonly string[]): Promise<LineaConReferencia[]> {
    return lineaIds.flatMap((id) => {
      const linea = this.lineas.get(id);
      if (!linea) return [];
      const descartada = [...this.descartes.registros.values()].some((d) => d.lineaId === id && d.vigente);
      return [{ ...linea, capitalizadoCentavos: this.costos.capitalizadoDeLinea(id), descartada }];
    });
  }
}

/** Los descartes en memoria. */
export class DescartesEnMemoria implements RepositorioDescartes {
  readonly registros = new Map<string, DescarteDeLinea & { vigente: boolean }>();

  async vigente(lineaId: string): Promise<DescarteDeLinea | null> {
    return [...this.registros.values()].find((d) => d.lineaId === lineaId && d.vigente) ?? null;
  }

  async agregar({ lineaId, documentoId, motivo }: NuevoDescarte): Promise<void> {
    const id = crypto.randomUUID();
    this.registros.set(id, { id, lineaId, documentoId, motivo, vigente: true });
  }

  async devolver(descarteId: string): Promise<void> {
    this.registros.get(descarteId)!.vigente = false;
  }
}

export class UmbralFijo implements LectorDeUmbral {
  constructor(public centavos = 0) {}

  async paraEmpresa(): Promise<number> {
    return this.centavos;
  }
}
