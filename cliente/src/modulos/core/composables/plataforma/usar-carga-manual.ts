import { reactive } from 'vue';
import { usarAvisos } from '../../almacenes/avisos';
import { apiTiposDeCambio, type ResumenDeCarga } from '../../servicios/tipos-de-cambio.api';
import { usarFormulario } from '../usar-formulario';
import { esperarElFinDeLaCarga, resumenesDeLaCarga } from './seguimiento-de-la-carga';

const MAXIMO_DE_CONSULTAS = 200;

export interface FormularioDeCarga {
  abierta: boolean;
  desde: string;
  hasta: string;
  /** Lo que respondió el servidor, por moneda; `null` mientras no se ha cargado. */
  resultados: ResumenDeCarga[] | null;
}

/** El error de las fechas de «Cargar ahora», con cómo corregirlo; `null` si sirven. */
export function errorDelRango(desde: string, hasta: string): string | null {
  if (!desde || !hasta) return 'Elija la fecha inicial y la final.';
  return desde > hasta ? 'La fecha inicial no puede ser posterior a la final.' : null;
}

/**
 * La ventana «Cargar ahora»: pide al Banguat un rango (por omisión, hoy) para todas las monedas activas con código. El
 * servidor responde enseguida y la carga sigue en segundo plano: se pregunta cada 2 segundos hasta que termine y
 * entonces se muestra qué dejó cada moneda (aunque se cierre la ventana, la bitácora se actualiza y se avisa). Si otra
 * carga corre, el servidor responde 409 y el aviso dice que espere.
 */
export function usarCargaManual(hoy: () => string, alCargar: () => Promise<unknown>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const carga = reactive<FormularioDeCarga>({ abierta: false, desde: '', hasta: '', resultados: null });

  function abrir(): void {
    errores.value = {};
    Object.assign(carga, { abierta: true, desde: hoy(), hasta: hoy(), resultados: null });
  }

  /** Pide la carga, espera su fin y deja en `resultados` lo que hizo cada moneda, tomado de la bitácora. */
  async function cargarYEsperar(): Promise<void> {
    const { iniciadaEn } = await apiTiposDeCambio.cargarAhora(carga.desde, carga.hasta);
    const estado = await esperarElFinDeLaCarga({
      pedirEstado: () => apiTiposDeCambio.estadoDeLaCarga(MAXIMO_DE_CONSULTAS),
    });
    carga.resultados = resumenesDeLaCarga(estado.consultas, iniciadaEn);
    if (!carga.abierta) avisos.exito('La carga del Banguat terminó; el detalle está en la bitácora.');
  }

  async function cargar(): Promise<void> {
    const error = errorDelRango(carga.desde, carga.hasta);
    errores.value = error ? { desde: error } : {};
    if (error) return;
    const hecho = await enviar(cargarYEsperar);
    if (hecho) await alCargar();
  }

  return { carga, enviando, errores, abrir, cargar, cerrar: () => (carga.abierta = false) };
}
