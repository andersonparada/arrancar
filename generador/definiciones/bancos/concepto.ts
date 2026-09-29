import { definirRecurso, texto, siNo, lista } from '../../src/definicion/indice.js';

/**
 * Concepto bancario: clasifica cada nota y cada cheque (H3 del plan de hallazgos
 * contables). Lo edita el usuario; la semilla es solo un punto de partida.
 * Genere su código con:
 *   npm run generar -- recurso bancos/concepto
 */
export const recurso = definirRecurso({
  modulo: 'bancos',
  entidad: 'Concepto',
  plural: 'Conceptos',
  textos: { singular: 'concepto', plural: 'conceptos' },
  genero: 'masculino',
  alcance: 'empresa',
  pantalla: 'catalogo',
  seccion: 'administracion',
  icono: 'Tags',
  baja: 'inactivar',
  campos: {
    nombre: texto({ requerido: true, unico: true }),
    aplicaA: lista(
      { credito: 'Nota de crédito', debito: 'Nota de débito', ambos: 'Ambas' },
      { requerido: true, etiqueta: 'Aplica a' },
    ),
    actividadDeFlujo: lista(
      { operacion: 'Operación', inversion: 'Inversión', financiamiento: 'Financiamiento', ninguna: 'Ninguna' },
      { requerido: true, etiqueta: 'Actividad del flujo de efectivo' },
    ),
    grupoDeFlujo: texto({ etiqueta: 'Grupo del flujo de efectivo' }),
    esCargoBancario: siNo({ etiqueta: 'Lo origina el banco' }),
    pideDatosDeIntereses: siNo({ etiqueta: 'Pide datos de intereses' }),
    admiteFactura: siNo({ etiqueta: 'Admite factura' }),
  },
});
