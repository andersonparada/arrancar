import type { Columna } from '../../core/intercambio/aplicacion/columnas.js';
import type { IncisoFiscal } from '../dominio/incisos-fiscales.js';

const OPCIONES_DE_INCISO: Record<IncisoFiscal, string> = {
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
};

/** Las columnas del Excel de las clases de activos: los mismos datos del formulario, en el mismo orden. */
export const columnasDeClases = (): Columna[] => [
  { clave: 'nombre', titulo: 'Nombre', requerido: true, tipo: 'texto' },
  {
    clave: 'incisoFiscal',
    titulo: 'Inciso fiscal',
    requerido: true,
    tipo: 'lista',
    opciones: OPCIONES_DE_INCISO,
  },
  { clave: 'porcentajeFiscal', titulo: 'Porcentaje fiscal anual', requerido: true, tipo: 'decimal' },
  { clave: 'vidaUtilContableMeses', titulo: 'Vida útil contable (meses)', requerido: false, tipo: 'entero' },
  { clave: 'valorResidualPorcentaje', titulo: 'Valor residual (%)', requerido: true, tipo: 'decimal' },
  { clave: 'activo', titulo: 'Activo', requerido: true, tipo: 'siNo' },
];
