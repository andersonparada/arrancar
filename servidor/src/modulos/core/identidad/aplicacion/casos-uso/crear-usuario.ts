import type { Operador } from '../../../compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../compartido/aplicacion/unidad-de-trabajo.js';
import { crearSiHayTexto } from '../../../compartido/dominio/objeto-valor.js';
import { Correo } from '../../../compartido/dominio/objetos-valor/correo.js';
import { Usuario } from '../../dominio/usuario.js';
import type { AsignadorDeNombreDeUsuario } from '../asignador-de-nombre-de-usuario.js';
import type { SolicitudDeUsuario } from '../dto/usuario.dto.js';
import type { AccesosAEmpresas } from '../puertos/accesos-a-empresas.js';
import type { CifradorDeContrasenas } from '../puertos/cifrador-de-contrasenas.js';
import type { RepositorioUsuarios } from '../puertos/repositorio-usuarios.js';
import { exigirAccesosDeLaCuenta } from '../usuario-de-la-cuenta.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioUsuarios;
  accesos: AccesosAEmpresas;
  asignador: AsignadorDeNombreDeUsuario;
  cifrador: CifradorDeContrasenas;
}

/**
 * Crea el usuario y le da acceso a las empresas indicadas. Nunca reutiliza uno
 * existente: el nombre de usuario no prueba identidad, así que un dueño no puede
 * apropiarse de alguien de otra cuenta escribiendo su nombre.
 */
export class CrearUsuario {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws EmpresaRepetida, EmpresaAjena o RolAjeno si algún acceso no es válido.
   * @throws RecursoDuplicado si el nombre de usuario escrito ya está en uso.
   */
  async ejecutar(operador: Operador, solicitud: SolicitudDeUsuario): Promise<{ id: string; usuario: string }> {
    const { unidadDeTrabajo, repositorio, accesos, asignador, cifrador } = this.dependencias;
    const hashContrasena = await cifrador.cifrar(solicitud.contrasena);
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await exigirAccesosDeLaCuenta(accesos, operador.cuentaId, solicitud.accesos);
      const usuario = Usuario.registrar({
        nombreDeUsuario: await asignador.paraNuevo(solicitud),
        nombres: solicitud.nombres,
        apellidos: solicitud.apellidos,
        correo: crearSiHayTexto(solicitud.correo, Correo.crear),
        hashContrasena,
      });
      await repositorio.agregar(usuario);
      await accesos.reemplazarEnCuenta(usuario.id.valor, operador.cuentaId, solicitud.accesos);
      return { id: usuario.id.valor, usuario: usuario.instantanea().nombreDeUsuario.valor };
    });
  }
}
