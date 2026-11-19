import { reactive } from 'vue';
import { apiTiposDeCambio, type ResumenDeCarga } from '../../servicios/tipos-de-cambio.api';
import { usarFormulario } from '../usar-formulario';

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
 * La ventana «Cargar ahora»: pide al Banguat un rango (por omisión, hoy) para todas las monedas activas con código y
 * muestra qué dejó cada una. Si otra carga corre, el servidor responde 409 y el aviso dice que espere.
 */
export function usarCargaManual(hoy: () => string, alCargar: () => Promise<unknown>) {
  const { enviando, errores, enviar } = usarFormulario();
  const carga = reactive<FormularioDeCarga>({ abierta: false, desde: '', hasta: '', resultados: null });

  function abrir(): void {
    errores.value = {};
    Object.assign(carga, { abierta: true, desde: hoy(), hasta: hoy(), resultados: null });
  }

  async function cargar(): Promise<void> {
    const error = errorDelRango(carga.desde, carga.hasta);
    errores.value = error ? { desde: error } : {};
    if (error) return;
    const hecho = await enviar(
      async () => (carga.resultados = await apiTiposDeCambio.cargarAhora(carga.desde, carga.hasta)),
    );
    if (hecho) await alCargar();
  }

  return { carga, enviando, errores, abrir, cargar, cerrar: () => (carga.abierta = false) };
}
