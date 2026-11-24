import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import { formatearCantidad, formatearFecha, formatearOpcion, formatearTexto } from '@/modulos/core/utilidades/formato';
import type { Medicion } from '../../servicios/mediciones.api';
import { ABREVIATURAS_DE_UNIDAD } from '../superficie/unidades-de-superficie';
import type { MostrarSuperficie } from '../parcelas/detalles-de-parcela';
import { OPCIONES_DE_FUENTE } from './edicion-de-medicion';

/** La cifra tal como se escribió: «16.00 cda de 25 varas por lado» (las varas solo si es cuerda). */
export function cifraOriginal(medicion: Medicion): string {
  const cifra = formatearCantidad(medicion.cantidadOriginal, ABREVIATURAS_DE_UNIDAD[medicion.unidadOriginal], 4);
  return medicion.varasPorLadoDeCuerda === null ? cifra : `${cifra} de ${medicion.varasPorLadoDeCuerda} varas por lado`;
}

/** Lo que muestra la tarjeta de una medición: lo que se midió, de dónde sale y, si se anuló, por qué. */
export function detallesDeMedicion(medicion: Medicion, mostrar: MostrarSuperficie): DetalleDeRegistro[] {
  const detalles: DetalleDeRegistro[] = [
    { etiqueta: 'Superficie total', valor: mostrar(medicion.superficieTotalM2) },
    { etiqueta: 'Superficie útil', valor: mostrar(medicion.superficieUtilM2) },
    { etiqueta: 'Cifra original', valor: cifraOriginal(medicion) },
    { etiqueta: 'Fuente', valor: formatearOpcion(OPCIONES_DE_FUENTE, medicion.fuente) },
    { etiqueta: 'Documento', valor: formatearTexto(medicion.documento) },
  ];
  if (medicion.estado === 'anulada') {
    detalles.push({
      etiqueta: `Anulada el ${formatearFecha(medicion.anuladaEn)}`,
      valor: formatearTexto(medicion.motivoDeAnulacion),
      largo: true,
    });
  }
  return detalles;
}
