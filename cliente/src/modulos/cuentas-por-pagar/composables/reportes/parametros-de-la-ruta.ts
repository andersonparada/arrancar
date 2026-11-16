import { esFechaCompleta } from './fechas-de-reportes';
import { VISTAS_DE_DOCUMENTOS, type VistaDeDocumentos } from './vistas-de-documentos';

type ValorDeRuta = unknown;

/** Lo que otro reporte pide al abrir este (`?proveedorId=…&corte=…`); lo que no sirve se descarta. */
export interface PedidoDesdeLaRuta {
  proveedorId: string;
  corte: string;
  vista: VistaDeDocumentos | '';
}

const textoDe = (valor: ValorDeRuta): string => (typeof valor === 'string' ? valor : '');
const ES_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Lee `proveedorId`, `corte` y `vista` de la consulta de la ruta, sin fiarse de lo que venga escrito en el enlace. */
export function pedidoDesdeLaRuta(consulta: Record<string, ValorDeRuta>): PedidoDesdeLaRuta {
  const proveedorId = textoDe(consulta.proveedorId);
  const corte = textoDe(consulta.corte);
  const vista = textoDe(consulta.vista);
  return {
    proveedorId: ES_UUID.test(proveedorId) ? proveedorId : '',
    corte: esFechaCompleta(corte) ? corte : '',
    vista: VISTAS_DE_DOCUMENTOS.some((v) => v.valor === vista) ? (vista as VistaDeDocumentos) : '',
  };
}
