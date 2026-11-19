import { randomUUID } from 'node:crypto';
import { comoPropietario } from './consultas-de-propietario.js';

export interface CorreoSembrado {
  cuentaId: string;
  empresaId: string;
  estado?: 'pendiente' | 'enviado' | 'fallido' | 'cancelado';
  tipo?: string;
  asunto?: string;
  recursoOrigen?: string;
  registroOrigenId?: string;
  direccion?: string;
  creadoEn?: string;
  depurado?: boolean;
  codigoDeError?: string;
}

const PREDETERMINADOS = {
  estado: 'pendiente',
  tipo: 'cuentas-por-pagar.aviso_de_pago',
  asunto: 'Aviso de pago',
  recursoOrigen: 'cuentas-por-pagar.pagos',
  direccion: 'proveedor@ejemplo.com',
  depurado: false,
} as const;

const INSERTAR_CORREO = `insert into core.correos_salientes
  (id, cuenta_id, empresa_id, tipo, recurso_origen, registro_origen_id, asunto, cuerpo_texto, cuerpo_html,
   nombre_visible, message_id, estado, intentos, enviado_en, ultimo_error_codigo, cancelado_en,
   motivo_de_cancelacion, contenido_depurado_en, creado_en)
  values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Empresa por medio de Arrancar', $10, $11, $12,
    case when $11 = 'enviado' then now() end, $13, case when $11 = 'cancelado' then now() end,
    case when $11 = 'cancelado' then 'Prueba' end, case when $14 then now() end, coalesce($15::timestamptz, now()))`;

/** Inserta un correo de la bandeja como propietario (la app no inserta a mano): devuelve su id. */
export async function sembrarCorreo(entrada: CorreoSembrado): Promise<string> {
  const id = randomUUID();
  const datos = { ...PREDETERMINADOS, registroOrigenId: randomUUID(), ...entrada };
  await comoPropietario(INSERTAR_CORREO, [
    id,
    datos.cuentaId,
    datos.empresaId,
    datos.tipo,
    datos.recursoOrigen,
    datos.registroOrigenId,
    datos.asunto,
    datos.depurado ? null : 'Texto del aviso',
    datos.depurado ? null : '<p>Texto del aviso</p>',
    `<${id}@prueba.test>`,
    datos.estado,
    datos.estado === 'fallido' ? 8 : 0,
    entrada.codigoDeError ?? null,
    datos.depurado,
    entrada.creadoEn ?? null,
  ]);
  await comoPropietario(
    `insert into core.destinatarios_de_correos (correo_saliente_id, empresa_id, cuenta_id, clase, direccion, origen)
     values ($1, $2, $3, 'para', $4, 'tercero')`,
    [id, datos.empresaId, datos.cuentaId, datos.direccion],
  );
  return id;
}
