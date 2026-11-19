import { textoDeEdicion, textoONulo } from '@/modulos/core/utilidades/edicion';
import type { ArqueoSolicitado, DestinoDelFaltante } from '../../servicios/tipos-de-arqueos';
import { centavosDe, textoConSigno, textoDeCentavos } from '../dinero';

type Campo = string | number | null;

/** Lo que se escribe al arquear: cuántas unidades hay de cada denominación y lo que explica una diferencia. */
export interface EdicionDeArqueo {
  /** Por denominación («200.00»): cuántos billetes o monedas se contaron. */
  cantidades: Record<string, Campo>;
  valoresPorCambiar: Campo;
  /** `null` hasta que el arqueador responda: no se da por completo lo que nadie revisó. */
  comprobantesCompletos: boolean | null;
  motivoDeDiferencia: string;
  destinoDelFaltante: DestinoDelFaltante | null;
  observaciones: string;
}

export const edicionDeArqueo = (): EdicionDeArqueo => ({
  cantidades: {},
  valoresPorCambiar: '',
  comprobantesCompletos: null,
  motivoDeDiferencia: '',
  destinoDelFaltante: null,
  observaciones: '',
});

/** Cuántas unidades se escribieron: vacío es cero; `null` si no es un entero de cero en adelante. */
export function unidadesDe(valor: Campo | undefined): number | null {
  const texto = textoDeEdicion(valor ?? '').trim();
  if (texto === '') return 0;
  return /^\d{1,7}$/.test(texto) ? Number(texto) : null;
}

/** Lo contado en centavos: Σ denominación × cantidad; una cantidad inválida cuenta como cero (la valida `faltantes`). */
export function contadoEnCentavos(edicion: EdicionDeArqueo, denominaciones: readonly string[]): number {
  return denominaciones.reduce(
    (suma, denominacion) =>
      suma + (centavosDe(denominacion) ?? 0) * (unidadesDe(edicion.cantidades[denominacion]) ?? 0),
    0,
  );
}

/** Lo que se escribió en «por cambiar» en centavos; vacío o inválido cuenta como cero. */
export const valoresEnCentavos = (edicion: EdicionDeArqueo): number =>
  centavosDe(textoDeEdicion(edicion.valoresPorCambiar)) ?? 0;

/** Lo que ve el arqueador mientras cuenta; el servidor lo calcula otra vez al registrar. */
export interface ResultadoDelConteo {
  contado: string;
  porCambiar: string;
  /** Contado + por cambiar − esperado, con signo: negativa es faltante. */
  diferencia: string;
  tipo: 'cuadra' | 'faltante' | 'sobrante';
}

export function resultadoDelConteo(
  edicion: EdicionDeArqueo,
  propuesta: { denominaciones: readonly string[]; efectivoEsperado: string },
): ResultadoDelConteo {
  const contado = contadoEnCentavos(edicion, propuesta.denominaciones);
  const porCambiar = valoresEnCentavos(edicion);
  const diferencia = contado + porCambiar - (centavosDe(propuesta.efectivoEsperado) ?? 0);
  return {
    contado: textoDeCentavos(contado),
    porCambiar: textoDeCentavos(porCambiar),
    diferencia: textoConSigno(diferencia),
    tipo: diferencia === 0 ? 'cuadra' : diferencia < 0 ? 'faltante' : 'sobrante',
  };
}

/** Lo que falta escribir antes de enviar, por campo; vacío si está completo. */
export function faltantesDelArqueo(
  edicion: EdicionDeArqueo,
  resultado: Pick<ResultadoDelConteo, 'tipo'>,
): Record<string, string> {
  const faltantes: Record<string, string> = {};
  const cantidadesMalas = Object.values(edicion.cantidades).some((valor) => unidadesDe(valor) === null);
  if (cantidadesMalas) faltantes.conteo = 'Cuente unidades enteras: escriba solo números, de cero en adelante.';
  if (edicion.comprobantesCompletos === null) {
    faltantes.comprobantesCompletos = 'Diga si los comprobantes del fondo están completos.';
  }
  if (resultado.tipo !== 'cuadra' && !edicion.motivoDeDiferencia.trim()) {
    faltantes.motivoDeDiferencia = 'Hay diferencia: escriba por qué cree que ocurrió.';
  }
  if (resultado.tipo === 'faltante' && !edicion.destinoDelFaltante) {
    faltantes.destinoDelFaltante = 'Diga qué se hace con el faltante.';
  }
  return faltantes;
}

/** El cuerpo de registrar: solo las denominaciones con unidades; motivo y destino solo si hay diferencia. */
export function cuerpoDelArqueo(
  edicion: EdicionDeArqueo,
  datos: { denominaciones: readonly string[]; tipo: ResultadoDelConteo['tipo'] },
): ArqueoSolicitado {
  const conteo = datos.denominaciones
    .map((denominacion) => ({
      denominacionCentavos: centavosDe(denominacion) ?? 0,
      cantidad: unidadesDe(edicion.cantidades[denominacion]) ?? 0,
    }))
    .filter(({ cantidad }) => cantidad > 0);
  const hayDiferencia = datos.tipo !== 'cuadra';
  return {
    conteo,
    ...(valoresEnCentavos(edicion) > 0 ? { valoresPorCambiar: textoDeCentavos(valoresEnCentavos(edicion)) } : {}),
    comprobantesCompletos: edicion.comprobantesCompletos === true,
    observaciones: textoONulo(edicion.observaciones),
    motivoDeDiferencia: hayDiferencia ? textoONulo(edicion.motivoDeDiferencia) : null,
    destinoDelFaltante: datos.tipo === 'faltante' ? edicion.destinoDelFaltante : null,
  };
}
