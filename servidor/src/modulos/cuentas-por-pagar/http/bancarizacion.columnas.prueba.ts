import { describe, expect, it } from 'vitest';
import type { ReporteDeBancarizacionDto } from '../aplicacion/dto/reportes-de-bancarizacion.dto.js';
import { aFilasExportadasDeBancarizacion } from './bancarizacion.columnas.js';

const CIFRAS = { cantidad: 0, efectivo: '0.00', ivaEnRiesgo: '0.00', costoNoDeducible: '0.00' };

describe('Excel de pagos en efectivo sobre el umbral', () => {
  it('escribe la forma de pago con su nombre y no con el valor interno', () => {
    const reporte: ReporteDeBancarizacionDto = {
      desde: '2026-01',
      hasta: '2026-11',
      umbral: '30000.00',
      meses: [],
      documentosSobreElUmbral: [
        {
          documentoId: 'd',
          documento: 'A-1',
          marcas: [],
          ivaEnRiesgo: '0.00',
          costoNoDeducible: '0.00',
          ivaNoConocido: false,
          proveedorId: 'p',
          proveedorNombre: 'Agro',
          total: '40000.00',
          efectivo: '5000.00',
          pagos: [
            { pagoId: '1', numero: '1', forma: 'nota_ligada', fecha: '2026-02-01', monto: '35000.00' },
            { pagoId: '2', numero: '2', forma: 'efectivo', fecha: '2026-03-01', monto: '5000.00' },
          ],
        },
      ],
      totales: { meses: CIFRAS, documentos: CIFRAS, total: { ivaEnRiesgo: '0.00', costoNoDeducible: '0.00' } },
      leyendas: [],
    };
    const formas = aFilasExportadasDeBancarizacion(reporte)
      .filter((fila) => fila.seccion === 'Pago del documento')
      .map((fila) => fila.forma);
    expect(formas).toEqual(['Nota de débito ligada', 'Efectivo']);
  });
});
