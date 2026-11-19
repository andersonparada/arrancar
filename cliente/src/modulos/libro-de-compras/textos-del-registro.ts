import type { MotivoFueraDelLibro, TipoDeDocumento } from './servicios/documentos.api';

/** Textos del formulario «Registrar factura». */
export const FORMULARIO_DE_DOCUMENTO = {
  titulo: 'Registrar factura',
  descripcion: 'Escriba lo que dice el documento. A la derecha verá, al instante, cómo queda el IVA y las retenciones.',
  /** El título según lo que se registra; el de la factura es el de siempre. */
  tituloPorFamilia: {
    nota_de_credito: 'Registrar nota de crédito',
    nota_de_debito: 'Registrar nota de débito',
    recibo: 'Registrar recibo',
  } as Partial<Record<TipoDeDocumento, string>>,
  volver: 'Ingreso de facturas',
  /** Cuando se llega desde un destino (un fondo, un anticipo): a dónde va el documento y cómo volver. */
  paraElDestino: (etiqueta: string) => `Destino: ${etiqueta}`,
  volverAlDestino: 'Volver',
  registrar: 'Registrar',
  cancelar: 'Cancelar',
  sinDestinos:
    'Para registrar facturas hace falta activar un destino (Cuentas por pagar, Caja chica o Cuentas por liquidar). Pídale al administrador que active uno de esos módulos para esta cuenta. Mientras tanto puede llenar el formulario y ver el cálculo, pero no registrarlo.',
  empresaSinDatos: 'Ir a los datos de la empresa',
  repetido: 'Ver el documento ya registrado',
  confirmarRegimen: 'Confirmo que la factura es anterior al cambio de régimen del proveedor',
  seguirEditando: 'Revise el documento: ',
} as const;

/** Cuando el formulario se abre desde una fila de la bandeja «DTE de la SAT». */
export const DESDE_LA_SAT = {
  titulo: 'Datos traídos del DTE de la SAT. Revíselos y complete lo que falte antes de registrar.',
  cargando: 'Trayendo los datos del DTE de la SAT…',
  volver: 'DTE de la SAT',
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

/** Textos de la factura del sistema anterior que corrige una nota. */
export const FACTURA_ANTERIOR = {
  titulo: 'Factura del sistema anterior',
  cuandoUsarla:
    'Use esta opción solo si la factura estaba en el libro de compras del sistema anterior. Si la registró en Arrancar, elíjala de la lista.',
  datosImpresos: 'Los datos de la factura vienen impresos en la propia nota (documento de origen).',
  ayudaDeLaFecha: 'Debe ser anterior a la fecha de inicio de la empresa.',
  ayudaDelIva: 'Escriba 0 si la factura no lleva IVA.',
  dioCredito: 'Sí: su IVA se tomó como crédito fiscal.',
  noDioCredito: 'No: su IVA se sumó al costo o gasto. Diga por qué.',
  notasDeDebito: 'Notas de débito del sistema anterior sobre esta factura',
  ayudaDeNotasDeDebito:
    'Solo si el proveedor ya había aumentado esta factura con notas de débito antes de la fecha de inicio. Suben lo que una nota de crédito puede rebajar.',
  sugeridasTitulo: 'Elija una para llenar los datos con un clic',
  sugeridasUsadas: 'Ya usadas en otras notas de este proveedor',
  sugeridasDeLaBandeja: 'De la bandeja de la SAT, anteriores a la fecha de inicio',
  citaUnaNota: 'Ver la nota que la cita',
  elegirOrigen: 'Elija la factura que corrige esta nota',
} as const;

/** Textos de «No dio crédito por otra causa» en las facturas. */
export const OTRA_CAUSA = {
  etiqueta: 'No dio crédito fiscal por otra causa',
  descripcion:
    'Úselo si el IVA de esta factura no es crédito fiscal por una razón que no está entre las demás (por ejemplo, no cumple los requisitos de la ley). El IVA se suma al costo.',
  ayudaDeObservaciones: 'Obligatorio: explique por qué no dio crédito fiscal. Queda guardado con la factura.',
} as const;
