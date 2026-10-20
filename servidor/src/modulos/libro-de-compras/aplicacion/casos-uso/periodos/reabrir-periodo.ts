import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { PeriodoReabierto } from '../../../dominio/eventos.js';
import { PeriodoNoDeclarado } from '../../../dominio/periodos/errores-de-periodos.js';
import { motivoDelPeriodoValido } from '../../../dominio/periodos/reglas-de-declaracion.js';
import { dtoDeDeclaracion, dtoDePeriodo, type ResultadoDeCambioDePeriodoDto } from '../../dto/periodo.dto.js';
import type { DeclaracionGuardada, DeclaracionNueva, FilaDePeriodo } from '../../puertos/puertos-de-periodos.js';
import { periodoDelLibro } from '../libro/consultar-libro.js';
import type { DependenciasDePeriodos } from './dependencias-de-periodos.js';

export interface PeticionDeReapertura {
  periodo: string;
  motivo: string;
}

/** La fila del historial de una reapertura: solo el motivo, sin formulario ni foto. */
const declaracionDeReapertura = (periodo: string, motivo: string): DeclaracionNueva => ({
  periodo,
  evento: 'reapertura',
  formulario: null,
  numeroDeFormulario: null,
  fechaDePresentacion: null,
  tipoDeLibro: null,
  foto: null,
  diferencia: null,
  motivo,
});

/**
 * Reabre un período declarado, con su motivo: vuelve a admitir registros, anulaciones y eliminaciones, deja la
 * reapertura en el historial y la auditoría `reabrir` con la fila y su última declaración. Después de cambiar lo
 * que haga falta se declara de nuevo (rectificación).
 */
export class ReabrirPeriodo {
  constructor(private readonly dependencias: DependenciasDePeriodos) {}

  /** @throws MotivoDelPeriodoInvalido si falta o pasa de 500 caracteres; PeriodoNoDeclarado si no está declarado. */
  async ejecutar(operador: Operador, peticion: PeticionDeReapertura): Promise<ResultadoDeCambioDePeriodoDto> {
    const motivo = motivoDelPeriodoValido(peticion.motivo);
    const periodo = periodoDelLibro(peticion.periodo);
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const resultado = await unidadDeTrabajo.ejecutar(operador, () => this.reabrir(operador, { periodo, motivo }));
    await publicadorEventos.publicar([new PeriodoReabierto({ empresaId: operador.empresaId, periodo })]);
    return resultado;
  }

  private async reabrir(
    operador: Operador,
    { periodo, motivo }: PeticionDeReapertura,
  ): Promise<ResultadoDeCambioDePeriodoDto> {
    const { periodos, reloj } = this.dependencias;
    const fila = await periodos.bloquear(operador.empresaId, periodo);
    if (fila.estado !== 'declarado') throw new PeriodoNoDeclarado(periodo);
    const historial = await periodos.historial(periodo);
    const ultima = historial.filter((declaracion) => declaracion.evento !== 'reapertura').at(-1) ?? null;
    await this.auditar(operador, fila, { ultima, motivo });
    const reapertura = await periodos.agregarDeclaracion(operador.empresaId, declaracionDeReapertura(periodo, motivo));
    await periodos.reabrir(operador.empresaId, periodo);
    const hoy = await reloj.hoy(operador);
    return {
      periodo: dtoDePeriodo(periodo, { fila: await periodos.buscar(periodo), ultima, hoy }),
      declaracion: dtoDeDeclaracion(reapertura, false),
      avisos: [],
    };
  }

  private auditar(
    operador: Operador,
    fila: FilaDePeriodo,
    { ultima, motivo }: { ultima: DeclaracionGuardada | null; motivo: string },
  ) {
    return this.dependencias.auditoria.registrar({
      recurso: 'libro-de-compras.periodos',
      registroId: `${operador.empresaId}:${fila.periodo}`,
      accion: 'reabrir',
      anterior: {
        periodo: fila.periodo,
        estado: fila.estado,
        declaradoEn: fila.declaradoEn,
        declaradoPor: fila.declaradoPor,
        ultimaDeclaracion: ultima ? dtoDeDeclaracion(ultima, false) : null,
      },
      motivo,
    });
  }
}
