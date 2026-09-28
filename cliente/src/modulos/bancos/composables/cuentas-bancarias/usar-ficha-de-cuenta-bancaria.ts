import { useRouter } from 'vue-router';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiCuentasBancarias, type CuentaBancaria } from '../../servicios/cuentas-bancarias.api';

/** La ficha de la cuenta bancaria: sus datos y lo que puede hacer con la cuenta bancaria quien la gestiona. */
export function usarFichaDeCuentaBancaria(cuentaBancariaId: string) {
  const router = useRouter();
  const { datos: registro, cargando } = usarCarga(
    () => apiCuentasBancarias.obtener(cuentaBancariaId),
    null as CuentaBancaria | null,
    'No se pudo cargar la cuenta bancaria.',
  );
  const editar = () => router.push({ name: 'bancos.cuentas-bancarias.editar', params: { cuentaBancariaId } });

  return { registro, cargando, editar };
}
