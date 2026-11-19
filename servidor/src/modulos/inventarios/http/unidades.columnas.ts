import type { Columna } from '../../core/intercambio/aplicacion/columnas.js';

/** Las columnas del Excel de las unidades de medida: los mismos datos del formulario, en el mismo orden. */
export const columnasDeUnidades = (): Columna[] => [
  { clave: 'nombre', titulo: 'Nombre', requerido: true, tipo: 'texto' },
  { clave: 'simbolo', titulo: 'Símbolo', requerido: true, tipo: 'texto' },
  {
    clave: 'magnitud',
    titulo: 'Magnitud',
    requerido: true,
    tipo: 'lista',
    opciones: {
      cantidad: 'Cantidad',
      masa: 'Masa',
      volumen: 'Volumen',
      longitud: 'Longitud',
      superficie: 'Superficie',
      empaque: 'Empaque',
    },
  },
  { clave: 'factorALaReferencia', titulo: 'Factor a la unidad de referencia', requerido: false, tipo: 'decimal' },
  { clave: 'activo', titulo: 'Activo', requerido: true, tipo: 'siNo' },
];
