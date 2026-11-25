import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { RolDeCuenta } from '../../../../core/contratos/contabilidad.contratos.js';
import type { Cuenta } from '../../../dominio/cuenta.js';
import { Enlace, type DatosDeEnlace } from '../../../dominio/enlace.js';
import { EnlaceInvalido } from '../../../dominio/errores.js';
import { DEFINICIONES_DE_ROLES } from '../../../dominio/roles-de-enlace.js';
import type { EnlaceDto, SolicitudDeEnlace } from '../../dto/enlace.dto.js';
import type { DependenciasDeEnlaces } from './dependencias-de-enlaces.js';

interface CambioDeEnlace {
  rol: RolDeCuenta;
  solicitud: SolicitudDeEnlace;
}

export class GuardarEnlace {
  constructor(private readonly dependencias: DependenciasDeEnlaces) {}

  /**
   * Enlaza el rol (con su llave, si la lleva) a una cuenta de detalle activa; si ya había un enlace, cambia su
   * cuenta y queda en la auditoría con cómo estaba. Un rol de auxiliar deja la cuenta marcada como de control.
   * @throws RecursoNoEncontrado si la cuenta no existe o no es de la empresa.
   * @throws EnlaceInvalido si la llave no corresponde al rol o ningún módulo activo la ofrece.
   * @throws CuentaNoEsDeDetalle o CuentaInactiva si la cuenta no puede recibir movimientos.
   */
  ejecutar(operador: Operador, { rol, solicitud }: CambioDeEnlace): Promise<EnlaceDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const cuenta = await this.cuentaBloqueada(solicitud.cuentaId);
      const datos = { rol, cuenta, llave: await this.llaveDe(operador, rol, solicitud.llave) };
      const existente = await repositorio.buscarParaCambiar(rol, solicitud.llave);
      const id = existente
        ? await this.cambiar(existente, datos)
        : await this.crear(Identificador.desde(operador.empresaId), datos);
      await this.marcarCuentaDeControl(rol, cuenta);
      return consultas.obtener(id);
    });
  }

  /**
   * La cuenta se lee con `for no key update`: quien la renombra o inactiva (`ActualizarCuenta`) espera a este enlace y
   * ve su resultado, y este no reescribe la fila con una lectura vieja.
   */
  private async cuentaBloqueada(id: string): Promise<Cuenta> {
    const cuenta = await this.dependencias.cuentas.buscarParaCambiar(Identificador.desde(id));
    if (!cuenta) throw new RecursoNoEncontrado('La cuenta');
    return cuenta;
  }

  private async crear(empresaId: Identificador<'Empresa'>, datos: DatosDeEnlace): Promise<string> {
    const enlace = Enlace.crear(empresaId, datos);
    await this.dependencias.repositorio.agregar(enlace);
    return enlace.id.valor;
  }

  /** Solo se audita si la cuenta cambió de verdad. */
  private async cambiar(enlace: Enlace, datos: DatosDeEnlace): Promise<string> {
    const { repositorio, consultas, auditoria } = this.dependencias;
    const anterior = await consultas.obtener(enlace.id.valor);
    enlace.cambiarCuenta(datos);
    await repositorio.guardar(enlace);
    if (anterior.cuentaId !== datos.cuenta.id.valor) {
      await auditoria.registrar({
        recurso: 'contabilidad.enlaces',
        registroId: anterior.id,
        accion: 'corregir',
        anterior,
      });
    }
    return enlace.id.valor;
  }

  private async llaveDe(operador: Operador, rol: RolDeCuenta, id: string | null): Promise<DatosDeEnlace['llave']> {
    if (id === null) return null;
    const { nombre, admiteLlave } = DEFINICIONES_DE_ROLES[rol];
    if (!admiteLlave) throw new EnlaceInvalido(`El rol «${nombre}» no lleva llave.`, 'llave');
    const ofrecidas = await this.dependencias.llaves.de(operador, rol);
    const elegida = ofrecidas.find(({ llave }) => llave === id);
    if (!elegida) throw new EnlaceInvalido('La llave no existe entre las que ofrecen los módulos activos.', 'llave');
    return { id, nombre: elegida.nombre };
  }

  private async marcarCuentaDeControl(rol: RolDeCuenta, cuenta: Cuenta): Promise<void> {
    if (DEFINICIONES_DE_ROLES[rol].esDeAuxiliar && cuenta.marcarDeControl()) {
      await this.dependencias.cuentas.guardar(cuenta);
    }
  }
}
