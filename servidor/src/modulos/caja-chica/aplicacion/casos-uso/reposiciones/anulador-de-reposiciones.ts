import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import { ReposicionAnulada } from '../../../dominio/eventos-de-reposiciones.js';
import type { Fondo } from '../../../dominio/fondos.js';
import { exigirQueAlcanceElEfectivo } from '../../../dominio/reglas-de-comprobantes.js';
import { exigirReposicionAnulable, exigirReposicionSinCobrar } from '../../../dominio/reglas-de-reposiciones.js';
import { fechaDeAnulacionDelCambio, exigirFondoAbierto } from '../../../dominio/reglas-del-fondo.js';
import { RECURSO_DE_REPOSICIONES, type Reposicion } from '../../../dominio/reposiciones.js';
import type { ReposicionDto } from '../../dto/reposiciones.dto.js';
import { efectivoEsperadoDelFondo } from '../comprobantes/utilidades-de-comprobantes.js';
import { firmadosDeLasLineas, lineasEmitidas } from './armado-de-la-reposicion.js';
import type { DependenciasDeReposiciones } from './dependencias-de-reposiciones.js';
import { LectorDeReposiciones } from './lector-de-reposiciones.js';

/** Lo que hizo Bancos con el cheque o la nota, para fechar la anulación. */
export interface DatosDeAnularLaReposicion {
  motivo: string;
  enBancos: 'sin_inverso' | 'con_inverso' | null;
  /** La fecha del inverso; solo con `con_inverso`. */
  fechaDelInverso: string | null;
}

type Dependencias = Pick<
  DependenciasDeReposiciones,
  'reposiciones' | 'consultas' | 'consultasDeFondos' | 'conciliacion' | 'libro' | 'auditoria' | 'reloj'
>;

/**
 * Anular una reposición, venga de la ventana de aquí o del aviso de Bancos: revisa que el fondo esté abierto, que el
 * banco no haya pagado el cheque y que el efectivo alcance para los comprobantes que vuelven a pendientes; deja la
 * reposición `anulada` con su fecha contable (sus comprobantes vuelven a pendientes), devuelve los documentos del libro a
 * «sin procesar», la audita como estaba y arma el evento que quien llama publica al confirmar.
 */
export class AnuladorDeReposiciones {
  private readonly lector: LectorDeReposiciones;

  constructor(private readonly dependencias: Dependencias) {
    this.lector = new LectorDeReposiciones(dependencias);
  }

  /** @throws FondoNoDisponible, ReposicionYaAnulada, ReposicionDelCierre, ReposicionCobrada, ComprobantesMayoresQueElEfectivo */
  async revisar(por: { fondo: Fondo; reposicion: Reposicion }): Promise<void> {
    const { fondo, reposicion } = por;
    exigirFondoAbierto(fondo);
    exigirReposicionAnulable(reposicion);
    if (reposicion.movimientoId !== null) {
      exigirReposicionSinCobrar(
        reposicion,
        await this.dependencias.conciliacion.estaConciliado(reposicion.movimientoId),
      );
    }
    const esperado = await efectivoEsperadoDelFondo(this.dependencias.consultasDeFondos, fondo.id);
    exigirQueAlcanceElEfectivo(esperado, reposicion.montoCentavos);
  }

  async anular(
    operador: Operador,
    por: { reposicion: Reposicion; datos: DatosDeAnularLaReposicion },
  ): Promise<EventoDominio[]> {
    const { reposicion, datos } = por;
    const anterior = await this.lector.leer(reposicion);
    const hoy = await this.dependencias.reloj.hoy(operador);
    const fechaDeAnulacion = fechaDeAnulacionDelCambio({ ...datos, fecha: reposicion.fecha, hoy });
    await this.dependencias.reposiciones.anular(reposicion.id, {
      anuladoPor: operador.usuarioId,
      motivo: datos.motivo,
      fechaDeAnulacion,
    });
    const documentos = anterior.lineas.map(({ comprobante }) => comprobante.documentoDeCompraId);
    await this.devolverLosDocumentos(operador, documentos);
    await this.auditar({ reposicion, anterior, motivo: datos.motivo });
    return [await this.evento(operador, { reposicion, fechaDeAnulacion, enBancos: datos.enBancos })];
  }

  private auditar(por: { reposicion: Reposicion; anterior: ReposicionDto; motivo: string }): Promise<void> {
    const { reposicion, anterior, motivo } = por;
    return this.dependencias.auditoria.registrar({
      recurso: RECURSO_DE_REPOSICIONES,
      registroId: reposicion.id,
      accion: 'anular',
      anterior,
      motivo,
    });
  }

  /** Los documentos del libro vuelven a «sin procesar»: ningún otro destino los tiene. */
  private async devolverLosDocumentos(operador: Operador, documentos: readonly (string | null)[]): Promise<void> {
    for (const documentoId of documentos) {
      if (documentoId !== null) await this.dependencias.libro.marcarProcesado(operador, documentoId, false);
    }
  }

  private async evento(
    operador: Operador,
    por: { reposicion: Reposicion; fechaDeAnulacion: string; enBancos: DatosDeAnularLaReposicion['enBancos'] },
  ): Promise<EventoDominio> {
    const { reposicion, fechaDeAnulacion, enBancos } = por;
    const { reposiciones, consultas } = this.dependencias;
    const [lineas, comprobantes] = await Promise.all([
      reposiciones.lineas(reposicion.id),
      consultas.comprobantesDe(reposicion.id),
    ]);
    return new ReposicionAnulada({
      empresaId: operador.empresaId,
      fondoId: reposicion.fondoId,
      reposicionId: reposicion.id,
      numero: reposicion.numero,
      fecha: reposicion.fecha,
      fechaDeAnulacion,
      montoCentavos: reposicion.montoCentavos,
      anulacionEnBancos: enBancos,
      lineas: lineasEmitidas(firmadosDeLasLineas(lineas, comprobantes)),
    });
  }
}
