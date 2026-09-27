import type { TipoDePapel } from '../../dominio/papeles.js';
import type { CategoriaDto } from '../dto/categoria.dto.js';
import type { ContactoDto, ContactoEncontradoDto } from '../dto/contacto.dto.js';
import type {
  FichaDeTerceroDto,
  FiltrosDeTerceros,
  PapelDeClienteDto,
  PapelDeProveedorDto,
  TerceroDto,
  TerceroEnListadoDto,
  TerceroParecidoDto,
} from '../dto/tercero.dto.js';

/** Qué hace parecido a un tercero con otro: el nombre, el NIT o el DPI. */
export interface CriteriosDeParecido {
  nombreMostrar: string;
  nit: string | null;
  dpi: string | null;
  /** El propio tercero, cuando se están cambiando sus datos. */
  excepto?: string;
}

/** Lecturas para pantallas: datos planos, sin reconstruir entidades. `obtener…` lanza `RecursoNoEncontrado`. */
export interface ConsultasTerceros {
  listar(filtros: FiltrosDeTerceros): Promise<TerceroEnListadoDto[]>;
  obtener(terceroId: string): Promise<TerceroDto>;
  obtenerFicha(terceroId: string): Promise<FichaDeTerceroDto>;
  buscarParecidos(criterios: CriteriosDeParecido): Promise<TerceroParecidoDto[]>;
  obtenerPapel(terceroId: string, tipo: TipoDePapel): Promise<PapelDeClienteDto | PapelDeProveedorDto>;
}

export interface ConsultasContactos {
  listarDeTercero(terceroId: string): Promise<ContactoDto[]>;
  obtener(contactoId: string): Promise<ContactoDto>;
}

export interface ConsultasCategorias {
  listar(): Promise<CategoriaDto[]>;
  obtener(categoriaId: string): Promise<CategoriaDto>;
}

/** "Buscar contacto": clientes, proveedores y sus contactos por nombre, teléfono o correo. */
export interface BusquedaDeContactos {
  /** Solo de terceros activos, con a lo sumo `limite` resultados. */
  buscar(texto: string, limite: number): Promise<ContactoEncontradoDto[]>;
}
