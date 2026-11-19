import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import { deCentavos } from '../../core/compartido/dominio/centavos.js';
import type { MejoraDto } from '../aplicacion/dto/mejora.dto.js';
import type { ConsultasMejoras } from '../aplicacion/puertos/consultas-mejoras.js';
import type {
  HistorialDeDepreciacion,
  LectorDeHistorialDeDepreciacion,
} from '../aplicacion/puertos/historial-de-depreciacion.js';
import type { RepositorioMejoras } from '../aplicacion/puertos/repositorio-mejoras.js';
import type { Mejora, MejoraId } from '../dominio/mejora.js';
import type { CostosEnMemoria } from './dobles-de-costos.js';

/** Las mejoras en memoria: repositorio y consultas a la vez; el monto sale de los costos vigentes de cada una. */
export class MejorasEnMemoria implements RepositorioMejoras, ConsultasMejoras {
  readonly registros = new Map<string, Mejora>();

  constructor(private readonly costos: CostosEnMemoria) {}

  async agregar(mejora: Mejora): Promise<void> {
    this.registros.set(mejora.id.valor, mejora);
  }

  async buscar(id: MejoraId): Promise<Mejora | null> {
    return this.registros.get(id.valor) ?? null;
  }

  async guardar(mejora: Mejora): Promise<void> {
    this.registros.set(mejora.id.valor, mejora);
  }

  async obtener(mejoraId: string): Promise<MejoraDto> {
    const mejora = this.registros.get(mejoraId);
    if (!mejora) throw new RecursoNoEncontrado('La mejora');
    return this.aDto(mejora);
  }

  async deActivo(activoId: string): Promise<MejoraDto[]> {
    const suyas = [...this.registros.values()].filter((mejora) => mejora.instantanea().activoId === activoId);
    return Promise.all(suyas.map((mejora) => this.aDto(mejora)));
  }

  private async aDto(mejora: Mejora): Promise<MejoraDto> {
    const { id, empresaId: _empresa, anuladaEn, anuladaPor: _por, ...datos } = mejora.instantanea();
    const costos = await this.costos.vigentesDeMejora(id.valor);
    const monto = costos.reduce((suma, costo) => suma + costo.instantanea().montoCentavos, 0);
    return {
      ...datos,
      id: id.valor,
      anuladaEn: anuladaEn?.toISOString() ?? null,
      monto: deCentavos(monto),
      cantidadDeCostos: costos.length,
    };
  }
}

/** Lo depreciado de cada activo, como la prueba lo decide. */
export class HistorialEnMemoria implements LectorDeHistorialDeDepreciacion {
  readonly porActivo = new Map<string, HistorialDeDepreciacion>();

  async deActivo(activoId: string): Promise<HistorialDeDepreciacion> {
    return (
      this.porActivo.get(activoId) ?? { depreciadoPorTramo: new Map(), acumuladaCentavos: { contable: 0, fiscal: 0 } }
    );
  }
}
