import type { Activo } from '../../servicios/activos.api';
import type { LineaDeBandeja } from '../../servicios/bandeja.api';
import type { Clase } from '../../servicios/clases.api';

export const linea = (cambios: Partial<LineaDeBandeja> = {}): LineaDeBandeja => ({
  lineaId: 'l1',
  documentoId: 'd1',
  numeroDeLinea: 1,
  tipoDeDocumento: 'factura',
  documento: 'A-100',
  fechaEmision: '2026-11-01',
  proveedorNombre: 'Tractores SA',
  conceptoId: 'c1',
  conceptoNombre: 'Maquinaria',
  descripcion: 'Tractor John Deere',
  tipoDeLinea: 'bien',
  costo: '750000.01',
  capitalizado: '0.00',
  pendiente: '750000.01',
  claseSugeridaId: 'k1',
  claseSugeridaNombre: 'Maquinaria',
  bajoElUmbral: false,
  anteriorALaFechaDeInicio: false,
  activoSugeridoId: null,
  activoSugeridoCodigo: null,
  ...cambios,
});

export const clase = (id: string, incisoFiscal: Clase['incisoFiscal'] = 'maquinaria_y_vehiculos'): Clase => ({
  id,
  nombre: id,
  incisoFiscal,
  porcentajeFiscal: '20',
  vidaUtilContableMeses: 60,
  valorResidualPorcentaje: '0',
  activo: true,
});

export const activo = (cambios: Partial<Activo>): Activo =>
  ({ id: 'a', codigo: 'AF-1', descripcion: 'Tractor', ...cambios }) as Activo;
