import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { MotivoDeReaperturaInvalido, SoloSeReabreElUltimo } from '../../../dominio/errores-de-cierre.js';
import { DepreciacionReabierta } from '../../../dominio/eventos.js';
import type { CierreDto } from '../../dto/cierre.dto.js';
import type { DependenciasDeCierre } from './dependencias-de-cierre.js';
import { cierreADto, cierreConClasesADto } from './dtos-de-cierre.js';

interface ReaperturaPedida {
  periodo: string;
  motivo: string;
}

const MOTIVO_MAXIMO = 500;

export class ReabrirMes {
  constructor(private readonly dependencias: DependenciasDeCierre) {}

  /**
   * Reabre el último mes cerrado, con su motivo: sus cuotas dejan de ser vigentes (no se borran: conservan lo que se
   * informó) y el cierre queda `reabierto`. La auditoría guarda el cierre con su depreciación por clase. Al confirmar
   * publica `depreciacion_reabierta`. Para llegar a un mes anterior se reabre de uno en uno, del último hacia atrás.
   * @throws MotivoDeReaperturaInvalido si el motivo está vacío o pasa de 500 caracteres.
   * @throws SoloSeReabreElUltimo si el mes no es el último cerrado.
   */
  async ejecutar(operador: Operador, pedido: ReaperturaPedida): Promise<CierreDto> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const motivo = pedido.motivo.trim();
    if (motivo.length < 1 || motivo.length > MOTIVO_MAXIMO) throw new MotivoDeReaperturaInvalido();
    const { evento, dto } = await unidadDeTrabajo.ejecutar(operador, () =>
      this.reabrir(operador, { periodo: pedido.periodo, motivo }),
    );
    await publicadorEventos.publicar([evento]);
    return dto;
  }

  private async reabrir(operador: Operador, { periodo, motivo }: ReaperturaPedida) {
    const { cierres, repositorioCierres, consultas, auditoria } = this.dependencias;
    await cierres.bloquear('exclusivo');
    const ultimo = await cierres.ultimoMesCerrado();
    if (ultimo !== periodo) throw new SoloSeReabreElUltimo(ultimo);
    const anterior = await repositorioCierres.buscar(periodo);
    if (!anterior) throw new RecursoNoEncontrado('El cierre');
    const porClase = await consultas.totalesPorClase(periodo);
    await repositorioCierres.reabrir({ periodo, usuarioId: operador.usuarioId, ahora: new Date(), motivo });
    await auditoria.registrar({
      recurso: 'activos-fijos.cierres',
      registroId: `${operador.empresaId}:${periodo}`,
      accion: 'reabrir',
      anterior: cierreConClasesADto(anterior, porClase),
      motivo,
    });
    const evento = new DepreciacionReabierta({
      empresaId: operador.empresaId,
      periodo,
      totalContableCentavos: anterior.totalContableCentavos,
      totalFiscalCentavos: anterior.totalFiscalCentavos,
    });
    return { evento, dto: cierreADto((await repositorioCierres.buscar(periodo))!) };
  }
}
