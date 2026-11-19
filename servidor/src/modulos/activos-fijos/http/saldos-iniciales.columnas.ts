import type { Columna, OpcionDeReferencia } from '../../core/intercambio/aplicacion/columnas.js';

/** De dónde salen las opciones de las columnas que se escriben por nombre (se consultan una vez por importación). */
export interface OpcionesDeSaldosIniciales {
  clases: () => Promise<OpcionDeReferencia[]>;
  localidades: () => Promise<OpcionDeReferencia[]>;
  departamentos: () => Promise<OpcionDeReferencia[]>;
}

type Dato = Pick<Columna, 'clave' | 'titulo'> & { requerido?: boolean };

const texto = ({ clave, titulo, requerido = false }: Dato): Columna => ({ clave, titulo, requerido, tipo: 'texto' });
const decimal = ({ clave, titulo, requerido = false }: Dato): Columna => ({
  clave,
  titulo,
  requerido,
  tipo: 'decimal',
});
const fecha = ({ clave, titulo, requerido = false }: Dato): Columna => ({ clave, titulo, requerido, tipo: 'fecha' });
const siNo = ({ clave, titulo }: Dato): Columna => ({ clave, titulo, requerido: false, tipo: 'siNo' });

function columnasDelActivo(opciones: OpcionesDeSaldosIniciales): Columna[] {
  return [
    texto({ clave: 'codigo', titulo: 'Código' }),
    texto({ clave: 'descripcion', titulo: 'Descripción', requerido: true }),
    {
      clave: 'claseId',
      titulo: 'Clase',
      requerido: true,
      tipo: 'referencia',
      campoDeNombre: 'claseNombre',
      opciones: opciones.clases,
    },
    texto({ clave: 'activoPadreCodigo', titulo: 'Código del padre' }),
    fecha({ clave: 'fechaDeAdquisicion', titulo: 'Fecha de adquisición', requerido: true }),
    fecha({ clave: 'fechaDeInicioDeUso', titulo: 'Fecha de inicio de uso' }),
    siNo({ clave: 'enConstruccion', titulo: 'En construcción' }),
    { clave: 'cantidad', titulo: 'Cantidad', requerido: true, tipo: 'entero' },
  ];
}

function columnasDeLosMontos(): Columna[] {
  return [
    decimal({ clave: 'costo', titulo: 'Costo', requerido: true }),
    decimal({ clave: 'depreciacionAcumuladaContable', titulo: 'Depreciación acumulada contable', requerido: true }),
    { clave: 'vidaUtilRestanteMeses', titulo: 'Vida útil restante (meses)', requerido: false, tipo: 'entero' },
    decimal({ clave: 'valorResidual', titulo: 'Valor residual' }),
    decimal({ clave: 'costoFiscal', titulo: 'Costo fiscal' }),
    decimal({ clave: 'baseFiscal', titulo: 'Base fiscal' }),
    decimal({ clave: 'depreciacionAcumuladaFiscal', titulo: 'Depreciación acumulada fiscal', requerido: true }),
    decimal({ clave: 'porcentajeFiscal', titulo: 'Porcentaje fiscal anual' }),
  ];
}

function columnasDeLaUbicacion(opciones: OpcionesDeSaldosIniciales): Columna[] {
  return [
    {
      clave: 'localidadId',
      titulo: 'Localidad',
      requerido: false,
      tipo: 'referencia',
      campoDeNombre: 'localidadNombre',
      tambienPorCodigo: true,
      opciones: opciones.localidades,
    },
    {
      clave: 'departamentoId',
      titulo: 'Departamento',
      requerido: false,
      tipo: 'referencia',
      campoDeNombre: 'departamentoNombre',
      tambienPorCodigo: true,
      opciones: opciones.departamentos,
    },
    texto({ clave: 'responsable', titulo: 'Responsable' }),
    siNo({ clave: 'enBodega', titulo: 'En bodega' }),
  ];
}

function columnasDeIdentificacion(): Columna[] {
  return [
    texto({ clave: 'marca', titulo: 'Marca' }),
    texto({ clave: 'modelo', titulo: 'Modelo' }),
    texto({ clave: 'numeroDeSerie', titulo: 'Número de serie' }),
    texto({ clave: 'placa', titulo: 'Placa' }),
    decimal({ clave: 'valorDeMatricula', titulo: 'Valor de matrícula' }),
    decimal({ clave: 'valorCatastral', titulo: 'Valor catastral' }),
    siNo({ clave: 'valoresDelInmuebleCompleto', titulo: 'Valores del inmueble completo' }),
    decimal({ clave: 'valorComoGanadoComun', titulo: 'Valor como ganado común' }),
    texto({ clave: 'observaciones', titulo: 'Observaciones' }),
  ];
}

/** Las columnas del Excel de saldos iniciales: los mismos datos del formulario; el padre se escribe por su código. */
export const columnasDeSaldosIniciales = (opciones: OpcionesDeSaldosIniciales): Columna[] => [
  ...columnasDelActivo(opciones),
  ...columnasDeLosMontos(),
  ...columnasDeLaUbicacion(opciones),
  ...columnasDeIdentificacion(),
];
