import type { CargaInicial } from '../aplicacion/puertos/carga-inicial.js';

/** La carga inicial de la empresa de prueba: sin fecha de inicio (nada se rechaza por ser anterior a ella). */
export const CARGA_SIN_FECHA_DE_INICIO: CargaInicial = {
  obtener: async () => ({ fechaDeInicio: null, cerrada: false }),
};

/** La carga inicial de una empresa de prueba con su fecha de inicio puesta. */
export const cargaConFechaDeInicio = (fechaDeInicio: string, cerrada = false): CargaInicial => ({
  obtener: async () => ({ fechaDeInicio, cerrada }),
});
