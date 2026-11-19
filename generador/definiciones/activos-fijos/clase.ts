import { decimal, definirRecurso, entero, lista, texto } from '../../src/definicion/indice.js';

/**
 * Clase de activo fijo (AF-1 de `docs/modulos/diseno-activos-fijos.md`, §5.1): agrupa los activos con el mismo
 * trato fiscal y contable (inciso del art. 28 del ISR, porcentaje, vida útil y valor residual por omisión).
 * Se inactiva con auditoría; solo se elimina si no tiene activos ni conceptos ligados (a mano, sobre lo generado).
 * Genere su código con:
 *   npm run generar -- recurso activos-fijos/clase
 */
export const recurso = definirRecurso({
  modulo: 'activos-fijos',
  entidad: 'Clase',
  plural: 'Clases',
  textos: { singular: 'clase de activo', plural: 'clases de activos' },
  genero: 'femenino',
  alcance: 'empresa',
  pantalla: 'catalogo',
  seccion: 'administracion',
  icono: 'Shapes',
  baja: 'inactivar',
  campos: {
    nombre: texto({ requerido: true, unico: true, largoMaximo: 80 }),
    incisoFiscal: lista(
      {
        edificios: 'Edificios y construcciones (inciso 1)',
        plantaciones: 'Plantaciones productivas (inciso 2)',
        instalaciones_y_mobiliario: 'Instalaciones y mobiliario (inciso 3)',
        maquinaria_y_vehiculos: 'Maquinaria, vehículos y semovientes de trabajo (inciso 4)',
        computo: 'Equipo de cómputo (inciso 5)',
        herramientas: 'Herramientas (inciso 6)',
        reproductores: 'Reproductores (inciso 7)',
        otros_muebles: 'Otros bienes muebles (inciso 8)',
        intangibles: 'Intangibles (art. 33)',
        llave: 'Derecho de llave (art. 33)',
        terrenos: 'Terrenos (no se deprecian)',
      },
      { requerido: true, etiqueta: 'Inciso fiscal' },
    ),
    porcentajeFiscal: decimal({ requerido: true, decimales: 2, etiqueta: 'Porcentaje fiscal anual' }),
    vidaUtilContableMeses: entero({ minimo: 1, maximo: 1200, etiqueta: 'Vida útil contable (meses)' }),
    valorResidualPorcentaje: decimal({ requerido: true, decimales: 2, etiqueta: 'Valor residual (%)' }),
  },
});
