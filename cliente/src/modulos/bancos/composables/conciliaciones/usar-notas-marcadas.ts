import { computed, onMounted, ref, type Ref } from 'vue';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { apiConciliaciones, type Conciliacion } from '../../servicios/conciliaciones.api';
import type { Movimiento } from '../../servicios/movimientos.api';
import { apiNotas } from '../../servicios/notas.api';
import { usarDesmarcado } from '../notas/usar-marcas-de-nota';
import { finDelMesDeConciliacion, notasMarcadasDeLaConciliacion } from './notas-marcadas';

const PERMISOS = ['bancos.conciliaciones.conciliar', 'bancos.notas.editar', 'bancos.notas.ver'];

/**
 * Las notas marcadas para Cuentas por pagar que siguen sin aplicarse en el mes de la conciliación, con su «Desmarcar».
 * Solo se ofrecen en proceso, con Cuentas por pagar activo y con los permisos de conciliar, y de ver y editar notas.
 * Quitar la marca solo cambia el concepto: no mueve montos, así que el documento y las marcas sin guardar no se tocan.
 */
export function usarNotasMarcadas(conciliacion: Ref<Conciliacion | null>) {
  const sesion = usarSesion();
  const notas = ref<Movimiento[]>([]);
  const disponible = computed(
    () =>
      conciliacion.value?.estado === 'en_proceso' &&
      sesion.moduloActivo('cuentas-por-pagar') &&
      PERMISOS.every((permiso) => sesion.puede(permiso)),
  );

  async function cargar(): Promise<void> {
    const actual = conciliacion.value;
    if (!actual || !disponible.value) return;
    const filtro = { cuentaBancariaId: actual.cuentaBancariaId, hasta: finDelMesDeConciliacion(actual) };
    const todas = await apiNotas.listar(filtro).catch(() => [] as Movimiento[]);
    notas.value = notasMarcadasDeLaConciliacion(todas, actual.candidatos);
  }

  const desmarcado = usarDesmarcado(cargar, (nota, cuerpo) =>
    apiConciliaciones.desmarcarNota(conciliacion.value?.id ?? '', nota.id, cuerpo),
  );
  onMounted(cargar);
  return { notas, disponible, desmarcado };
}
