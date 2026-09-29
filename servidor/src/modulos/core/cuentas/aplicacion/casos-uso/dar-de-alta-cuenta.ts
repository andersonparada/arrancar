import { Rol } from '../../../autorizacion/dominio/rol.js';
import { DatoInvalido } from '../../../compartido/dominio/errores.js';
import { crearSiHayTexto } from '../../../compartido/dominio/objeto-valor.js';
import { Correo } from '../../../compartido/dominio/objetos-valor/correo.js';
import type { CifradorDeContrasenas } from '../../../identidad/aplicacion/puertos/cifrador-de-contrasenas.js';
import type { RepositorioUsuarios } from '../../../identidad/aplicacion/puertos/repositorio-usuarios.js';
import { NombreDeUsuario } from '../../../identidad/dominio/nombre-de-usuario.js';
import { Usuario } from '../../../identidad/dominio/usuario.js';
import { Cuenta } from '../../dominio/cuenta.js';
import type { CuentaDadaDeAltaDto, SolicitudDeAlta } from '../dto/cuenta.dto.js';
import type { CatalogoDeModulos } from '../puertos/catalogo-de-modulos.js';
import type { PiezasDeAlta, TransaccionDeAlta } from '../puertos/transaccion-de-alta.js';

export class FaltaLaContrasenaDelPropietario extends DatoInvalido {
  readonly codigo = 'falta_la_contrasena_del_propietario';

  constructor() {
    super('Indique la contraseña inicial del propietario.', [
      { campo: 'propietario.contrasena', mensaje: 'Obligatoria para un usuario nuevo.' },
    ]);
  }
}

interface Dependencias {
  catalogo: CatalogoDeModulos;
  usuariosExistentes: RepositorioUsuarios;
  cifrador: CifradorDeContrasenas;
  transaccion: TransaccionDeAlta;
}

/** El dueño: uno que ya existe (de otra cuenta) o los datos para crearlo. */
type Propietario = { existente: Usuario } | { hashContrasena: string };

function resumenDe(dueno: Usuario, propietario: Propietario): CuentaDadaDeAltaDto['propietario'] {
  return {
    id: dueno.id.valor,
    usuario: dueno.instantanea().nombreDeUsuario.valor,
    existente: 'existente' in propietario,
  };
}

/**
 * Da de alta a un suscriptor (patrón Facade): la cuenta, su primera empresa, el
 * rol Propietario, el usuario dueño y los módulos contratados, en una sola
 * transacción. Solo soporte la usa; por eso aquí sí se reutiliza un usuario
 * existente si se escribe su nombre (alguien que ya es dueño de otra cuenta).
 */
export class DarDeAltaCuenta {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws ModuloDesconocido o FaltanDependenciasDelModulo si algún módulo no se puede contratar.
   * @throws FaltaLaContrasenaDelPropietario si el propietario es nuevo y no trae contraseña.
   */
  async ejecutar(solicitud: SolicitudDeAlta): Promise<CuentaDadaDeAltaDto> {
    this.exigirModulosContratables(solicitud.modulos);
    const propietario = await this.propietarioDe(solicitud.propietario);
    return this.dependencias.transaccion.ejecutar((piezas) => this.registrar(piezas, solicitud, propietario));
  }

  private exigirModulosContratables(modulos: string[]): void {
    const { catalogo } = this.dependencias;
    const activos = catalogo.activos(modulos);
    for (const modulo of modulos) catalogo.exigirQueSePuedaActivar(modulo, activos);
  }

  private async propietarioDe({ usuario, contrasena }: SolicitudDeAlta['propietario']): Promise<Propietario> {
    const existente = usuario
      ? await this.dependencias.usuariosExistentes.buscarPorNombre(NombreDeUsuario.crear(usuario))
      : null;
    if (existente) return { existente };
    if (!contrasena) throw new FaltaLaContrasenaDelPropietario();
    return { hashContrasena: await this.dependencias.cifrador.cifrar(contrasena) };
  }

  private async registrar(
    piezas: PiezasDeAlta,
    solicitud: SolicitudDeAlta,
    propietario: Propietario,
  ): Promise<CuentaDadaDeAltaDto> {
    const cuenta = Cuenta.registrar(solicitud.nombreCuenta);
    await piezas.cuentas.agregar(cuenta);
    const empresa = await piezas.empresa.registrar(cuenta.id.valor, solicitud.empresa);
    const rol = Rol.propietario(cuenta.id);
    await piezas.roles.agregar(rol);
    const dueno =
      'existente' in propietario ? propietario.existente : await this.crearDueno(piezas, solicitud, propietario);
    await piezas.empresa.darAccesoAlPropietario({
      cuentaId: cuenta.id.valor,
      empresaId: empresa.id,
      usuarioId: dueno.id.valor,
      rolId: rol.id.valor,
    });
    await this.contratarModulos(piezas, cuenta, solicitud.modulos);
    return {
      cuenta: { id: cuenta.id.valor, nombre: cuenta.instantanea().nombre },
      empresa,
      propietario: resumenDe(dueno, propietario),
    };
  }

  private async crearDueno(
    { usuarios, asignador }: PiezasDeAlta,
    { propietario }: SolicitudDeAlta,
    { hashContrasena }: { hashContrasena: string },
  ): Promise<Usuario> {
    const dueno = Usuario.registrar({
      nombreDeUsuario: await asignador.paraNuevo(propietario),
      nombres: propietario.nombres,
      apellidos: propietario.apellidos,
      correo: crearSiHayTexto(propietario.correo, Correo.crear),
      hashContrasena,
    });
    await usuarios.agregar(dueno);
    return dueno;
  }

  /** Los esenciales no se contratan: siempre están activos. */
  private async contratarModulos({ cuentas }: PiezasDeAlta, cuenta: Cuenta, modulos: string[]): Promise<void> {
    const contratables = modulos.filter((modulo) => !this.dependencias.catalogo.esEsencial(modulo));
    for (const modulo of contratables) await cuentas.contratar(cuenta.id, modulo);
  }
}
