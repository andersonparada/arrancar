import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { Costo } from '../../../dominio/costo.js';
import { CostoInvalido } from '../../../dominio/errores-de-costo.js';
import type { CostoDto, SolicitudDeCostoManual } from '../../dto/costo.dto.js';
import type { DependenciasDeCostos } from './dependencias-de-costos.js';
import { eventoDeCapitalizacion } from './eventos-de-costos.js';

interface CostoManualPedido {
  activoId: string;
  solicitud: SolicitudDeCostoManual;
}

export class RegistrarCostoManual {
  constructor(private readonly dependencias: DependenciasDeCostos) {}

  /**
   * Suma un costo a mano a un activo (E3): importación (DUCA), planilla de construcción, aporte, donación… con su
   * documento de soporte; con motivo puede quedar fuera del libro fiscal (V-8). Al confirmar publica `activo_capitalizado`.
   * @throws RecursoNoEncontrado si el activo no existe.
   * @throws ActivoDeTercerosSinCostos, ActivoDadoDeBaja o CostoPosteriorNoDisponible si el activo no admite costos.
   * @throws CostoInvalido si falta el soporte o el motivo, la fecha es futura o la marca de edificación no aplica.
   */
  async ejecutar(operador: Operador, { activoId, solicitud }: CostoManualPedido): Promise<CostoDto> {
    const { unidadDeTrabajo, publicadorEventos, consultasDeCostos } = this.dependencias;
    const { costo, evento } = await unidadDeTrabajo.ejecutar(operador, async () => {
      const resultado = await this.registrar(operador, { activoId, solicitud });
      return { ...resultado, costo: await consultasDeCostos.obtener(resultado.costoId) };
    });
    await publicadorEventos.publicar([evento]);
    return costo;
  }

  private async registrar(operador: Operador, { activoId, solicitud }: CostoManualPedido) {
    const { repositorio, costos, clases, reloj } = this.dependencias;
    const [activo] = await repositorio.buscarBloqueando([activoId]);
    if (!activo) throw new RecursoNoEncontrado('El activo');
    activo.exigirAdmiteCostos();
    const hoy = await reloj.hoy(operador);
    if (solicitud.fecha > hoy) throw new CostoInvalido('La fecha del costo no puede ser futura.');
    const clase = await clases.buscar(Identificador.desde(activo.instantanea().claseId));
    const incisoFiscal = clase!.instantanea().incisoFiscal;
    if (solicitud.noEsEdificacion && incisoFiscal !== 'edificios')
      throw new CostoInvalido('"No es edificación" solo se marca en los activos de la clase Edificios.');
    const costo = Costo.manual(Identificador.desde(operador.empresaId), activoId, solicitud);
    await costos.agregarVarios([costo]);
    return { costoId: costo.id.valor, evento: eventoDeCapitalizacion({ activo, incisoFiscal }, [costo], hoy) };
  }
}
