import type { Operador } from '../../../compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../compartido/aplicacion/unidad-de-trabajo.js';
import { AccesoDenegado } from '../../../compartido/aplicacion/errores.js';
import { crearSiHayTexto } from '../../../compartido/dominio/objeto-valor.js';
import { Correo } from '../../../compartido/dominio/objetos-valor/correo.js';
import { Usuario } from '../../dominio/usuario.js';
import type { AsignadorDeEmpresas } from '../asignador-de-empresas.js';
import type { AsignadorDeNombreDeUsuario } from '../asignador-de-nombre-de-usuario.js';
import type { AsignadorDePermisos } from '../asignador-de-permisos.js';
import type { SolicitudDeUsuario } from '../dto/usuario.dto.js';
import type { CifradorDeContrasenas } from '../puertos/cifrador-de-contrasenas.js';
import type { RepositorioUsuarios } from '../puertos/repositorio-usuarios.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioUsuarios;
  empresas: AsignadorDeEmpresas;
  permisos: AsignadorDePermisos;
  asignador: AsignadorDeNombreDeUsuario;
  cifrador: CifradorDeContrasenas;
}

/**
 * Crea el usuario y le da acceso a las empresas indicadas (y, si quien lo crea puede
 * asignar permisos, a los roles y permisos directos). Nunca reutiliza uno existente:
 * el nombre de usuario no prueba identidad, así que un dueño no puede apropiarse de
 * alguien de otra cuenta escribiendo su nombre.
 */
export class CrearUsuario {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws EmpresaRepetida, EmpresaAjena, RolAjeno o PermisoDesconocido si algún dato no es válido.
   * @throws AccesoDenegado si pide roles o permisos sin poder asignarlos.
   * @throws RecursoDuplicado si el nombre de usuario escrito ya está en uso.
   */
  async ejecutar(operador: Operador, solicitud: SolicitudDeUsuario): Promise<{ id: string; usuario: string }> {
    const { unidadDeTrabajo, repositorio, asignador, cifrador } = this.dependencias;
    const { rolIds = [], permisos = [] } = solicitud;
    if (rolIds.length + permisos.length > 0 && !solicitud.puedeAsignarPermisos) throw new AccesoDenegado();
    const hashContrasena = await cifrador.cifrar(solicitud.contrasena);
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const usuario = Usuario.registrar({
        nombreDeUsuario: await asignador.paraNuevo(solicitud),
        nombres: solicitud.nombres,
        apellidos: solicitud.apellidos,
        correo: crearSiHayTexto(solicitud.correo, Correo.crear),
        hashContrasena,
      });
      await repositorio.agregar(usuario);
      const nombre = usuario.instantanea().nombreDeUsuario.valor;
      const persona = { usuarioId: usuario.id.valor, usuario: nombre, cuentaId: operador.cuentaId };
      await this.dependencias.empresas.reemplazar(persona, solicitud.empresaIds);
      if (rolIds.length + permisos.length > 0)
        await this.dependencias.permisos.reemplazar(persona, { rolIds, permisos });
      return { id: persona.usuarioId, usuario: nombre };
    });
  }
}
