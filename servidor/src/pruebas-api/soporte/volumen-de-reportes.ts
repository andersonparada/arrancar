import pg from 'pg';
import { configuracion } from '../../configuracion.js';

/** Lo que se siembra en cada empresa de la prueba de rendimiento de los reportes (diseño de CP5, §9). */
export const VOLUMEN = {
  proveedores: 500,
  cargos: 17_000,
  notas: 3_000,
  aplicacionesDeNotas: 10_000,
  ajustes: 2_000,
  pagos: 30_000,
  pagosAnulados: 500,
  pagosPosfechados: 300,
  reintegros: 1_000,
} as const;

/** De quién es lo sembrado: la cuenta, su empresa y un usuario cualquiera de ella (quien «registró»). */
export interface DuenoDelVolumen {
  cuentaId: string;
  empresaId: string;
  usuarioId: string;
}

const PROVEEDORES = `
  create temp table proveedores_v as
  with t as (
    insert into terceros.terceros (cuenta_id, tipo, razon_social, nombre_mostrar, nit)
    select $1, 'juridica', 'Proveedor ' || g, 'Proveedor ' || lpad(g::text, 4, '0'), '7' || lpad(g::text, 6, '0') || 'K'
      from generate_series(1, ${VOLUMEN.proveedores}) g returning id, nombre_mostrar),
  p as (insert into terceros.proveedores (cuenta_id, tercero_id) select $1, id from t returning id)
  select id, row_number() over (order by id) as rn from p`;

const DOCUMENTOS = `
  insert into cuentas_por_pagar.documentos (empresa_id, origen, serie, numero, tipo, proveedor_id, fecha_emision, total,
    retenciones, saldo_al_inicio, retenciones_por_practicar, referencia, vencimiento, estado, registrado_en, registrado_por)
  select $1, 'saldo_inicial', 'V', 'VOL' || g, 'factura', p.id, date '2025-06-01' + (g % 200), 1120, 120, 1000, 0,
         'REF' || g, date '2025-06-01' + (g % 200) + 30, 'registrado', now(), $2
    from generate_series(1, ${VOLUMEN.cargos}) g join proveedores_v p on p.rn = (g % ${VOLUMEN.proveedores}) + 1;
  insert into cuentas_por_pagar.documentos (empresa_id, origen, serie, numero, tipo, proveedor_id, fecha_emision, total,
    retenciones, saldo_al_inicio, retenciones_por_practicar, referencia, vencimiento, estado, registrado_en, registrado_por)
  select $1, 'saldo_inicial', 'N', 'NCR' || g, 'nota_de_credito', p.id, date '2025-07-01' + (g % 100), 500, 0, 500, 0,
         'NREF' || g, null, 'registrado', now(), $2
    from generate_series(1, ${VOLUMEN.notas}) g join proveedores_v p on p.rn = (g % ${VOLUMEN.proveedores}) + 1`;

const NUMERADOS = `
  create temp table cargos_v as
    select id, proveedor_id, row_number() over (partition by proveedor_id order by id) as rn,
           row_number() over (order by id) as gn
      from cuentas_por_pagar.documentos where empresa_id = $1 and tipo = 'factura';
  create temp table notas_v as
    select id, proveedor_id, row_number() over (order by id) as gn
      from cuentas_por_pagar.documentos where empresa_id = $1 and tipo = 'nota_de_credito'`;

const CONTRASENAS = `
  insert into cuentas_por_pagar.contrasenas (empresa_id, proveedor_id, numero, fecha, fecha_de_pago)
  select $1, id, rn, '2026-01-10', '2026-02-10' from proveedores_v;
  insert into cuentas_por_pagar.contrasena_documentos (empresa_id, proveedor_id, contrasena_id, documento_id)
  select $1, c.proveedor_id, k.id, c.id
    from cargos_v c join cuentas_por_pagar.contrasenas k on k.proveedor_id = c.proveedor_id and k.empresa_id = $1`;

