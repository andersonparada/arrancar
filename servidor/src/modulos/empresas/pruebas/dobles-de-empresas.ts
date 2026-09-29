import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import type { EmpresaDto } from '../aplicacion/dto/empresa.dto.js';
import type { AccesosAEmpresas } from '../aplicacion/puertos/accesos-a-empresas.js';
import type { ConsultasEmpresas } from '../aplicacion/puertos/consultas-empresas.js';
import type { RepositorioEmpresas } from '../aplicacion/puertos/repositorio-empresas.js';
import type { CuentaId } from '../../core/compartido/dominio/identificador.js';
import type { Empresa, EmpresaId } from '../dominio/empresa.js';

/** Guarda empresas en memoria y responde tanto de repositorio como de consultas. */
export class EmpresasEnMemoria implements RepositorioEmpresas, ConsultasEmpresas {
  private readonly empresas = new Map<string, Empresa>();

  async buscarEnCuenta(id: EmpresaId, cuentaId: CuentaId): Promise<Empresa | null> {
    const empresa = this.empresas.get(id.valor);
    return empresa?.cuentaId.esIgualA(cuentaId) ? empresa : null;
  }

  async agregar(empresa: Empresa): Promise<void> {
    this.empresas.set(empresa.id.valor, empresa);
  }

  async actualizar(empresa: Empresa): Promise<void> {
    this.empresas.set(empresa.id.valor, empresa);
  }

  async listarDeCuenta(cuentaId: string): Promise<EmpresaDto[]> {
    return [...this.empresas.values()]
      .filter((empresa) => empresa.cuentaId.valor === cuentaId)
      .map(aDto)
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  async obtenerEnCuenta(empresaId: string, cuentaId: string): Promise<EmpresaDto> {
    const empresa = this.empresas.get(empresaId);
    if (!empresa || empresa.cuentaId.valor !== cuentaId) throw new RecursoNoEncontrado('La empresa');
    return aDto(empresa);
  }
}

function aDto(empresa: Empresa): EmpresaDto {
  const { id, nit, nombre, direccion, telefono, correo, monedaBase, activa } = empresa.instantanea();
  return {
    id: id.valor,
    nit: nit?.valor ?? null,
    nombre,
    direccion,
    telefono: telefono?.valor ?? null,
    correo: correo?.valor ?? null,
    monedaBase,
    activa,
    actualizadoEn: new Date(),
  };
}

/** Accesos en memoria: `usuarioId → empresas donde trabaja`. */
export class AccesosEnMemoria implements AccesosAEmpresas {
  private readonly empresas = new Map<string, Set<string>>();

  async empresasDelUsuario(usuarioId: string): Promise<ReadonlySet<string>> {
    return new Set(this.empresas.get(usuarioId));
  }

  async darAcceso({ empresaId, usuarioId }: { empresaId: string; usuarioId: string }) {
    const delUsuario = this.empresas.get(usuarioId) ?? new Set<string>();
    delUsuario.add(empresaId);
    this.empresas.set(usuarioId, delUsuario);
  }
}
