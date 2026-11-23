import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { aCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type { LineaEscrita } from '../../../dominio/calculo-de-lineas.js';
import type { SolicitudDeLineaDeVenta } from '../../dto/solicitud-de-documento.js';
import { ConceptoDeIngresoInactivo } from '../../errores.js';
import type { CatalogosParaDocumentos, ConceptoParaLinea } from '../../puertos/puertos-de-documentos.js';

/** Las líneas escritas con su dinero en centavos, y si alguna vende un activo fijo (concepto de sistema). */
export interface LineasResueltas {
  lineas: LineaEscrita[];
  tieneVentaDeActivo: boolean;
}

function lineaEscrita(linea: SolicitudDeLineaDeVenta, concepto: ConceptoParaLinea): LineaEscrita {
  return {
    conceptoDeIngresoId: concepto.id,
    tipo: linea.tipo ?? concepto.tipo,
    claseFiscal: linea.claseFiscal ?? 'gravada',
    descripcion: linea.descripcion,
    total: aCentavos(linea.total),
    otrosImpuestos: linea.otrosImpuestos ? aCentavos(linea.otrosImpuestos) : 0,
  };
}

/**
 * Cada línea con su concepto de ingreso (debe existir en la empresa y estar activo): lo que falta de tipo sale del
 * concepto y la clase fiscal por omisión es `gravada`.
 * @throws RecursoNoEncontrado si un concepto no existe; ConceptoDeIngresoInactivo si está inactivo.
 */
export async function resolverLineas(
  catalogos: Pick<CatalogosParaDocumentos, 'conceptos'>,
  lineas: readonly SolicitudDeLineaDeVenta[],
): Promise<LineasResueltas> {
  const ids = [...new Set(lineas.map((linea) => linea.conceptoDeIngresoId))];
  const conceptos = new Map((await catalogos.conceptos(ids)).map((concepto) => [concepto.id, concepto]));
  const resueltas = lineas.map((linea) => {
    const concepto = conceptos.get(linea.conceptoDeIngresoId);
    if (!concepto) throw new RecursoNoEncontrado('El concepto de ingreso');
    if (!concepto.activo) throw new ConceptoDeIngresoInactivo();
    return { escrita: lineaEscrita(linea, concepto), concepto };
  });
  return {
    lineas: resueltas.map(({ escrita }) => escrita),
    tieneVentaDeActivo: resueltas.some(({ concepto }) => concepto.claveDeSistema === 'venta_de_activo_fijo'),
  };
}
