import type { AjustesDelAviso } from '../../servicios/tipos-de-avisos-de-pago';

export const OPCIONES_DE_ENVIO: { valor: AjustesDelAviso['envio']; texto: string }[] = [
  { valor: 'manual', texto: 'Manual: con el botón «Enviar aviso» de cada pago' },
  { valor: 'automatico', texto: 'Automático: al registrar el pago' },
];

/** Lo que dice la pantalla sobre el envío elegido. */
export const AYUDA_DEL_ENVIO: Record<AjustesDelAviso['envio'], string> = {
  manual: 'Nada sale solo: cada aviso se manda desde la ficha del pago, viendo antes a quién va.',
  automatico:
    'Al registrar un pago sale el aviso a los contactos del proveedor con la marca «recibe avisos de pago» (o a su correo principal). Si no tiene correo, no sale y la ficha lo dice.',
};

/** El borrador que se edita: una copia de lo guardado. */
export const borradorDeAjustes = (guardado: AjustesDelAviso): AjustesDelAviso => ({
  envio: guardado.envio,
  asunto: guardado.asunto,
  mensaje: guardado.mensaje,
  adjuntarComprobante: guardado.adjuntarComprobante,
  copiaALaEmpresa: guardado.copiaALaEmpresa,
});

/** Lo que se manda al guardar: los textos sin espacios sobrantes en los extremos. */
export const ajustesParaGuardar = (borrador: AjustesDelAviso): AjustesDelAviso => ({
  ...borrador,
  asunto: borrador.asunto.trim(),
  mensaje: borrador.mensaje.trim(),
});

export function hayCambiosEnLosAjustes(borrador: AjustesDelAviso, guardado: AjustesDelAviso): boolean {
  const nuevo = ajustesParaGuardar(borrador);
  return (Object.keys(nuevo) as (keyof AjustesDelAviso)[]).some((campo) => nuevo[campo] !== guardado[campo]);
}

/** Los marcadores como se escriben en el texto: `{numero}`, `{empresa}`… */
export const marcadoresEnTexto = (marcadores: readonly string[]): string =>
  marcadores.map((marcador) => `{${marcador}}`).join(', ');
