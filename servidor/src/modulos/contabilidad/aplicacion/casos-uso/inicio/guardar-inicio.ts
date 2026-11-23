import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { MascaraConCuentas } from '../../../dominio/errores.js';
import { InicioContable } from '../../../dominio/inicio.js';
import { MascaraDeCuentas } from '../../../dominio/mascara-de-cuentas.js';
import type { InicioDto, SolicitudDeInicio } from '../../dto/inicio.dto.js';
import { exigirFechaSegunLaCarga, inicioADto, type DependenciasDeInicio } from './dependencias-de-inicio.js';

/** La fecha y el caso solo se validan contra la carga al crear o cuando cambian: los firmantes se cambian siempre. */
function cambiaLaFecha(inicio: InicioContable, solicitud: SolicitudDeInicio): boolean {
  const { fecha, caso } = inicio.instantanea();
  return fecha !== solicitud.fecha || caso !== solicitud.caso;
}

export class GuardarInicio {
  constructor(private readonly dependencias: DependenciasDeInicio) {}

  /**
   * Inicia la contabilidad de la empresa o cambia sus datos (fecha, firmantes, plantilla). Cambiar la fecha deja
   * constancia en la auditoría.
   * @throws InicioInvalido, MascaraInvalida o CargaInicialAbierta si no cumple las reglas.
   * @throws MascaraConCuentas si cambia la máscara y la empresa ya tiene cuentas.
   */
  ejecutar(operador: Operador, solicitud: SolicitudDeInicio): Promise<InicioDto> {
    const { unidadDeTrabajo, repositorio } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const actual = await repositorio.obtener('exclusivo');
      if (!actual || cambiaLaFecha(actual, solicitud))
        await exigirFechaSegunLaCarga(this.dependencias.cargaInicial, operador, solicitud);
      if (!actual) return this.iniciar(operador, solicitud);
      return this.cambiar(actual, solicitud);
    });
  }

  private async iniciar(operador: Operador, solicitud: SolicitudDeInicio): Promise<InicioDto> {
    const inicio = InicioContable.crear(Identificador.desde(operador.empresaId), solicitud);
    await this.dependencias.repositorio.agregar(inicio);
    return inicioADto(inicio);
  }

  private async cambiar(inicio: InicioContable, solicitud: SolicitudDeInicio): Promise<InicioDto> {
    const { repositorio, cuentas, auditoria } = this.dependencias;
    const anterior = inicioADto(inicio);
    if (MascaraDeCuentas.desde(solicitud.mascara).texto !== anterior.mascara && (await cuentas.hayCuentas()))
      throw new MascaraConCuentas();
    inicio.cambiarDatos(solicitud);
    await repositorio.guardar(inicio);
    if (anterior.fecha !== solicitud.fecha)
      await auditoria.registrar({
        recurso: 'contabilidad.inicio',
        registroId: inicio.instantanea().empresaId.valor,
        accion: 'corregir',
        anterior,
      });
    return inicioADto(inicio);
  }
}
