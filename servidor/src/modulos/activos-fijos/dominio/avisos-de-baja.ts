import type { IncisoFiscal } from './incisos-fiscales.js';
import { CAUSAS_CON_DENUNCIA, type CausaDeBaja, type TipoDeActa } from './tipos-de-baja.js';

/** Un aviso: se muestra, nunca bloquea (el efecto fiscal de no tener el documento lo explica el texto). */
export interface AvisoDeBaja {
  codigo: string;
  mensaje: string;
}

export interface DatosParaLosAvisos {
  causa: CausaDeBaja;
  fecha: string;
  tieneActa: boolean;
  /** Quién firmó el acta; `null` si no hay (la administrativa es control interno: no sustituye a la notarial). */
  tipoDeActa: TipoDeActa | null;
  /** La certificación de la denuncia ratificada, ya subida (no basta el número). */
  tieneDenuncia: boolean;
  esDeTerceros: boolean;
  /** Régimen de IVA vigente de la empresa; `null` si no hay datos fiscales. */
  regimenDeIva: string | null;
  /** Cuántos componentes se dieron de baja junto con este activo. */
  componentes: number;
  incisoFiscal: IncisoFiscal;
  /** Persona individual o jurídica del régimen vigente de la empresa; `null` si no hay datos fiscales. */
  tipoDePersona: 'individual' | 'juridica' | null;
  resultadoFiscalCentavos: number | null;
}

/** El primer día en que rige la exención de ganancia de capital de inmuebles de personas individuales (Decreto 18-2026). */
const VIGENCIA_DE_LA_EXENCION = '2027-01-01';

const aviso = (codigo: string, mensaje: string): AvisoDeBaja => ({ codigo, mensaje });

function avisosDeDocumentos(datos: DatosParaLosAvisos): AvisoDeBaja[] {
  const avisos: AvisoDeBaja[] = [];
  if (!datos.tieneActa)
    avisos.push(
      aviso(
        'sin_acta',
        'Falta el acta de baja. Sin ella, el bien puede considerarse faltante o desviado: el IVA (art. 3, num. 7) y la deducción de la pérdida en el ISR (art. 21, num. 17) pueden objetarse.',
      ),
    );
  if (CAUSAS_CON_DENUNCIA.includes(datos.causa) && !datos.tieneDenuncia)
    avisos.push(
      aviso(
        'sin_denuncia',
        'Falta la certificación de la denuncia presentada ante la autoridad policial y ratificada en el juzgado (Ley del IVA, art. 3, num. 7): el número de denuncia no la sustituye.',
      ),
    );
  return avisos;
}

const AVISO_DEL_FALTANTE = aviso(
  'faltante_con_iva',
  'Un faltante sin causa comprobada genera débito de IVA aunque tenga acta (Ley del IVA, art. 3, num. 7): solo se exceptúa el caso fortuito o de fuerza mayor (acta notarial) o el delito (certificación de la denuncia ratificada). Consulte con su contador.',
);

const AVISO_DE_ACTA_NOTARIAL = aviso(
  'destruccion_sin_acta_notarial',
  'Para respaldar que la destrucción es caso fortuito o de fuerza mayor se exige acta notarial; el acta administrativa sirve de control interno pero no la sustituye (Ley del IVA, art. 3, num. 7).',
);

const AVISO_DEL_EXTRAVIO = aviso(
  'extravio_sin_excepcion',
  'Extraviar un bien no es por sí un delito: el IVA no se exceptúa salvo que pruebe caso fortuito, fuerza mayor o delito (Ley del IVA, art. 3, num. 7).',
);

const AVISO_DEL_DUENO = aviso(
  'posible_responsabilidad_ante_el_dueno',
  'Posible responsabilidad ante el dueño: revise el contrato. El bien no se devolvió y puede deber su reposición o indemnización, que se registra aparte.',
);

const CAUSAS_DE_PERDIDA = ['faltante_de_inventario', 'destruccion', 'robo', 'extravio', 'otra'];

function avisosDelIvaDePerdidas(datos: DatosParaLosAvisos): AvisoDeBaja[] {
  const avisos: AvisoDeBaja[] = [];
  if (datos.causa === 'faltante_de_inventario') avisos.push(AVISO_DEL_FALTANTE);
  if (datos.causa === 'destruccion' && datos.tipoDeActa !== 'notarial') avisos.push(AVISO_DE_ACTA_NOTARIAL);
  if (datos.causa === 'extravio') avisos.push(AVISO_DEL_EXTRAVIO);
  if (datos.esDeTerceros && CAUSAS_DE_PERDIDA.includes(datos.causa)) avisos.push(AVISO_DEL_DUENO);
  return avisos;
}

