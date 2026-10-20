import type { MotivoFueraDelLibro } from './servicios/documentos.api';

/** Textos del formulario «Registrar factura». */
export const FORMULARIO_DE_DOCUMENTO = {
  titulo: 'Registrar factura',
  descripcion: 'Escriba lo que dice el documento. A la derecha verá, al instante, cómo queda el IVA y las retenciones.',
  volver: 'Ingreso de facturas',
  registrar: 'Registrar',
  cancelar: 'Cancelar',
  sinDestinos:
    'Para registrar facturas hace falta activar un destino (Cuentas por pagar, Caja chica o Cuentas por liquidar). Pídale al administrador que active uno de esos módulos para esta cuenta. Mientras tanto puede llenar el formulario y ver el cálculo, pero no registrarlo.',
  empresaSinDatos: 'Ir a los datos de la empresa',
  repetido: 'Ver el documento ya registrado',
  confirmarRegimen: 'Confirmo que la factura es anterior al cambio de régimen del proveedor',
  seguirEditando: 'Revise el documento: ',
} as const;

export const AYUDA_DE_LA_VISTA_PREVIA =
  'Es solo un cálculo: no se guarda nada hasta que presione «Registrar». Se actualiza solo cuando deja de escribir.';

export const AYUDA_DE_AJUSTAR_RETENCION =
  'Arrancar propone esta retención según el régimen de la empresa y del proveedor. Si en la práctica retiene un monto distinto, o no retiene, escríbalo aquí y diga por qué. El cambio vale solo para esta factura y queda guardado con su nombre y su motivo; no puede ser mayor que la base.';

export const AYUDA_DE_DATOS_FISCALES =
  'Esta empresa retiene impuestos, y para calcularlos hace falta saber esto del proveedor. Las respuestas se guardan en su ficha: no se las volveremos a preguntar.';

/** Cómo se llama cada motivo en el selector (el texto largo de por qué está en `textos-de-documentos.ts`). */
export const OPCIONES_DE_MOTIVO_FUERA_DEL_LIBRO: Record<MotivoFueraDelLibro, string> = {
  sin_fel: 'No tiene FEL (recibo o documento informal)',
  fel_a_consumidor_final: 'La FEL está a consumidor final (CF)',
  fel_a_otro_nit: 'La FEL está a nombre de otro NIT o CUI',
  recibo_fel: 'Recibo FEL a nombre de la empresa',
};

/** Textos de la factura especial (FESP) en el formulario. */
export const FACTURA_ESPECIAL = {
  ayuda:
    'La factura especial la emite su empresa en el certificador cuando un particular no factura; regístrela aquí con su número de autorización. Se retiene todo el IVA y el 5 % de ISR.',
  siempreEnElLibro: 'La factura especial siempre se muestra en los reportes de la SAT.',
  ayudaDelVendedor: 'El NIT o CUI del proveedor, que es un particular. Se propone con el de su ficha.',
} as const;

/** Quién emite la factura especial: la empresa, con su NIT si se pudo leer. */
export const textoDelEmisorEspecial = (nit: string | null): string => (nit ? `Su empresa (NIT ${nit})` : 'Su empresa');
