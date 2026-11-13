import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { PublicadorEventos } from '../../../../core/compartido/aplicacion/publicador-eventos.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { FichaDelDocumentoPorPagarDto } from '../../dto/documento-por-pagar.dto.js';
import type { ConsultasDeDocumentos } from '../../puertos/puertos-de-consultas.js';
import type { TopeDeDiferenciaMenor, RepositorioDeAjustes } from '../../puertos/puertos-de-ajustes.js';
import type { FechasDeEntrada, RepositorioDeDocumentos } from '../../puertos/puertos-de-documentos.js';
import type { CargaInicial } from '../../puertos/puertos-de-saldos-iniciales.js';
import { puntoDeVistaDe } from '../consultas/dependencias-de-consultas.js';
import { fichaDeUnDocumento } from '../consultas/ficha-de-un-documento.js';
import { filaExistente } from '../aplicaciones/dependencias-de-aplicaciones.js';

/** El recurso con que se audita ajustar y anular un ajuste. */
export const RECURSO_DE_AJUSTES = 'cuentas-por-pagar.ajustes';

/** Lo que necesitan ajustar el saldo libre de una nota y anular un ajuste. */
export interface DependenciasDeAjustes {
  unidadDeTrabajo: UnidadDeTrabajo;
  documentos: RepositorioDeDocumentos;
  consultas: ConsultasDeDocumentos;
  ajustes: RepositorioDeAjustes;
  cargaInicial: CargaInicial;
  fechasDeEntrada: FechasDeEntrada;
  topeDeDiferencia: TopeDeDiferenciaMenor;
  auditoria: Auditoria;
  /** Se publica después de confirmar la transacción de la propia petición. */
  publicadorEventos: PublicadorEventos;
  reloj: Reloj;
}

/** La ficha de la nota como queda tras el cambio. */
export async function fichaDeLaNota(
  dependencias: DependenciasDeAjustes,
  operador: Operador,
  { notaId, fechaDeInicio }: { notaId: string; fechaDeInicio: string | null },
): Promise<FichaDelDocumentoPorPagarDto> {
  const { consultas, reloj, topeDeDiferencia } = dependencias;
  const extras = { fechaDeInicio, topeDiferenciaMenorCentavos: await topeDeDiferencia.centavos(operador) };
  const fila = await filaExistente(consultas, notaId);
  return fichaDeUnDocumento(consultas, fila, { vista: await puntoDeVistaDe(reloj, operador), extras });
}
