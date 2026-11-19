import type { Operador } from '../../../compartido/aplicacion/operador.js';
import { Identificador } from '../../../compartido/dominio/identificador.js';
import type { UsuarioId } from '../../dominio/usuario.js';
import type { RepositorioUsuarios } from '../puertos/repositorio-usuarios.js';
import type { ResolutorDeAcceso } from '../resolutor-de-acceso.js';

interface Dependencias {
  usuarios: Pick<RepositorioUsuarios, 'buscar'>;
  resolutor: Pick<ResolutorDeAcceso, 'resolver'>;
}

/**
 * El operador de un usuario en una empresa para quien actúa **sin petición** (un suscriptor de eventos que sigue lo que
 * hizo ese usuario): con los mismos recursos de alcance que le daría una sesión, para leer lo mismo que él leyó.
 */
export class ResolverOperadorDeUsuario {
  constructor(private readonly dependencias: Dependencias) {}

  /** `null` si el usuario no existe, está inactivo o ya no puede trabajar en la empresa. */
  async ejecutar(usuarioId: string, empresaId: string): Promise<Operador | null> {
    const { usuarios, resolutor } = this.dependencias;
    const usuario = await usuarios.buscar(Identificador.desde<'Usuario'>(usuarioId) as UsuarioId);
    const datos = usuario?.instantanea();
    if (!datos?.activo) return null;
    const sesion = {
      id: usuarioId,
      usuario: datos.nombreDeUsuario.valor,
      nombre: '',
      esSuperacceso: datos.esSuperacceso,
    };
    const acceso = await resolutor.resolver(sesion, empresaId);
    if (!acceso?.empresa) return null;
    return {
      usuarioId,
      empresaId,
      cuentaId: acceso.empresa.cuentaId,
      esSuperacceso: datos.esSuperacceso,
      recursosAlcanceTotal: acceso.recursosAlcanceTotal,
    };
  }
}
