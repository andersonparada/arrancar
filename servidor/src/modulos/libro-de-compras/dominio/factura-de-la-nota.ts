import { FacturaNoSirveParaLaNota } from './errores-de-documento.js';
import { FAMILIAS_QUE_ADMITEN_NOTA_DE_DEBITO, type TipoDeDocumento, type TipoDeNota } from './tipos-de-documento.js';

/** Lo que de la factura importa para saber si una nota puede corregirla. */
export interface FacturaDeLaNota {
  tipo: TipoDeDocumento;
  estado: 'vigente' | 'anulado';
  proveedorId: string;
  destino: string;
  muestraEnReportesSat: boolean;
}

/** La nota que se quiere registrar. */
export interface NotaPorRegistrar {
  tipo: TipoDeNota;
  proveedorId: string;
  /** `null` en la vista previa, que no exige destino. */
  destino: string | null;
  muestraEnReportesSat: boolean;
}

const NOMBRE_DE_LA_NOTA: Record<TipoDeNota, string> = {
  nota_de_credito: 'nota de crédito',
  nota_de_debito: 'nota de débito',
};

/**
 * La factura de una nota (de crédito o de débito) debe ser de una familia que admite notas, vigente, del mismo
 * proveedor y destino, y con la misma casilla «Se muestra en reportes SAT» que la nota: ambas van en el libro o
 * ambas quedan fuera (la nota de débito va siempre en el libro, lo revisa también la base).
 * La factura especial se revisa antes, con su propio error.
 * @throws FacturaNoSirveParaLaNota.
 */
export function exigirFacturaQueAdmiteLaNota(factura: FacturaDeLaNota, nota: NotaPorRegistrar): void {
  const nombre = NOMBRE_DE_LA_NOTA[nota.tipo];
  if (factura.estado !== 'vigente' || !FAMILIAS_QUE_ADMITEN_NOTA_DE_DEBITO.includes(factura.tipo)) {
    throw new FacturaNoSirveParaLaNota(`La ${nombre} debe corregir una factura vigente.`);
  }
  if (factura.proveedorId !== nota.proveedorId || (nota.destino !== null && factura.destino !== nota.destino)) {
    throw new FacturaNoSirveParaLaNota('La factura debe ser del mismo proveedor y del mismo destino que la nota.');
  }
  if (factura.muestraEnReportesSat !== nota.muestraEnReportesSat) {
    throw new FacturaNoSirveParaLaNota(
      `La ${nombre} y su factura deben ir las dos en los reportes SAT o las dos fuera de ellos.`,
    );
  }
}
