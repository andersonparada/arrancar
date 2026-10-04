import { z } from 'zod';
import { definirConfiguracion, type DefinicionConfiguracion } from '../core/modulos-sistema/definicion-modulo.js';

const porcentaje = z.number().min(0).max(100).multipleOf(0.01);
const monto = z.number().nonnegative().multipleOf(0.01);
const dias = z.number().int().positive();

/** Una variable: clave, descripción, esquema y valor por omisión. */
type Fila = [clave: string, descripcion: string, esquema: z.ZodType<number>, predeterminado: number];

/** Variable de instalación (la ley es igual para todas las empresas; solo soporte la cambia). */
function deInstalacion([clave, descripcion, esquema, predeterminado]: Fila): DefinicionConfiguracion {
  return definirConfiguracion({
    clave,
    descripcion,
    esquema,
    predeterminado,
    niveles: ['instalacion'],
    publica: false,
  });
}

const filas: Fila[] = [
  ['libro-de-compras.iva.tasa', 'Tasa del IVA, en porcentaje.', porcentaje, 12],
  [
    'libro-de-compras.retenciones_iva.exportador_agropecuario',
    'Porcentaje del IVA que retiene el exportador a un proveedor agropecuario.',
    porcentaje,
    65,
  ],
  [
    'libro-de-compras.retenciones_iva.exportador',
    'Porcentaje del IVA que retiene el exportador a los demás proveedores.',
    porcentaje,
    15,
  ],
  [
    'libro-de-compras.retenciones_iva.contribuyente_especial',
    'Porcentaje del IVA que retiene un contribuyente especial.',
    porcentaje,
    15,
  ],
  [
    'libro-de-compras.retenciones_iva.otro_agente',
    'Porcentaje del IVA que retiene un agente designado por la SAT.',
    porcentaje,
    15,
  ],
  [
    'libro-de-compras.retenciones_iva.sector_publico',
    'Porcentaje del IVA que retiene el sector público.',
    porcentaje,
    25,
  ],
  [
    'libro-de-compras.retenciones_iva.minimo',
    'Total del documento (en quetzales) desde el cual retienen los agentes de IVA.',
    monto,
    2500,
  ],
  [
    'libro-de-compras.retenciones_iva.minimo_sector_publico',
    'Total del documento (en quetzales) desde el cual retiene el sector público.',
    monto,
    30000,
  ],
  [
    'libro-de-compras.retenciones_iva.pequeno_contribuyente',
    'Porcentaje del total que se retiene a un pequeño contribuyente.',
    porcentaje,
    5,
  ],
  [
    'libro-de-compras.retenciones_iva.umbral_pequeno_contribuyente',
    'Total (en quetzales) que debe superar la factura de un pequeño contribuyente para retener.',
    monto,
    2500,
  ],
  [
    'libro-de-compras.retenciones_isr.tasa_primer_tramo',
    'Porcentaje de ISR (régimen opcional simplificado) hasta el límite del primer tramo.',
    porcentaje,
    5,
  ],
  [
    'libro-de-compras.retenciones_isr.limite_primer_tramo',
    'Límite (en quetzales) del primer tramo de la retención de ISR.',
    monto,
    30000,
  ],
  [
    'libro-de-compras.retenciones_isr.tasa_excedente',
    'Porcentaje de ISR sobre lo que pasa del primer tramo.',
    porcentaje,
    7,
  ],
  [
    'libro-de-compras.retenciones_isr.minimo',
    'Base (en quetzales) que debe superar la factura para retener ISR.',
    monto,
    2500,
  ],
  [
    'libro-de-compras.plazos.dias_habiles_entero_iva',
    'Días hábiles del mes siguiente para enterar las retenciones de IVA.',
    dias,
    15,
  ],
  [
    'libro-de-compras.plazos.dias_habiles_entero_isr',
    'Días hábiles del mes siguiente para enterar las retenciones de ISR.',
    dias,
    10,
  ],
];

/** Tasas, mínimos y plazos fiscales del libro de compras (`docs/modulos/diseno-datos-libro-de-compras.md` §8). */
export const configuracionDelLibroDeCompras: DefinicionConfiguracion[] = filas.map(deInstalacion);
