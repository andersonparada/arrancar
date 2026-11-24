import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { MotivoDeReaperturaInvalido, SoloSeReabreElUltimo } from '../../../dominio/errores-de-cierre.js';
import { MesDeInventarioReabierto } from '../../../dominio/eventos.js';
import type { CierreDto } from '../../dto/cierre.dto.js';
import type { VistaDelKardex } from '../../dto/documento.dto.js';
import type { DependenciasDeCierres } from './dependencias-de-cierres.js';
import { cierreADto, cierreConTiposADto } from './dtos-de-cierre.js';
import { exigirAlcanceTotal } from './revisar-cierre.js';

interface ReaperturaPedida {
  periodo: string;
  motivo: string;
  vista: VistaDelKardex;
}

const MOTIVO_MAXIMO = 500;

export class ReabrirMes {
  constructor(private readonly dependencias: DependenciasDeCierres) {}

  /**
   * Reabre el último mes cerrado, con su motivo: su foto deja de ser vigente (no se borra: conserva lo que se informó)
   * y el cierre queda `reabierto`. La auditoría guarda el cierre con su valor por tipo de inventario. Al confirmar
   * publica `mes_reabierto`. Para llegar a un mes anterior se reabre de uno en uno, del último hacia atrás.
   * @throws CierreSinAlcanceTotal si el usuario no ve todas las bodegas.
   * @throws MotivoDeReaperturaInvalido si el motivo está vacío o pasa de 500 caracteres.
   * @throws SoloSeReabreElUltimo si el mes no es el último cerrado.
   */
  async ejecutar(operador: Operador, pedido: ReaperturaPedida): Promise<CierreDto> {
    exigirAlcanceTotal(pedido.vista);
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const motivo = pedido.motivo.trim();
    if (motivo.length < 1 || motivo.length > MOTIVO_MAXIMO) throw new MotivoDeReaperturaInvalido();
    const { evento, dto } = await unidadDeTrabajo.ejecutar(operador, () =>
      this.reabrir(operador, { periodo: pedido.periodo, motivo }),
    );
    await publicadorEventos.publicar([evento]);
    return dto;
  }

  private async reabrir(operador: Operador, { periodo, motivo }: { periodo: string; motivo: string }) {
    const { cierres, auditoria } = this.dependencias;
    await cierres.bloquear();
    const ultimo = await cierres.ultimoMesCerrado();
    if (ultimo !== periodo) throw new SoloSeReabreElUltimo(ultimo);
    const anterior = await cierres.buscar(periodo);
    if (!anterior) throw new RecursoNoEncontrado('El cierre');
    const porTipo = await cierres.totalesPorTipo(periodo);
    await cierres.reabrir({ periodo, usuarioId: operador.usuarioId, ahora: new Date(), motivo });
    await auditoria.registrar({
      recurso: 'inventarios.cierres',
      registroId: `${operador.empresaId}:${periodo}`,
      accion: 'reabrir',
      anterior: cierreConTiposADto(anterior, porTipo),
      motivo,
    });
    const evento = new MesDeInventarioReabierto({
      empresaId: operador.empresaId,
      periodo,
      valorTotalCentavos: Number(anterior.valorTotal),
      porTipo: porTipo.map(({ tipoDeInventario, valor }) => ({ tipoDeInventario, valorCentavos: Number(valor) })),
    });
    return { evento, dto: cierreADto((await cierres.buscar(periodo))!) };
  }
}
