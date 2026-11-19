import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import type { ActivoDto, ActivoFichaDto, FiltrosDeActivos, UbicacionesDto } from '../aplicacion/dto/activo.dto.js';
import type { CargaInicial, EstadoDeLaCarga } from '../aplicacion/puertos/carga-inicial.js';
import type { ConsultasActivos } from '../aplicacion/puertos/consultas-activos.js';
import type { LectorDePrefijo } from '../aplicacion/puertos/lector-de-prefijo.js';
import type {
  DepartamentoVisible,
  LectorDeUbicaciones,
  LocalidadVisible,
} from '../aplicacion/puertos/lector-de-ubicaciones.js';
import type { RepositorioActivos } from '../aplicacion/puertos/repositorio-activos.js';
import type { Activo, ActivoId } from '../dominio/activo.js';

function aFicha(activo: Activo): ActivoFichaDto {
  const { id, empresaId, ...datos } = activo.instantanea();
  return {
    ...datos,
    id: id.valor,
    claseNombre: 'Clase de prueba',
    costo: '0.00',
    incisoFiscal: 'maquinaria_y_vehiculos',
    localidadNombre: null,
    departamentoNombre: null,
    traslados: [],
    tramos: [],
  };
}

/** Guarda los activos en memoria y responde tanto de repositorio como de consultas. */
export class ActivosEnMemoria implements RepositorioActivos, ConsultasActivos {
  readonly registros = new Map<string, Activo>();
  /** Los activos que la prueba marca con traslados además del alta. */
  readonly conTraslados = new Set<string>();

  async buscar(id: ActivoId): Promise<Activo | null> {
    return this.registros.get(id.valor) ?? null;
  }

  async agregar(activo: Activo): Promise<void> {
    this.registros.set(activo.id.valor, activo);
  }

  async agregarVarios(activos: readonly Activo[]): Promise<void> {
    for (const activo of activos) this.registros.set(activo.id.valor, activo);
  }

  async buscarBloqueando(ids: readonly string[]): Promise<Activo[]> {
    return ids.flatMap((id) => this.registros.get(id) ?? []);
  }

  async vigentesDeAltaConjunta(altaConjuntaId: string): Promise<Activo[]> {
    return [...this.registros.values()].filter((activo) => {
      const { altaConjuntaId: alta, estado } = activo.instantanea();
      return alta === altaConjuntaId && estado !== 'dado_de_baja';
    });
  }

  async codigosUsados(codigos: readonly string[]): Promise<Set<string>> {
    const buscados = new Set(codigos.map((codigo) => codigo.toUpperCase()));
    const usados = [...this.registros.values()].map((a) => a.instantanea().codigo.toUpperCase());
    return new Set(usados.filter((codigo) => buscados.has(codigo)));
  }

  async guardar(activo: Activo): Promise<void> {
    this.registros.set(activo.id.valor, activo);
  }

  async actualizarAlta(): Promise<void> {}

  async eliminar(activo: Activo): Promise<void> {
    this.registros.delete(activo.id.valor);
  }

  async existeCodigo(codigo: string): Promise<boolean> {
    return [...this.registros.values()].some((a) => a.instantanea().codigo.toUpperCase() === codigo.toUpperCase());
  }

  async idPorCodigo(codigo: string): Promise<string | null> {
    const buscado = codigo.trim().toUpperCase();
    const hallado = [...this.registros.values()].find((a) => a.instantanea().codigo.toUpperCase() === buscado);
    return hallado?.id.valor ?? null;
  }

  async tieneComponentes(id: ActivoId): Promise<boolean> {
    return [...this.registros.values()].some((a) => a.instantanea().activoPadreId === id.valor);
  }

  async tieneMovimientos(id: ActivoId): Promise<boolean> {
    return this.conTraslados.has(id.valor);
  }

  async listar(filtros: FiltrosDeActivos): Promise<ActivoDto[]> {
    const todos = [...this.registros.values()].map(aFicha);
    return todos.filter((activo) => filtros.estado === undefined || activo.estado === filtros.estado);
  }

  async obtener(activoId: string): Promise<ActivoFichaDto> {
    const activo = this.registros.get(activoId);
    if (!activo) throw new RecursoNoEncontrado('El activo');
    return aFicha(activo);
  }
}

/** Localidades y departamentos de la empresa en memoria. */
export class UbicacionesEnMemoria implements LectorDeUbicaciones {
  readonly localidades = new Map<string, LocalidadVisible>();
  readonly departamentos = new Map<string, DepartamentoVisible>();

  async localidad(id: string): Promise<LocalidadVisible | null> {
    return this.localidades.get(id) ?? null;
  }

  async departamento(id: string): Promise<DepartamentoVisible | null> {
    return this.departamentos.get(id) ?? null;
  }

  async activas(): Promise<UbicacionesDto> {
    return {
      localidades: [...this.localidades.values()].filter((l) => l.activo),
      departamentos: [...this.departamentos.values()].filter((d) => d.activo),
    };
  }
}

export class CargaInicialDePrueba implements CargaInicial {
  constructor(public estado: EstadoDeLaCarga = { fechaDeInicio: '2026-01-01', cerrada: false }) {}

  async obtener(_operador: Operador): Promise<EstadoDeLaCarga> {
    return this.estado;
  }
}

export class PrefijoFijo implements LectorDePrefijo {
  constructor(private readonly prefijo = 'AF-') {}

  async paraEmpresa(): Promise<string> {
    return this.prefijo;
  }
}
