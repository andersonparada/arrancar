import type { ContextoDeSesion, SesionValidada } from '../../../compartido/aplicacion/contexto-de-sesion.js';
import type { VigenciaDeSesion } from '../../dominio/vigencia-de-sesion.js';
import type { RepositorioSesiones, SesionVigente, TokensDeSesion } from '../puertos/repositorio-sesiones.js';
import type { ResolutorDeAcceso } from '../resolutor-de-acceso.js';

interface Dependencias {
  sesiones: RepositorioSesiones;
  tokens: TokensDeSesion;
  vigencia: VigenciaDeSesion;
  resolutor: ResolutorDeAcceso;
}

/** Reconoce el token de la cookie y arma el contexto de la petición; lo usan las guardias. */
export class ValidarSesion {
  constructor(private readonly dependencias: Dependencias) {}

  /** `null` si el token no corresponde a una sesión vigente de un usuario activo. */
  async ejecutar(token: string): Promise<SesionValidada | null> {
    const { sesiones, tokens } = this.dependencias;
    const sesion = await sesiones.buscarVigente(tokens.huellaDe(token));
    if (!sesion) return null;
    return { contexto: await this.contextoDe(sesion), renovadaHasta: await this.renovarSiHaceFalta(sesion) };
  }

  private async renovarSiHaceFalta(sesion: SesionVigente): Promise<Date | null> {
    const ahora = new Date();
    if (!this.dependencias.vigencia.debeRenovarse(sesion.expiraEn, ahora)) return null;
    const expiraEn = this.dependencias.vigencia.vencimientoDesde(ahora);
    await this.dependencias.sesiones.extender(sesion.sesionId, expiraEn);
    return expiraEn;
  }

  /** Si ya no puede entrar a la empresa activa (la desactivaron, por ejemplo), queda sin empresa. */
  private async contextoDe({ sesionId, usuario, empresaActivaId }: SesionVigente): Promise<ContextoDeSesion> {
    const sinEmpresa: ContextoDeSesion = {
      sesionId,
      usuario,
      empresa: null,
      roles: [],
      modulosActivos: new Set(),
      permisos: new Set(),
      recursosAlcanceTotal: [],
    };
    const acceso = empresaActivaId && (await this.dependencias.resolutor.resolver(usuario, empresaActivaId));
    return acceso ? { ...sinEmpresa, ...acceso } : sinEmpresa;
  }
}
