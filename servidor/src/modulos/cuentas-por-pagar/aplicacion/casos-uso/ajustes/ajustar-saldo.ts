import { aCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { EFECTO_DE_LA_CAUSA } from '../../../dominio/ajustes.js';
import { motivoValido } from '../../../dominio/ciclo-de-vida.js';
import { AjusteRegistrado } from '../../../dominio/eventos-de-ajustes.js';
import type { DocumentoPorPagar } from '../../../dominio/documento-por-pagar.js';
import {
  exigirFechaDeAjuste,
  exigirNotaQueSeAjusta,
  validarAjuste,
  type AjusteValido,
} from '../../../dominio/reglas-de-ajuste.js';
import type { FichaDelDocumentoPorPagarDto } from '../../dto/documento-por-pagar.dto.js';
import { dtoDeFicha } from '../../dto/ficha-del-documento.dto.js';
import { bloquear } from '../acciones/dependencias-de-acciones.js';
import { filaExistente, saldoDeLaFila } from '../aplicaciones/dependencias-de-aplicaciones.js';
import { fichaDeLaNota, RECURSO_DE_AJUSTES, type DependenciasDeAjustes } from './dependencias-de-ajustes.js';

export interface PeticionDeAjuste {
  notaId: string;
  /** Dinero como texto con dos decimales. */
  monto: string;
  /** `AAAA-MM-DD`; hoy si falta. */
  fecha?: string;
  causa: string;
  motivo: string;
  referencia?: string | null;
}

/**
 * Da de baja (todo o parte) el saldo libre de una nota de crédito registrada o autorizada (U13). Pide la carga inicial
 * antes de bloquear la nota; audita `ajustar` con la ficha de la nota como estaba y publica `ajuste_registrado` al
 * confirmar.
 */
export class AjustarSaldo {
  constructor(private readonly dependencias: DependenciasDeAjustes) {}

  /**
   * @throws RecursoNoEncontrado si la nota no existe.
   * @throws MotivoInvalido, NoEsNotaConSaldo, NotaPendienteNoSeAjusta, CausaDeAjusteInvalida, MontoDeAjusteInvalido,
   * AjusteMayorQueElSaldoLibre, DiferenciaMenorSobreElTope, ReferenciaObligatoria, FechaDeAjusteInvalida
   */
  async ejecutar(operador: Operador, pedido: PeticionDeAjuste): Promise<FichaDelDocumentoPorPagarDto> {
    const motivo = motivoValido(pedido.motivo);
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const resultado = await unidadDeTrabajo.ejecutar(operador, async () => {
      const { fechaDeInicio } = await this.dependencias.cargaInicial.obtener(operador);
      const evento = await this.ajustar(operador, { ...pedido, motivo }, fechaDeInicio);
      const ficha = await fichaDeLaNota(this.dependencias, operador, { notaId: pedido.notaId, fechaDeInicio });
      return { evento, ficha };
    });
    await publicadorEventos.publicar([resultado.evento]);
    return resultado.ficha;
  }

  private async ajustar(
    operador: Operador,
    pedido: PeticionDeAjuste,
    fechaDeInicio: string | null,
  ): Promise<AjusteRegistrado> {
    const { documentos } = this.dependencias;
    const guardado = await bloquear(documentos, pedido.notaId);
    exigirNotaQueSeAjusta(guardado.documento);
    const valido = await this.datosValidos(operador, guardado.documento, pedido);
    const fecha = await this.fechaValida(operador, pedido, fechaDeInicio);
    const ajusteId = await this.dependencias.ajustes.agregar(guardado.documento, {
      ...valido,
      fecha,
      motivo: pedido.motivo,
    });
    await this.dependencias.auditoria.registrar({
      recurso: RECURSO_DE_AJUSTES,
      registroId: ajusteId,
      accion: 'ajustar',
      anterior: dtoDeFicha(guardado),
      motivo: pedido.motivo,
    });
    return eventoDeAjuste({ empresaId: operador.empresaId, ajusteId, nota: guardado.documento, valido, fecha });
  }

  private async datosValidos(operador: Operador, documento: DocumentoPorPagar, pedido: PeticionDeAjuste) {
    const { consultas, topeDeDiferencia } = this.dependencias;
    const saldoLibreCentavos = saldoDeLaFila(await filaExistente(consultas, pedido.notaId));
    const datos = { montoCentavos: aCentavos(pedido.monto), causa: pedido.causa, referencia: pedido.referencia };
    return validarAjuste({ documento, saldoLibreCentavos }, datos, await topeDeDiferencia.centavos(operador));
  }

  private async fechaValida(operador: Operador, pedido: PeticionDeAjuste, fechaDeInicio: string | null) {
    const hoy = await this.dependencias.reloj.hoy(operador);
    const fecha = pedido.fecha ?? hoy;
    const recepciones = await this.dependencias.fechasDeEntrada.deDocumentos([pedido.notaId]);
    exigirFechaDeAjuste(fecha, hoy, { recepcion: recepciones.get(pedido.notaId) ?? null, fechaDeInicio });
    return fecha;
  }
}

function eventoDeAjuste(datos: {
  empresaId: string;
  ajusteId: string;
  nota: DocumentoPorPagar;
  valido: AjusteValido;
  fecha: string;
}): AjusteRegistrado {
  const { nota, valido, ...resto } = datos;
  return new AjusteRegistrado({
    empresaId: resto.empresaId,
    ajusteId: resto.ajusteId,
    documentoId: nota.id,
    proveedorId: nota.proveedorId,
    serie: nota.serie,
    numero: nota.numero,
    montoCentavos: valido.montoCentavos,
    fecha: resto.fecha,
    causa: valido.causa,
    efecto: EFECTO_DE_LA_CAUSA[valido.causa],
    referencia: valido.referencia,
  });
}
