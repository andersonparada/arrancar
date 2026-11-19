import type { Activo } from '../../servicios/activos.api';

/** Una marca de la tarjeta del activo; el tono es el de `InsigniaBase`. */
export interface EtiquetaDeActivo {
  texto: string;
  tono: 'campo' | 'trigo' | 'tierra' | 'rojo';
}

type DatosDeEtiqueta = Pick<Activo, 'estado' | 'ocioso' | 'enBodega' | 'tipoDeRegistro'>;

/**
 * Las etiquetas que explican el estado del activo (diseño §12). «Depreciado contable» y «Depreciado fiscal» llegan
 * con las cuotas (AF-5): hoy ningún activo tiene libros.
 */
export function etiquetasDeActivo(activo: DatosDeEtiqueta): EtiquetaDeActivo[] {
  const etiquetas: EtiquetaDeActivo[] = [];
  if (activo.estado === 'en_construccion') etiquetas.push({ texto: 'En construcción o en tránsito', tono: 'trigo' });
  if (activo.estado === 'dado_de_baja') etiquetas.push({ texto: 'Dado de baja', tono: 'rojo' });
  if (activo.ocioso) etiquetas.push({ texto: 'Ocioso', tono: 'trigo' });
  if (activo.enBodega && activo.estado !== 'dado_de_baja') etiquetas.push({ texto: 'En bodega', tono: 'campo' });
  if (activo.tipoDeRegistro === 'de_terceros') etiquetas.push({ texto: 'De terceros', tono: 'tierra' });
  if (activo.tipoDeRegistro === 'bien_de_control') etiquetas.push({ texto: 'Control', tono: 'tierra' });
  return etiquetas;
}
