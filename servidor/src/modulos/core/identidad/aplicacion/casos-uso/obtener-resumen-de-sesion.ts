import type {
  ContextoDeSesion,
  EmpresaSesion,
  UsuarioSesion,
} from '../../../compartido/aplicacion/contexto-de-sesion.js';
import type { ConfiguracionPublica } from '../puertos/contextos-vecinos.js';
import type { EmpresasDeLaSesion } from '../puertos/empresas-de-la-sesion.js';
import type { CambiarEmpresaActiva } from './cambiar-empresa-activa.js';

interface Dependencias {
  empresas: EmpresasDeLaSesion;
  configuracion: ConfiguracionPublica;
  cambiarEmpresa: CambiarEmpresaActiva;
}

/** Lo que el navegador necesita para armar la aplicación. */
export interface ResumenDeSesionDto {
  usuario: UsuarioSesion;
  empresa: EmpresaSesion | null;
  rolNombre: string | null;
  modulosActivos: string[];
  permisos: string[];
  configuracion: Record<string, unknown>;
  empresasDisponibles: EmpresaSesion[];
}

/** Si el usuario no tiene empresa activa y solo puede entrar a una, la activa para ahorrarle el paso. */
export class ObtenerResumenDeSesion {
  constructor(private readonly dependencias: Dependencias) {}

  async ejecutar(contexto: ContextoDeSesion, direccionIp: string | null): Promise<ResumenDeSesionDto> {
    const { usuario } = contexto;
    const { empresas } = this.dependencias;
    const empresasDisponibles = usuario.esSuperacceso
      ? await empresas.todas()
      : await empresas.disponiblesPara(usuario.id);
    const [unica] = empresasDisponibles.length === 1 ? empresasDisponibles : [];
    const final =
      !contexto.empresa && unica && !usuario.esSuperacceso
        ? await this.dependencias.cambiarEmpresa.ejecutar(contexto, { empresaId: unica.id, direccionIp })
        : contexto;
    return {
      usuario: final.usuario,
      empresa: final.empresa,
      rolNombre: final.rolNombre,
      modulosActivos: [...final.modulosActivos],
      permisos: [...final.permisos],
      configuracion: await this.configuracionPublica(final),
      empresasDisponibles,
    };
  }

  private configuracionPublica({ empresa, modulosActivos }: ContextoDeSesion): Promise<Record<string, unknown>> {
    if (!empresa) return Promise.resolve({});
    const destino = { cuentaId: empresa.cuentaId, empresaId: empresa.id };
    return this.dependencias.configuracion.valoresPublicos({ destino, modulosActivos });
  }
}
