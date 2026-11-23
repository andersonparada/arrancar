import type { IncisoFiscal } from './incisos-fiscales.js';
import { CAUSAS_CON_DENUNCIA, type CausaDeBaja } from './tipos-de-baja.js';

/** Un aviso: se muestra, nunca bloquea (el efecto fiscal de no tener el documento lo explica el texto). */
export interface AvisoDeBaja {
  codigo: string;
  mensaje: string;
}

export interface DatosParaLosAvisos {
  causa: CausaDeBaja;
  fecha: string;
  tieneActa: boolean;
  tieneDenuncia: boolean;
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
        'Falta la denuncia ante el Ministerio Público o la PNC: sin ella no se respalda el robo o extravío.',
      ),
    );
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
  if (datos.causa === 'faltante_de_inventario' && !datos.tieneActa)
    avisos.push(
      aviso(
        'faltante_con_iva',
        'Un faltante sin acta puede considerarse una venta o retiro sin factura: puede generar débito de IVA. Consulte con su contador.',
      ),
    );
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

const AVISO_DEL_IVA = aviso(
  'venta_con_iva',
  'La venta genera débito fiscal de IVA: debe estar respaldada por la factura emitida. El cobro se registra en Bancos con el concepto «Venta de activo».',
);

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
  const avisos = [AVISO_DEL_IVA, avisoDelResultado(datos.resultadoFiscalCentavos)];
  if (datos.incisoFiscal === 'reproductores') avisos.push(AVISO_DEL_REPRODUCTOR);
  const exenta = esInmueble(datos.incisoFiscal) && datos.tipoDePersona === 'individual';
  if (exenta && datos.fecha >= VIGENCIA_DE_LA_EXENCION) avisos.push(AVISO_DEL_INMUEBLE);
  return avisos;
}

/** Los avisos que corresponden a una baja o venta, según lo que ya tiene y lo que dice la ley (§6.8; V-10 y V-12). */
export function avisosDeBaja(datos: DatosParaLosAvisos): AvisoDeBaja[] {
  return [...avisosDeDocumentos(datos), ...avisosDeLaCausa(datos), ...avisosDeLaVenta(datos)];
}
