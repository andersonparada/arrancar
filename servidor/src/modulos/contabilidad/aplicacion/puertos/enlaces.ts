import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import type { LlaveDeEnlace, RolDeCuenta } from '../../../core/contratos/contabilidad.contratos.js';
import type { Enlace, EnlaceId } from '../../dominio/enlace.js';
import type { EnlaceDto } from '../dto/enlace.dto.js';

/** Guarda y recupera los enlaces para modificarlos. La seguridad por empresa (RLS) limita lo que se ve. */
export interface RepositorioEnlaces {
  buscar(id: EnlaceId): Promise<Enlace | null>;
  /** El enlace del rol con esa llave (nula = el del rol sin llave), bloqueado hasta el fin de la transacción. */
  buscarParaCambiar(rol: RolDeCuenta, llave: string | null): Promise<Enlace | null>;
  /** El enlace por su id, bloqueado hasta el fin de la transacción: quien lo quita audita lo que de verdad borra. */
  buscarParaQuitar(id: EnlaceId): Promise<Enlace | null>;
  agregar(enlace: Enlace): Promise<void>;
  guardar(enlace: Enlace): Promise<void>;
  eliminar(enlace: Enlace): Promise<void>;
}

/** Lecturas para pantallas: devuelven datos planos, sin reconstruir entidades. */
export interface ConsultasEnlaces {
  /** Todos los enlaces de la empresa, por rol y llave. */
  listar(): Promise<EnlaceDto[]>;
  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  obtener(enlaceId: string): Promise<EnlaceDto>;
}

/** Las llaves que los módulos activos ofrecen para un rol (pregunta `contabilidad.llaves_de_enlace`). */
export interface LlavesDeEnlaceDeLosModulos {
  de(operador: Operador, rol: RolDeCuenta): Promise<LlaveDeEnlace[]>;
}

/** Qué módulos usa la cuenta del operador: los contratados, los esenciales y sus dependencias. */
export interface ModulosActivosDeLaCuentaActual {
  de(operador: Operador): Promise<ReadonlySet<string>>;
}