const PAGOS = `
  create temp table lineas_v as
    select g, c.id as cargo_id, c.proveedor_id, cd.contrasena_id, gen_random_uuid() as pago_id
      from generate_series(1, ${VOLUMEN.pagos}) g
      join cargos_v c on c.gn = ((g - 1) % ${VOLUMEN.cargos}) + 1
      join cuentas_por_pagar.contrasena_documentos cd on cd.documento_id = c.id and cd.empresa_id = $1;
  insert into cuentas_por_pagar.pagos (id, empresa_id, proveedor_id, numero, forma, fecha, monto, motivo, con_carga_cerrada,
    estado, fecha_de_anulacion, anulado_en, anulado_por, motivo_de_anulacion, creado_en)
  select pago_id, $1, proveedor_id, g, 'cuenta_de_apertura',
         case when g <= ${VOLUMEN.pagosPosfechados} then date '2027-06-01' else date '2026-01-01' + (g % 300) end, 10,
         'Volumen', false,
         case when g > ${VOLUMEN.pagos - VOLUMEN.pagosAnulados} then 'anulado' else 'vigente' end,
         case when g > ${VOLUMEN.pagos - VOLUMEN.pagosAnulados} then date '2026-01-01' + (g % 300) + 5 end,
         case when g > ${VOLUMEN.pagos - VOLUMEN.pagosAnulados} then now() end,
         case when g > ${VOLUMEN.pagos - VOLUMEN.pagosAnulados} then $2::uuid end,
         case when g > ${VOLUMEN.pagos - VOLUMEN.pagosAnulados} then 'Error' end,
         case when g <= ${VOLUMEN.pagosPosfechados} then timestamptz '2026-10-01' else now() end
    from lineas_v;
  insert into cuentas_por_pagar.aplicaciones_de_pagos (empresa_id, proveedor_id, pago_id, contrasena_id, cargo_id, monto, vigente)
  select $1, proveedor_id, pago_id, contrasena_id, cargo_id, 10, g <= ${VOLUMEN.pagos - VOLUMEN.pagosAnulados} from lineas_v`;

const NOTAS_Y_AJUSTES = `
  insert into cuentas_por_pagar.aplicaciones_de_notas (empresa_id, proveedor_id, nota_id, cargo_id, monto, forma, fecha)
  select $1, n.proveedor_id, n.id, c.id, 10, 'automatica', date '2026-02-01'
    from notas_v n join cargos_v c on c.proveedor_id = n.proveedor_id and c.rn <= 4
   limit ${VOLUMEN.aplicacionesDeNotas};
  insert into cuentas_por_pagar.ajustes_de_saldo (empresa_id, proveedor_id, documento_id, monto, fecha, causa, motivo)
  select $1, proveedor_id, id, 1, date '2026-03-01', 'no_recuperable', 'Volumen' from notas_v where gn <= ${VOLUMEN.ajustes};
  create temp table reintegros_v as
    select gen_random_uuid() as reintegro_id, gn, id as nota_id, proveedor_id from notas_v where gn <= ${VOLUMEN.reintegros};
  insert into cuentas_por_pagar.reintegros (id, empresa_id, proveedor_id, numero, forma, fecha, monto, referencia)
  select reintegro_id, $1, proveedor_id, gn, 'efectivo', date '2026-04-01', 1, 'RC-' || gn from reintegros_v;
  insert into cuentas_por_pagar.aplicaciones_de_reintegros (empresa_id, proveedor_id, reintegro_id, nota_id, monto)
  select $1, proveedor_id, reintegro_id, nota_id, 1 from reintegros_v`;

const TABLAS_A_ANALIZAR = [
  'cuentas_por_pagar.documentos',
  'cuentas_por_pagar.aplicaciones_de_notas',
  'cuentas_por_pagar.ajustes_de_saldo',
  'cuentas_por_pagar.contrasenas',
  'cuentas_por_pagar.contrasena_documentos',
  'cuentas_por_pagar.pagos',
  'cuentas_por_pagar.aplicaciones_de_pagos',
  'cuentas_por_pagar.reintegros',
  'cuentas_por_pagar.aplicaciones_de_reintegros',
  'terceros.terceros',
  'terceros.proveedores',
  'bancos.movimientos',
  'bancos.conciliaciones',
];

/** Siembra el volumen de una empresa con una sola conexión (las tablas temporales viven en ella). */
export async function sembrarVolumenDeLaEmpresa(dueno: DuenoDelVolumen): Promise<void> {
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  try {
    await conexion.query(PROVEEDORES, [dueno.cuentaId]);
    for (const paso of [DOCUMENTOS, NUMERADOS, CONTRASENAS, PAGOS, NOTAS_Y_AJUSTES]) {
      for (const sentencia of paso.split(/;\s*(?=insert|create)/)) {
        const usados = sentencia.includes('$2') ? 2 : sentencia.includes('$1') ? 1 : 0;
        await conexion.query(sentencia, [dueno.empresaId, dueno.usuarioId].slice(0, usados));
      }
    }
  } finally {
    await conexion.end();
  }
}

/** Las estadísticas deben estar al día en **todas** las tablas que lee el reporte: sin ellas el plan sale distinto. */
export async function analizarTablasDelVolumen(): Promise<void> {
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  try {
    for (const tabla of TABLAS_A_ANALIZAR) await conexion.query(`analyze ${tabla}`);
  } finally {
    await conexion.end();
  }
}