function avisosDeLaCausa(datos: DatosParaLosAvisos): AvisoDeBaja[] {
  const avisos: AvisoDeBaja[] = [];
  if (datos.causa === 'donacion')
    avisos.push(
      aviso(
        'donacion_con_iva',
        'La donación de un bien puede generar débito de IVA (Ley del IVA, art. 3): consulte con su contador si debe emitir la factura.',
      ),
    );
  avisos.push(...avisosDelIvaDePerdidas(datos));
  if (datos.componentes > 0)
    avisos.push(
      aviso('con_componentes', `También se dieron de baja ${datos.componentes} componente(s) de este activo.`),
    );
  return avisos;
}

function esInmueble(inciso: IncisoFiscal): boolean {
  return inciso === 'edificios' || inciso === 'terrenos';
}

const AVISO_DEL_REPRODUCTOR = aviso(
  'venta_de_reproductor',
  'Venta de ganado reproductor: el resultado fiscal se calcula con su costo completo, incluido su valor como ganado común. Si el animal se vende por descarte como parte del giro de la finca, confirme con su contador si es ganancia de capital o ingreso de la actividad.',
);

const AVISO_DEL_INMUEBLE = aviso(
  'inmueble_de_persona_individual',
  'Desde el 1 de enero de 2027 la venta de inmuebles por personas individuales está exenta de ganancia de capital (Decreto 18-2026, ISR art. 87 num. 4): confirme con su contador si le aplica.',
);

const avisoIva = (mensaje: string) => aviso('venta_con_iva', mensaje);

/** El aviso del IVA según el bien y el régimen: la ley grava la primera venta de inmuebles (art. 3, num. 8). */
function avisoDelIva(datos: DatosParaLosAvisos): AvisoDeBaja {
  const cobro = 'El cobro se registra en Bancos con el concepto «Venta de activo».';
  if (esInmueble(datos.incisoFiscal))
    return avisoIva(
      `Solo la primera venta de un inmueble genera IVA (Ley del IVA, art. 3, num. 8): revise si lo es y el impuesto que corresponde, y que la venta esté respaldada por su factura. ${cobro}`,
    );
  if (datos.regimenDeIva === 'general')
    return avisoIva(`La venta genera débito fiscal de IVA: debe estar respaldada por la factura emitida. ${cobro}`);
  if (datos.regimenDeIva === null)
    return avisoIva(`Revise el IVA que corresponde a esta venta y que esté respaldada por su factura. ${cobro}`);
  return avisoIva(`La venta se factura y tributa según su régimen: confirme con su contador. ${cobro}`);
}

/** Ganancia (10 %, aparte) o pérdida (no deducible) de capital según el resultado fiscal. */
function avisoDelResultado(resultadoFiscalCentavos: number): AvisoDeBaja {
  if (resultadoFiscalCentavos > 0)
    return aviso(
      'ganancia_de_capital',
      'La ganancia fiscal es ganancia de capital (10 %): se declara aparte, a más tardar el día 10 del mes siguiente (ISR, arts. 84, 89, 92 y 95).',
    );
  return aviso(
    'perdida_de_capital',
    'La pérdida de capital no es deducible: solo se compensa con ganancias de capital futuras (ISR, arts. 91 y 96).',
  );
}

function avisosDeLaVenta(datos: DatosParaLosAvisos): AvisoDeBaja[] {
  if (datos.causa !== 'venta' || datos.resultadoFiscalCentavos === null) return [];
  const avisos = [avisoDelIva(datos), avisoDelResultado(datos.resultadoFiscalCentavos)];
  if (datos.incisoFiscal === 'reproductores') avisos.push(AVISO_DEL_REPRODUCTOR);
  const exenta = esInmueble(datos.incisoFiscal) && datos.tipoDePersona === 'individual';
  if (exenta && datos.fecha >= VIGENCIA_DE_LA_EXENCION) avisos.push(AVISO_DEL_INMUEBLE);
  return avisos;
}

/** Los avisos que corresponden a una baja o venta, según lo que ya tiene y lo que dice la ley (§6.8; V-10 y V-12). */
export function avisosDeBaja(datos: DatosParaLosAvisos): AvisoDeBaja[] {
  return [...avisosDeDocumentos(datos), ...avisosDeLaCausa(datos), ...avisosDeLaVenta(datos)];
}
