import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import type { LlaveDeEnlace, RolDeCuenta } from '../../core/contratos/contabilidad.contratos.js';
import type { EnlaceDto } from '../aplicacion/dto/enlace.dto.js';
import type {
  ConsultasEnlaces,
  LlavesDeEnlaceDeLosModulos,
  ModulosActivosDeLaCuentaActual,
  RepositorioEnlaces,
} from '../aplicacion/puertos/enlaces.js';
import type { Enlace, EnlaceId } from '../dominio/enlace.js';
import type { CuentasEnMemoria } from './dobles-de-cuentas.js';

/** Guarda los enlaces en memoria y avisa a las cuentas en memoria cuáles quedan enlazadas. */
export class EnlacesEnMemoria implements RepositorioEnlaces, ConsultasEnlaces {
  private readonly registros = new Map<string, Enlace>();

  constructor(private readonly cuentas: CuentasEnMemoria) {}

  async buscar(id: EnlaceId): Promise<Enlace | null> {
    return this.registros.get(id.valor) ?? null;
  }

  async buscarParaCambiar(rol: RolDeCuenta, llave: string | null): Promise<Enlace | null> {
    const coincide = (enlace: Enlace) => enlace.rol === rol && enlace.instantanea().llave === llave;
    return [...this.registros.values()].find(coincide) ?? null;
  }

  async buscarParaQuitar(id: EnlaceId): Promise<Enlace | null> {
    return this.registros.get(id.valor) ?? null;
  }

  async agregar(enlace: Enlace): Promise<void> {
    this.registros.set(enlace.id.valor, enlace);
    this.cuentas.conEnlaces.add(enlace.cuentaId.valor);
  }

  async guardar(enlace: Enlace): Promise<void> {
    this.registros.set(enlace.id.valor, enlace);
    this.cuentas.conEnlaces.add(enlace.cuentaId.valor);
  }

  async eliminar(enlace: Enlace): Promise<void> {
    this.registros.delete(enlace.id.valor);
    this.cuentas.conEnlaces.delete(enlace.cuentaId.valor);
  }

  async listar(): Promise<EnlaceDto[]> {
    return Promise.all([...this.registros.keys()].map((id) => this.obtener(id)));
  }

  async obtener(enlaceId: string): Promise<EnlaceDto> {
    const enlace = this.registros.get(enlaceId);
    if (!enlace) throw new RecursoNoEncontrado('El enlace');
    const { id, empresaId, cuentaId, ...datos } = enlace.instantanea();
    const cuenta = await this.cuentas.obtener(cuentaId.valor);
    return {
      ...datos,
      id: id.valor,
      cuentaId: cuentaId.valor,
      cuentaCodigo: cuenta.codigo,
      cuentaNombre: cuenta.nombre,
    };
  }
}

/** Las llaves que ofrecen los módulos, dadas de antemano por rol. */
export class LlavesFijas implements LlavesDeEnlaceDeLosModulos {
  constructor(private readonly porRol: Partial<Record<RolDeCuenta, LlaveDeEnlace[]>> = {}) {}

  async de(_operador: unknown, rol: RolDeCuenta): Promise<LlaveDeEnlace[]> {
    return this.porRol[rol] ?? [];
  }
}

/** Los módulos activos, dados de antemano. */
export class ModulosActivosFijos implements ModulosActivosDeLaCuentaActual {
  constructor(private readonly activos: string[]) {}

  async de(): Promise<ReadonlySet<string>> {
    return new Set(this.activos);
  }
}
