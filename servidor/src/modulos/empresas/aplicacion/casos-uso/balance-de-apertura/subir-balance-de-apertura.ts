import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { BalanceDeAperturaFijo, BalanceDeAperturaNoEsPdf, FechaDeInicioRequerida } from '../../../dominio/errores.js';
import type { CargaInicialDto } from '../../dto/datos-de-empresa.dto.js';
import { RECURSO_DE_BALANCES_DE_APERTURA, type DependenciasDelBalanceDeApertura } from './dependencias.js';

const TIPO_PDF = 'application/pdf';

export interface SubidaDeBalance {
  empresaId: string;
  contenido: Buffer;
  /** Como lo llamó quien lo subió; solo para mostrar. */
  nombre: string | null;
}

/**
 * Adjunta el balance de apertura firmado (solo PDF). Con la carga abierta reemplaza el anterior (que se borra con rastro
 * en la auditoría); con la carga cerrada solo se puede subir si falta, porque el balance que respalda el cierre no
 * cambia sin reabrir. Va en tres tiempos para no retener una conexión mientras qpdf revisa el PDF: (a) una unidad corta
 * que falla rápido, (b) la revisión fuera de toda transacción y (c) la unidad que bloquea la carga y guarda.
 */
export class SubirBalanceDeApertura {
  constructor(private readonly dependencias: DependenciasDelBalanceDeApertura) {}

  /**
   * @throws FechaDeInicioRequerida si aún no hay fecha de inicio.
   * @throws BalanceDeAperturaFijo si la carga está cerrada y ya tiene balance (qpdf ni se llama).
   * @throws BalanceDeAperturaNoEsPdf si el archivo (foto) no es un PDF: no queda nada guardado.
   * @throws RevisionDePdfSaturada (429), o un error de PDF o de foto (400), si el core no acepta el archivo.
   */
  async ejecutar(operador: Operador, { empresaId, contenido, nombre }: SubidaDeBalance): Promise<CargaInicialDto> {
    const { ejecutorEnEmpresa, documentos } = this.dependencias;
    const delaEmpresa = { ...operador, empresaId };
    await ejecutorEnEmpresa.ejecutar(operador, empresaId, () => this.exigirPoderSubir(empresaId));
    const revisado = await documentos.revisar(delaEmpresa, contenido, nombre);
    return ejecutorEnEmpresa.ejecutar(operador, empresaId, async () => {
      const carga = await this.dependencias.repositorioCargas.buscar(Identificador.desde(empresaId));
      if (!carga) throw new FechaDeInicioRequerida();
      carga.exigirPoderAdjuntarElBalance();
      const antes = await this.dependencias.consultas.cargaInicial(empresaId);
      const guardado = await documentos.guardarRevisado(delaEmpresa, revisado, {
        recursoDueno: RECURSO_DE_BALANCES_DE_APERTURA,
      });
      if (guardado.tipoMime !== TIPO_PDF) throw new BalanceDeAperturaNoEsPdf();
      const idAnterior = carga.adjuntarBalanceDeApertura(guardado.id);
      await this.dependencias.repositorioCargas.guardar(carga);
      if (idAnterior) await this.borrarElAnterior(empresaId, idAnterior, antes);
      return this.dependencias.consultas.cargaInicial(empresaId);
    });
  }

  private async exigirPoderSubir(empresaId: string): Promise<void> {
    const carga = await this.dependencias.consultas.cargaInicial(empresaId);
    if (carga.fechaDeInicio === null) throw new FechaDeInicioRequerida();
    if (carga.cerrada && carga.balanceDeApertura !== null) throw new BalanceDeAperturaFijo();
  }

  private async borrarElAnterior(empresaId: string, archivoId: string, antes: CargaInicialDto): Promise<void> {
    const { documentos, auditoria } = this.dependencias;
    await documentos.eliminar(archivoId, RECURSO_DE_BALANCES_DE_APERTURA);
    await auditoria.registrar({
      recurso: 'empresas.cargas-iniciales',
      registroId: empresaId,
      accion: 'quitar',
      anterior: { balanceDeApertura: antes.balanceDeApertura },
    });
  }
}
