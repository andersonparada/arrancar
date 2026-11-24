import { ref } from 'vue';

interface AvisosPendientes {
  documentoId: string;
  avisos: string[];
}

const pendientes = ref<AvisosPendientes | null>(null);

/** Deja los avisos del registro para que la ficha del documento recién creado los muestre completos. */
export function dejarAvisosDelRegistro(documentoId: string, avisos: string[]): void {
  pendientes.value = avisos.length > 0 ? { documentoId, avisos } : null;
}

/** Los avisos que dejó el registro de ese documento; se entregan una sola vez. */
export function tomarAvisosDelRegistro(documentoId: string): string[] {
  const avisos = pendientes.value?.documentoId === documentoId ? pendientes.value.avisos : [];
  pendientes.value = null;
  return avisos;
}
