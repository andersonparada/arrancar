import { computed, reactive, ref, watch, type Ref } from 'vue';
import { usarAvisos } from '../../almacenes/avisos';
import { apiTiposDeCambio, type TipoDeLaSerie } from '../../servicios/tipos-de-cambio.api';
import { armarMes, mesDe, moverMes, nombreDelMes, rangoDelMes, type MesDelCalendario } from './calendario-de-tipos';

const SIN_MES: MesDelCalendario = { espaciosAlInicio: 0, dias: [] };

/** El mes elegido y su calendario para una moneda; cambiar la moneda o el mes vuelve a pedir la serie. */
export function usarCalendarioDelMes(moneda: Ref<string>, hoy: Ref<string>) {
  const avisos = usarAvisos();
  const mes = ref('');
  const serie = ref<TipoDeLaSerie[]>([]);

  async function pedirSerie(): Promise<void> {
    if (!moneda.value || !mes.value) return;
    const { desde, hasta } = rangoDelMes(mes.value);
    try {
      serie.value = await apiTiposDeCambio.serie(moneda.value, desde, hasta);
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudo cargar el calendario del mes.');
    }
  }

  watch([moneda, mes], pedirSerie);

  return reactive({
    mes,
    pedirSerie,
    calendario: computed(() => (mes.value ? armarMes(mes.value, serie.value, hoy.value) : SIN_MES)),
    nombre: computed(() => (mes.value ? nombreDelMes(mes.value) : '')),
    puedeAvanzar: computed(() => !!mes.value && mes.value < mesDe(hoy.value)),
    irAlMesDeHoy: () => (mes.value = mesDe(hoy.value)),
    mover: (meses: number) => (mes.value = moverMes(mes.value, meses)),
  });
}
