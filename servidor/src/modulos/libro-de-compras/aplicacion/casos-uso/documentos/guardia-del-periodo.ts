import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import {
  avisoDePeriodoBloqueado,
  avisoDePeriodoCambiado,
  avisoDePeriodoDeclarado,
} from '../../../dominio/periodos/avisos-de-periodos.js';
import {
  periodoAbiertoPropuesto,
  type PeriodoAbiertoPropuesto,
} from '../../../dominio/periodos/periodo-abierto-propuesto.js';
import { periodoPropuesto } from '../../../dominio/periodo-del-libro.js';
import type { SolicitudDeDocumento } from '../../dto/solicitud-de-documento.js';
import { PeriodoDeclarado } from '../../errores-de-periodos.js';
import type { ControlDePeriodos } from '../../puertos/puertos-de-periodos.js';
import type { RepositorioDeDatosFiscalesDeEmpresa } from '../../puertos/repositorios-de-datos-fiscales.js';

/** Anular y eliminar: con el bloqueo encendido, el período declarado no se toca. */
export async function exigirPeriodoAbierto(control: ControlDePeriodos, periodo: string): Promise<void> {
  const estado = await control.estadoDe(periodo, 'bloquear');
  if (estado.bloquea) throw new PeriodoDeclarado(periodo);
}

interface Dependencias {
  control: ControlDePeriodos;
  datosFiscalesDeEmpresa: RepositorioDeDatosFiscalesDeEmpresa;
}

/** El período elegido y, si se cambió por estar declarado, el aviso que lo explica. */
export interface PeriodoElegido {
  periodo: string;
  aviso: string | null;
}

/** Lo que `revisar` necesita del documento: sus fechas y el período con que se va a registrar. */
export interface PeriodoDelDocumento {
  periodo: string;
  fechaDeRecepcion: string;
}

/**
 * El período de un documento frente al bloqueo de períodos declarados: elige el primero abierto cuando nadie pidió uno,
 * y al registrar rechaza (o en la vista previa avisa) si el pedido está declarado y bloqueado.
 */
export class GuardiaDelPeriodo {
  constructor(private readonly dependencias: Dependencias) {}

  /** El período pedido, o el que corresponde a las fechas; si ese está declarado y bloqueado, el primero abierto. */
  async elegir(operador: Operador, solicitud: SolicitudDeDocumento, fechaDeRecepcion: string): Promise<PeriodoElegido> {
    if (solicitud.periodo) return { periodo: solicitud.periodo, aviso: null };
    const propuesto = periodoPropuesto({
      tipo: solicitud.tipo,
      fechaDeEmision: solicitud.fechaEmision,
      fechaDeRecepcion,
    });
    const estado = await this.dependencias.control.estadoDe(propuesto, 'consultar');
    if (!estado.bloquea) return { periodo: propuesto, aviso: null };
    const alternativa = await this.alternativa(operador, solicitud, { periodo: propuesto, fechaDeRecepcion });
    if (alternativa.periodo === null) return { periodo: propuesto, aviso: null };
    return { periodo: alternativa.periodo, aviso: avisoDePeriodoCambiado(propuesto, alternativa) };
  }

  /**
   * Al registrar (`bloquear`) toma el período y lanza `PeriodoDeclarado` si está declarado y bloqueado; en la vista
   * previa solo avisa. Con el bloqueo apagado y el período declarado, el aviso cita la declaración.
   * @returns los avisos del período y si el período está declarado (para quitar el aviso genérico).
   */
  async revisar(
    operador: Operador,
    datos: { solicitud: SolicitudDeDocumento } & PeriodoDelDocumento,
    bloquear: boolean,
  ): Promise<{ avisos: string[]; declarado: boolean }> {
    const { periodo } = datos;
    const estado = await this.dependencias.control.estadoDe(periodo, bloquear ? 'bloquear' : 'consultar');
    if (!estado.declarado) return { avisos: [], declarado: false };
    if (!estado.bloquea) {
      const aviso = avisoDePeriodoDeclarado(periodo, estado.ultimaDeclaracion!);
      return { avisos: [aviso], declarado: true };
    }
    const alternativa = await this.alternativa(operador, datos.solicitud, datos);
    if (bloquear) throw new PeriodoDeclarado(periodo, alternativa);
    return { avisos: [avisoDePeriodoBloqueado(periodo, alternativa)], declarado: true };
  }

  private async alternativa(
    operador: Operador,
    solicitud: SolicitudDeDocumento,
    { periodo, fechaDeRecepcion }: PeriodoDelDocumento,
  ): Promise<PeriodoAbiertoPropuesto> {
    const datosDeLaEmpresa = await this.dependencias.datosFiscalesDeEmpresa.vigenteEn(operador.empresaId, periodo);
    return periodoAbiertoPropuesto({
      tipo: solicitud.tipo,
      fechaDeEmision: solicitud.fechaEmision,
      fechaDeRecepcion,
      conCredito: datosDeLaEmpresa?.daCreditoFiscal() ?? true,
      bloqueados: await this.dependencias.control.bloqueados(),
    });
  }
}
