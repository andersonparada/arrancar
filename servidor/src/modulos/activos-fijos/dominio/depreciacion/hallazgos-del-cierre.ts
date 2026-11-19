import { deCentavos } from '../../../core/compartido/dominio/centavos.js';
import type { CierreCalculado } from './cierre-del-mes.js';

export type NivelDeHallazgo = 'aviso' | 'bloquea';

/** Algo que quien cierra debe saber (`aviso`) o resolver (`bloquea`) antes de cerrar el mes (§6.9). */
export interface Hallazgo {
  nivel: NivelDeHallazgo;
  codigo: string;
  mensaje: string;
  cantidad: number;
  /** Códigos de los activos (o renglones) afectados, para ir a buscarlos. */
  detalle: string[];
}

/** Un grupo de activos que cumple una condición: cuántos son y los primeros códigos. */
export interface GrupoDeActivos {
  cantidad: number;
  codigos: string[];
}

/** Lo que las consultas encontraron en la base, sin interpretar. */
export interface DatosParaHallazgos {
  lineasEnLaBandeja: number;
  enConstruccionAntiguos: GrupoDeActivos;
  enUsoSinLocalidad: GrupoDeActivos;
  edificiosSinValores: GrupoDeActivos;
  conCostosDeDocumentosAnulados: GrupoDeActivos;
  conSaldoInicial: boolean;
  cargaInicialAbierta: boolean;
  mesesDeConstruccion: number;
}

const concordar = (cantidad: number, uno: string, varios: string): string =>
  `${cantidad} ${cantidad === 1 ? uno : varios}`;

interface Descripcion {
  nivel: NivelDeHallazgo;
  codigo: string;
  mensaje: string;
}

/** El hallazgo de un grupo de activos, o nada si el grupo está vacío. */
function deGrupo(grupo: GrupoDeActivos, { nivel, codigo, mensaje }: Descripcion): Hallazgo[] {
  if (grupo.cantidad === 0) return [];
  return [{ nivel, codigo, mensaje, cantidad: grupo.cantidad, detalle: grupo.codigos }];
}

function avisoDeBandeja(lineas: number): Hallazgo[] {
  if (lineas === 0) return [];
  const mensaje = `${concordar(lineas, 'línea sigue', 'líneas siguen')} en la bandeja «Por capitalizar» con fecha de este mes o anterior.`;
  return [{ nivel: 'aviso', codigo: 'lineas_por_capitalizar', mensaje, cantidad: lineas, detalle: [] }];
}

function avisoDeObras(obras: GrupoDeActivos, meses: number): Hallazgo[] {
  const mensaje = `${concordar(obras.cantidad, 'activo lleva', 'activos llevan')} más de ${meses} meses en construcción.`;
  return deGrupo(obras, { nivel: 'aviso', codigo: 'construccion_antigua', mensaje });
}

function avisosDeUbicacionYValores(datos: DatosParaHallazgos): Hallazgo[] {
  const { enUsoSinLocalidad: sinLocalidad, edificiosSinValores: edificios } = datos;
  const sinCentro = `${concordar(sinLocalidad.cantidad, 'activo en uso no tiene', 'activos en uso no tienen')} localidad: su cuota no tendrá centro de costo.`;
  const sinTope = `${concordar(edificios.cantidad, 'edificio sin', 'edificios sin')} valor de matrícula ni de catastro: no se aplica el tope fiscal del inmueble.`;
  return [
    ...deGrupo(sinLocalidad, { nivel: 'aviso', codigo: 'activos_sin_localidad', mensaje: sinCentro }),
    ...deGrupo(edificios, { nivel: 'aviso', codigo: 'edificios_sin_valores', mensaje: sinTope }),
  ];
}

/** Los avisos que salen de los datos de los activos y de la bandeja. */
function avisosDeActivos(datos: DatosParaHallazgos): Hallazgo[] {
  return [
    ...avisoDeBandeja(datos.lineasEnLaBandeja),
    ...avisoDeObras(datos.enConstruccionAntiguos, datos.mesesDeConstruccion),
    ...avisosDeUbicacionYValores(datos),
  ];
}

function avisoDeExcesos({ excesos }: CierreCalculado): Hallazgo[] {
  if (excesos.length === 0) return [];
  return [
    {
      nivel: 'aviso',
      codigo: 'exceso_de_nota_de_credito',
      mensaje: `${concordar(excesos.length, 'tramo abre', 'tramos abren')} con una nota de crédito que bajó el valor por debajo de lo depreciado (el contable y el fiscal se informan por separado).`,
      cantidad: excesos.length,
      detalle: excesos.map((exceso) => `${exceso.codigo} ${exceso.libro}: Q${deCentavos(exceso.montoCentavos)}`),
    },
  ];
}

function avisoDeOciosos({ cuotas }: CierreCalculado): Hallazgo[] {
  const ociosos = cuotas.filter((cuota) => cuota.ocioso && cuota.libro === 'fiscal');
  if (ociosos.length === 0) return [];
  const total = deCentavos(ociosos.reduce((suma, cuota) => suma + cuota.montoCentavos, 0));
  return [
    {
      nivel: 'aviso',
      codigo: 'ociosos_con_cuota_fiscal',
      mensaje: `${concordar(ociosos.length, 'bien ocioso', 'bienes ociosos')} con cuota fiscal de Q${total} este mes (riesgo de no deducibilidad, art. 25).`,
      cantidad: ociosos.length,
      detalle: ociosos.map((cuota) => cuota.codigo),
    },
  ];
}

function bloqueoDeCargaInicial({ cargaInicialAbierta, conSaldoInicial }: DatosParaHallazgos): Hallazgo[] {
  if (!cargaInicialAbierta || !conSaldoInicial) return [];
  return [
    {
      nivel: 'bloquea',
      codigo: 'carga_inicial_abierta',
      mensaje:
        'La carga inicial de la empresa sigue abierta y hay activos de saldo inicial: ciérrela antes de cerrar el primer mes.',
      cantidad: 1,
      detalle: [],
    },
  ];
}

/** Lo que impide cerrar (`bloquea`). */
function bloqueos(datos: DatosParaHallazgos): Hallazgo[] {
  const anulados = datos.conCostosDeDocumentosAnulados;
  const mensaje = `${concordar(anulados.cantidad, 'activo tiene', 'activos tienen')} costos vigentes de documentos anulados: anule esos costos.`;
  return [
    ...deGrupo(anulados, { nivel: 'bloquea', codigo: 'costos_de_documentos_anulados', mensaje }),
    ...bloqueoDeCargaInicial(datos),
  ];
}

/** Los hallazgos del cierre en el orden en que se muestran: los que bloquean primero. */
export function hallazgosDelCierre(datos: DatosParaHallazgos, calculado: CierreCalculado): Hallazgo[] {
  return [...bloqueos(datos), ...avisosDeActivos(datos), ...avisoDeExcesos(calculado), ...avisoDeOciosos(calculado)];
}

/** El hallazgo de pedir un mes que no es el siguiente: no se calcula nada hasta cerrar el anterior. */
export function hallazgoDeMesAnteriorSinCerrar(siguiente: string): Hallazgo {
  return {
    nivel: 'bloquea',
    codigo: 'mes_anterior_sin_cerrar',
    mensaje: `Primero cierre el mes ${siguiente.slice(0, 7)}: los meses se cierran en orden.`,
    cantidad: 1,
    detalle: [],
  };
}
