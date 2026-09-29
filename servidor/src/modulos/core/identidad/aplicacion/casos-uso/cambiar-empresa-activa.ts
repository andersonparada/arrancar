import type { ContextoDeSesion } from '../../../compartido/aplicacion/contexto-de-sesion.js';
import { RecursoNoEncontrado } from '../../../compartido/aplicacion/errores.js';
import type { BitacoraDeSoporte } from '../puertos/contextos-vecinos.js';
import type { EmpresasDeLaSesion } from '../puertos/empresas-de-la-sesion.js';
import type { RepositorioSesiones } from '../puertos/repositorio-sesiones.js';
import type { ResolutorDeAcceso } from '../resolutor-de-acceso.js';

interface Dependencias {
  sesiones: RepositorioSesiones;
  empresas: EmpresasDeLaSesion;
  resolutor: ResolutorDeAcceso;
  bitacora: BitacoraDeSoporte;
}

export interface EmpresaElegida {
  empresaId: string;
  direccionIp: string | null;
}

/** Cambia la empresa con la que trabaja la sesión. */
export class CambiarEmpresaActiva {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws RecursoNoEncontrado si la empresa no existe o el usuario no tiene acceso. */
  async ejecutar(contexto: ContextoDeSesion, { empresaId, direccionIp }: EmpresaElegida): Promise<ContextoDeSesion> {
    const acceso = await this.dependencias.resolutor.resolver(contexto.usuario, empresaId);
    if (!acceso) throw new RecursoNoEncontrado('La empresa');
    await this.dependencias.sesiones.fijarEmpresaActiva(contexto.sesionId, empresaId);
    await this.anotarSiEsSoporteEnEmpresaAjena(contexto, { empresaId, direccionIp });
    return { ...contexto, ...acceso };
  }

  /** Las entradas de soporte a empresas donde no es miembro quedan en la bitácora. */
  private async anotarSiEsSoporteEnEmpresaAjena(contexto: ContextoDeSesion, eleccion: EmpresaElegida): Promise<void> {
    const { usuario } = contexto;
    if (!usuario.esSuperacceso) return;
    const esMiembro = await this.dependencias.empresas.esMiembro(usuario.id, eleccion.empresaId);
    if (!esMiembro) await this.dependencias.bitacora.registrarEntrada({ usuarioId: usuario.id, ...eleccion });
  }
}
