import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { MesDeInventarioCerrado } from '../../../dominio/eventos.js';
import {
  CierreConBloqueos,
  MesAnteriorSinCerrar,
  MesPorLlegar,
  RevisionDelCierreDesactualizada,
} from '../../../dominio/errores-de-cierre.js';
import type { CierreDto } from '../../dto/cierre.dto.js';
import type { VistaDelKardex } from '../../dto/documento.dto.js';
import { ArmadorDelCierre, type CierreArmado } from './armador-del-cierre.js';
import type { DependenciasDeCierres } from './dependencias-de-cierres.js';
import { cierreADto, revisionADto, totalesADto } from './dtos-de-cierre.js';
import { exigirAlcanceTotal } from './revisar-cierre.js';

interface CierrePedido {
  periodo: string;
  /** La huella de la revisión que vio quien cierra: si ya cambió, se rechaza. */
  huella?: string | null;
  vista: VistaDelKardex;
}

export class CerrarMes {
  private readonly armador: ArmadorDelCierre;

  constructor(private readonly dependencias: DependenciasDeCierres) {
    this.armador = new ArmadorDelCierre(dependencias);
  }

  /**
   * Cierra el mes: con el candado exclusivo del cierre (nadie mueve el kardex mientras tanto) vuelve a valuar lo que se
   * revisó, guarda el cierre con la foto de sus existencias y deja constancia en la auditoría. Al confirmar publica
   * `mes_cerrado`. Cerrar de nuevo un mes cerrado se rechaza sin tocar nada.
   * @throws CierreSinAlcanceTotal si el usuario no ve todas las bodegas.
   * @throws MesCerrado, MesAnteriorAlInicio o SinMesPorCerrar si el mes no es el que toca.
   * @throws MesPorLlegar si el mes es posterior al mes en curso.
   * @throws MesAnteriorSinCerrar si antes hay un mes sin cerrar.
   * @throws RevisionDelCierreDesactualizada si llegó una huella y ya no coincide.
   * @throws CierreConBloqueos si la revisión tiene hallazgos que bloquean.
   * @throws FotoDelCierreNoCuadra si las bodegas de un artículo no suman su existencia.
   */
  async ejecutar(operador: Operador, pedido: CierrePedido): Promise<CierreDto> {
    exigirAlcanceTotal(pedido.vista);
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { evento, dto } = await unidadDeTrabajo.ejecutar(operador, () => this.cerrar(operador, pedido));
    await publicadorEventos.publicar([evento]);
    return dto;
  }

  private async cerrar(operador: Operador, { periodo, huella }: CierrePedido) {
    const { cierres, auditoria } = this.dependencias;
    await cierres.bloquear();
    const armado = await this.armador.armar(operador, periodo);
    this.exigirCerrable(armado, huella);
    const { totales, renglones, regimenIsr } = armado;
    const metodo = armado.metodo!;
    await cierres.guardar({
      empresaId: operador.empresaId,
      periodo,
      cerradoPor: operador.usuarioId,
      ahora: new Date(),
      metodo,
      regimenIsr,
      totales,
      renglones,
    });
    await auditoria.registrar({
      recurso: 'inventarios.cierres',
      registroId: `${operador.empresaId}:${periodo}`,
      accion: 'cerrar',
      anterior: { periodo, ...totalesADto(totales), metodo, regimenIsr },
    });
    return { evento: this.evento(operador, armado), dto: cierreADto((await cierres.buscar(periodo))!) };
  }

  private exigirCerrable(armado: CierreArmado, huella: string | null | undefined): void {
    if (armado.porLlegar) throw new MesPorLlegar(armado.periodo);
    if (armado.siguiente !== armado.periodo) throw new MesAnteriorSinCerrar(armado.siguiente);
    if (huella && huella !== armado.huella) throw new RevisionDelCierreDesactualizada(revisionADto(armado));
    if (armado.hallazgos.some((hallazgo) => hallazgo.nivel === 'bloquea'))
      throw new CierreConBloqueos(revisionADto(armado));
  }

  private evento(operador: Operador, { periodo, totales }: CierreArmado) {
    return new MesDeInventarioCerrado({
      empresaId: operador.empresaId,
      periodo,
      valorTotalCentavos: Number(totales.valorTotal),
      porTipo: totales.porTipo.map(({ tipoDeInventario, valor }) => ({
        tipoDeInventario,
        valorCentavos: Number(valor),
      })),
    });
  }
}
