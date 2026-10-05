import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import type { AvisosDeProveedor, ProveedorGuardado } from '../aplicacion/puertos/avisos-de-proveedor.js';
import type {
  FichaDeTerceroDto,
  PapelDeClienteDto,
  PapelDeProveedorDto,
  TerceroDto,
  TerceroEnListadoDto,
  TerceroParecidoDto,
} from '../aplicacion/dto/tercero.dto.js';
import type { ConsultasTerceros } from '../aplicacion/puertos/consultas.js';
import type {
  RepositorioCategorias,
  RepositorioContactos,
  RepositorioTerceros,
} from '../aplicacion/puertos/repositorios.js';
import type { CategoriaDeProveedor, CategoriaDeProveedorId } from '../dominio/categoria-de-proveedor.js';
import type { Contacto, ContactoId } from '../dominio/contacto.js';
import type { TipoDePapel } from '../dominio/papeles.js';
import type { Tercero, TerceroId } from '../dominio/tercero.js';

/** Terceros en memoria; responde como repositorio y, en lo que usan los casos de uso, como consultas. */
export class TercerosEnMemoria implements RepositorioTerceros, ConsultasTerceros {
  private readonly terceros = new Map<string, Tercero>();
  /** Lo que devolverá la búsqueda de parecidos (en la base real la hace PostgreSQL con trigramas). */
  parecidos: TerceroParecidoDto[] = [];

  async buscar(id: TerceroId): Promise<Tercero | null> {
    return this.terceros.get(id.valor) ?? null;
  }

  /** En memoria el papel no tiene id propio: el id del proveedor es el del tercero (igual que en `obtenerPapel`). */
  async buscarDeProveedor(proveedorId: string): Promise<Tercero | null> {
    const tercero = this.terceros.get(proveedorId);
    return tercero?.tienePapel('proveedor') ? tercero : null;
  }

  async nombreDelOtroConNit(nit: string, excepto: string): Promise<string | null> {
    const otro = [...this.terceros.values()].find((t) => t.id.valor !== excepto && t.instantanea().nit?.valor === nit);
    return otro?.nombreParaMostrar ?? null;
  }

  async agregar(tercero: Tercero): Promise<void> {
    this.terceros.set(tercero.id.valor, tercero);
  }

  async guardar(tercero: Tercero): Promise<void> {
    this.terceros.set(tercero.id.valor, tercero);
  }

  cantidad(): number {
    return this.terceros.size;
  }

  async obtener(terceroId: string): Promise<TerceroDto> {
    const tercero = this.terceros.get(terceroId);
    if (!tercero) throw new RecursoNoEncontrado('El cliente o proveedor');
    return {
      id: terceroId,
      nombreMostrar: tercero.nombreParaMostrar,
      activo: tercero.instantanea().activo,
    } as TerceroDto;
  }

  async buscarParecidos(): Promise<TerceroParecidoDto[]> {
    return this.parecidos;
  }

  async obtenerPapel(terceroId: string, tipo: TipoDePapel): Promise<PapelDeClienteDto | PapelDeProveedorDto> {
    const papel = this.terceros.get(terceroId)?.papel(tipo);
    if (!papel) throw new RecursoNoEncontrado(`El papel de ${tipo}`);
    return { id: terceroId, ...papel } as PapelDeClienteDto | PapelDeProveedorDto;
  }

  listar(): Promise<TerceroEnListadoDto[]> {
    throw new Error('Las lecturas de pantalla se prueban contra PostgreSQL.');
  }

  obtenerFicha(): Promise<FichaDeTerceroDto> {
    throw new Error('Las lecturas de pantalla se prueban contra PostgreSQL.');
  }
}

export class ContactosEnMemoria implements RepositorioContactos {
  readonly contactos = new Map<string, Contacto>();

  async buscar(id: ContactoId): Promise<Contacto | null> {
    return this.contactos.get(id.valor) ?? null;
  }

  async agregar(contacto: Contacto): Promise<void> {
    this.contactos.set(contacto.id.valor, contacto);
  }

  async guardar(contacto: Contacto): Promise<void> {
    this.contactos.set(contacto.id.valor, contacto);
  }

  async eliminar(contacto: Contacto): Promise<void> {
    this.contactos.delete(contacto.id.valor);
  }
}

export class CategoriasEnMemoria implements RepositorioCategorias {
  private readonly categorias = new Map<string, CategoriaDeProveedor>();

  async buscar(id: CategoriaDeProveedorId): Promise<CategoriaDeProveedor | null> {
    return this.categorias.get(id.valor) ?? null;
  }

  async agregar(categoria: CategoriaDeProveedor): Promise<void> {
    this.categorias.set(categoria.id.valor, categoria);
  }

  async guardar(categoria: CategoriaDeProveedor): Promise<void> {
    this.categorias.set(categoria.id.valor, categoria);
  }
}

/** Recuerda los avisos de proveedor guardado y puede rechazarlos, como un módulo cuya sección es inválida. */
export class AvisosDeProveedorEnMemoria implements AvisosDeProveedor {
  readonly avisos: ProveedorGuardado[] = [];
  rechazarCon: Error | null = null;

  async proveedorGuardado(_operador: Operador, aviso: ProveedorGuardado): Promise<void> {
    this.avisos.push(aviso);
    if (this.rechazarCon) throw this.rechazarCon;
  }
}
