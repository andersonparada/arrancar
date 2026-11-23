import { z } from 'zod';
import { definirConfiguracion, type DefinicionConfiguracion } from '../core/modulos-sistema/definicion-modulo.js';

const porcentaje = z.number().min(0).max(100).multipleOf(0.01);

/**
 * Las variables de Libro de ventas (`docs/modulos/diseno-cuentas-por-cobrar-y-ventas.md` §11.3). Las tasas de IVA y
 * retenciones se leen de las de Libro de compras. Las de la retención de la tarjeta se declaran en CXC-5t y el cálculo
 * del ICT llega en LV-7; aquí solo se declaran sus tasas.
 */
export const configuracionDeLibroDeVentas: DefinicionConfiguracion[] = [
  definirConfiguracion({
    clave: 'libro-de-ventas.ict.tasa_general',
    descripcion: 'ICT sobre las ventas brutas del régimen primario y pecuario (%).',
    esquema: porcentaje,
    predeterminado: 1.5,
    niveles: ['instalacion'],
    publica: false,
  }),
  definirConfiguracion({
    clave: 'libro-de-ventas.ict.tasa_exportacion',
    descripcion: 'ICT de ciertas exportaciones del régimen primario y pecuario (%).',
    esquema: porcentaje,
    predeterminado: 2,
    niveles: ['instalacion'],
    publica: false,
  }),
  definirConfiguracion({
    clave: 'libro-de-ventas.ict.tasa_margen_bovino',
    descripcion: 'ICT sobre el margen del intermediario de bovinos (%).',
    esquema: porcentaje,
    predeterminado: 10,
    niveles: ['instalacion'],
    publica: false,
  }),
  definirConfiguracion({
    clave: 'libro-de-ventas.pequeno_contribuyente.limites_anuales',
    descripcion:
      'Límite anual de ventas del pequeño contribuyente, en quetzales, por año (`{ "2026": 500285 }`); un año sin valor toma el último.',
    esquema: z.record(z.string().regex(/^\d{4}$/), z.number().positive()),
    predeterminado: { '2026': 500285 },
    niveles: ['instalacion'],
    publica: false,
  }),
  definirConfiguracion({
    clave: 'libro-de-ventas.destino.consumidor_final',
    descripcion:
      'A dónde va la venta a consumidor final: `sin_cartera` (no es cartera) o `cuentas_por_cobrar` (se controla como cualquier venta).',
    esquema: z.enum(['sin_cartera', 'cuentas_por_cobrar']),
    predeterminado: 'sin_cartera',
    niveles: ['empresa', 'instalacion'],
    publica: false,
  }),
  definirConfiguracion({
    clave: 'libro-de-ventas.anticipos.tratamiento',
    descripcion:
      'Qué pasa con un cobro sin cargos (anticipo): `aviso` (se avisa que en servicios hay que facturarlo) o `factura_obligatoria` (el cobro se rechaza).',
    esquema: z.enum(['aviso', 'factura_obligatoria']),
    predeterminado: 'aviso',
    niveles: ['empresa'],
    publica: false,
  }),
];
