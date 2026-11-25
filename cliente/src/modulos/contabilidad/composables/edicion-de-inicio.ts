import { textoDeEdicion, textoONulo } from '@/modulos/core/utilidades/edicion';
import type { CasoDeInicio, InicioContable } from '../servicios/inicio.api';
import { anchosDeMascara } from './edicion-de-cuenta';

/** Lo que se escribe en el formulario: todo es texto, lo opcional vacío. */
export interface FormularioDeInicio {
  fecha: string;
  caso: CasoDeInicio;
  mascara: string;
  plantilla: string | null;
  firmaRepresentante: string;
  firmaContador: string;
  registroDelContador: string;
}

/** La máscara que se propone a una empresa nueva (cinco niveles). */
export const MASCARA_PROPUESTA = '9.9.99.99.999';

export const CASOS_DE_INICIO: { valor: CasoDeInicio; texto: string }[] = [
  { valor: 'desde_la_carga', texto: 'Desde el inicio de la empresa en Arrancar' },
  { valor: 'posterior', texto: 'Desde una fecha posterior' },
];

export const AYUDA_DEL_CASO: Record<CasoDeInicio, string> = {
  desde_la_carga:
    'La contabilidad arranca el mismo día que la empresa y toma los saldos iniciales que cargó cada módulo. Es lo normal para una empresa nueva.',
  posterior:
    'Para una empresa que ya operaba en Arrancar sin contabilidad. Requiere la carga inicial cerrada; los saldos de cada módulo al día anterior se llevan a la apertura.',
};

export function inicioVacio(): FormularioDeInicio {
  return {
    fecha: '',
    caso: 'desde_la_carga',
    mascara: MASCARA_PROPUESTA,
    plantilla: null,
    firmaRepresentante: '',
    firmaContador: '',
    registroDelContador: '',
  };
}

/** El formulario con lo guardado. */
export function formularioDelInicio(inicio: InicioContable): FormularioDeInicio {
  return {
    ...inicio,
    firmaRepresentante: textoDeEdicion(inicio.firmaRepresentante),
    firmaContador: textoDeEdicion(inicio.firmaContador),
    registroDelContador: textoDeEdicion(inicio.registroDelContador),
  };
}

/** Lo que se manda: los firmantes vacíos van como nulos y la máscara sin espacios. */
export function datosDelInicio(formulario: FormularioDeInicio): InicioContable {
  return {
    ...formulario,
    mascara: formulario.mascara.trim(),
    firmaRepresentante: textoONulo(formulario.firmaRepresentante),
    firmaContador: textoONulo(formulario.firmaContador),
    registroDelContador: textoONulo(formulario.registroDelContador),
  };
}

/** El aviso de la máscara mientras se escribe: lo que no cumple la forma, o `null` si está bien. */
export function avisoDeMascara(mascara: string): string | null {
  return anchosDeMascara(mascara).length > 0
    ? null
    : 'Use de 4 a 6 niveles de nueves separados por puntos, como 9.9.99.99.999.';
}

/** Si solo falta uno de los dos datos del contador, qué falta. */
export function avisoDelContador(formulario: Pick<FormularioDeInicio, 'firmaContador' | 'registroDelContador'>) {
  const nombre = formulario.firmaContador.trim() !== '';
  const registro = formulario.registroDelContador.trim() !== '';
  if (nombre === registro) return null;
  return nombre ? 'Escriba también el número de registro del contador.' : 'Escriba también el nombre del contador.';
}

/** Si cambia la fecha o el caso de una contabilidad ya iniciada, hay que confirmarlo. */
export const cambiaElInicio = (anterior: InicioContable | null, formulario: FormularioDeInicio): boolean =>
  anterior !== null && (anterior.fecha !== formulario.fecha || anterior.caso !== formulario.caso);
