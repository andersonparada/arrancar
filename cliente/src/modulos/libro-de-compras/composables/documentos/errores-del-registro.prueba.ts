import { describe, expect, it } from 'vitest';
import { ErrorApi } from '@/modulos/core/servicios/cliente-http';
import { erroresDeLineas, erroresDelEncabezado, errorDelTipo, problemaDeError } from './errores-del-registro';
import { lineaVacia } from './lineas-del-documento';
import {
  datosFiscalesContestados,
  faltaContestar,
  preguntasDelError,
  preguntasVisibles,
  type PreguntaFiscal,
} from './preguntas-fiscales';

const error = (estado: number, codigo: string, ...resto: [mensaje: string, detalles?: unknown]) =>
  new ErrorApi(estado, { codigo, mensaje: resto[0], detalles: resto[1] });

const PREGUNTAS = {
  campo: 'datosFiscalesDelProveedor',
  preguntas: [
    {
      campo: 'regimenIsr',
      pregunta: '¿En qué régimen de ISR está el proveedor?',
      opciones: [
        { valor: 'general', texto: 'General' },
        { valor: 'opcional_simplificado', texto: 'Opcional simplificado' },
      ],
    },
    {
      campo: 'esAgenteDeRetencionIva',
      pregunta: '¿Es agente de retención del IVA?',
      opciones: [
        { valor: true, texto: 'Sí' },
        { valor: false, texto: 'No' },
      ],
    },
  ],
};

describe('problemaDeError', () => {
  it('faltan_datos_fiscales_del_proveedor trae las preguntas del servidor', () => {
    const problema = problemaDeError(error(422, 'faltan_datos_fiscales_del_proveedor', 'Conteste.', PREGUNTAS));
    expect(problema).toMatchObject({ tipo: 'datos_fiscales', mensaje: 'Conteste.' });
    expect(problema?.tipo === 'datos_fiscales' && problema.preguntas.map((p) => p.campo)).toEqual([
      'regimenIsr',
      'esAgenteDeRetencionIva',
    ]);
  });

  it('tipo_no_corresponde_al_proveedor pide confirmar el cambio de régimen', () => {
    const detalles = { confirmarCon: 'confirmarCambioDeRegimen' };
    expect(problemaDeError(error(422, 'tipo_no_corresponde_al_proveedor', 'Es pequeño.', detalles))).toEqual({
      tipo: 'regimen',
      mensaje: 'Es pequeño.',
    });
  });

  it('los errores del tipo de documento van en su campo, no en un aviso general', () => {
    for (const codigo of [
      'tipo_dte_incoherente',
      'tipo_dte_obligatorio',
      'tipo_dte_sin_fel',
      'tipo_de_documento_obligatorio',
      'familia_derogada',
      'familia_aun_no_vigente',
      'factura_especial_no_disponible',
      'factura_especial_siempre_en_el_libro',
      'nota_sobre_factura_especial',
    ]) {
      const fallo = error(400, codigo, 'Mensaje del servidor.');
      expect(problemaDeError(fallo)).toBeNull();
      expect(errorDelTipo(fallo)?.tipoDte).toBeTruthy();
    }
  });

  it('los de fechas dicen lo que explica el servidor y los demás, cómo corregir', () => {
    expect(errorDelTipo(error(422, 'familia_derogada', 'Derogado desde 2025-07-09.'))).toEqual({
      tipoDte: 'Derogado desde 2025-07-09.',
    });
    expect(errorDelTipo(error(400, 'tipo_dte_sin_fel', 'x'))?.tipoDte).toContain('Recibo');
    expect(errorDelTipo(error(422, 'documento_repetido', 'x'))).toBeNull();
    expect(errorDelTipo(new Error('x'))).toBeNull();
  });

  it('la empresa sin datos fiscales o sin NIT lleva a los datos de la empresa', () => {
    expect(problemaDeError(error(422, 'empresa_sin_datos_fiscales', 'Complételos.'))?.tipo).toBe('empresa');
    expect(problemaDeError(error(422, 'empresa_sin_nit', 'Escriba el NIT.'))?.tipo).toBe('empresa');
  });

  it('documento_repetido trae el id del documento ya registrado', () => {
    const problema = problemaDeError(error(409, 'documento_repetido', 'Ya existe.', { documentoId: 'd-1' }));
    expect(problema).toEqual({ tipo: 'repetido', mensaje: 'Ya existe.', documentoId: 'd-1' });
  });

  it('un repetido sin id sigue siendo un problema, sin enlace', () => {
    expect(problemaDeError(error(409, 'documento_repetido', 'Ya existe.'))).toMatchObject({ documentoId: null });
  });

  it('un 403 explica cómo corregir el ajuste de retenciones', () => {
    const problema = problemaDeError(error(403, 'acceso_denegado', 'No tiene permiso.'));
    expect(problema?.tipo).toBe('permiso');
    expect(problema?.mensaje).toContain('Ajustar retenciones');
  });

  it('los errores por campo no son un problema del formulario entero', () => {
    const detalles = [{ campo: 'numero', mensaje: 'Campo obligatorio.' }];
    expect(problemaDeError(error(400, 'validacion', 'Revise los datos enviados.', detalles))).toBeNull();
  });

  it('cualquier otro error se muestra con su mensaje', () => {
    expect(problemaDeError(error(422, 'destino_no_disponible', 'Active el destino.'))).toEqual({
      tipo: 'otro',
      mensaje: 'Active el destino.',
    });
    expect(problemaDeError(new Error('Sin conexión'))).toEqual({ tipo: 'otro', mensaje: 'Sin conexión' });
  });
});

describe('erroresDeLineas', () => {
  it('reparte lineas.N.campo entre las líneas, sin contar las filas en blanco que no se enviaron', () => {
    const [primera, enBlanco, tercera] = [
      { ...lineaVacia(), conceptoId: 'c-1', total: 10 },
      lineaVacia(),
      { ...lineaVacia(), conceptoId: 'c-2', total: 20 },
    ] as const;
    const errores = { 'lineas.1.total': 'Monto inválido.', 'lineas.0.conceptoId': 'Elija el concepto.', numero: 'X' };
    const resultado = erroresDeLineas([primera, enBlanco, tercera], errores);
    expect(resultado[primera.clave]).toEqual({ conceptoId: 'Elija el concepto.' });
    expect(resultado[tercera.clave]).toEqual({ total: 'Monto inválido.' });
    expect(resultado[enBlanco.clave]).toBeUndefined();
  });

  it('el encabezado se queda con lo que no es de una línea', () => {
    expect(erroresDelEncabezado({ numero: 'X', 'lineas.0.total': 'Y' })).toEqual({ numero: 'X' });
  });
});

describe('preguntas fiscales', () => {
  const preguntas = preguntasDelError(PREGUNTAS) as PreguntaFiscal[];

  it('lee solo las preguntas bien formadas', () => {
    expect(preguntas).toHaveLength(2);
    expect(preguntasDelError({ preguntas: [{ campo: 1 }, 'x', null] })).toEqual([]);
    expect(preguntasDelError(null)).toEqual([]);
  });

  it('conserva las opciones de sí o no como booleanos', () => {
    expect(preguntas[1]?.opciones.map((o) => o.valor)).toEqual([true, false]);
  });

  it('sabe si falta contestar', () => {
    expect(faltaContestar(preguntas, {})).toBe(true);
    expect(faltaContestar(preguntas, { regimenIsr: 'general' })).toBe(true);
    expect(faltaContestar(preguntas, { regimenIsr: 'general', esAgenteDeRetencionIva: 'false' })).toBe(false);
  });

  it('arma la respuesta que espera el servidor solo cuando está completa', () => {
    expect(datosFiscalesContestados({ regimenIsr: 'general' })).toBeNull();
    expect(datosFiscalesContestados({ regimenIsr: 'general', esAgenteDeRetencionIva: 'true' })).toEqual({
      regimenIsr: 'general',
      esAgenteDeRetencionIva: true,
    });
    expect(datosFiscalesContestados({ regimenIsr: 'general', esAgenteDeRetencionIva: 'false' })).toEqual({
      regimenIsr: 'general',
      esAgenteDeRetencionIva: false,
    });
  });

  it('con un régimen de IVA especial ya no pregunta ISR ni agente', () => {
    const conIva: PreguntaFiscal[] = [
      { campo: 'regimenIva', pregunta: '¿Régimen de IVA?', opciones: [] },
      ...preguntas,
    ];
    expect(preguntasVisibles(conIva, {}).map((p) => p.campo)).toEqual([
      'regimenIva',
      'regimenIsr',
      'esAgenteDeRetencionIva',
    ]);
    expect(preguntasVisibles(conIva, { regimenIva: 'general' })).toHaveLength(3);
    expect(preguntasVisibles(conIva, { regimenIva: 'primario' }).map((p) => p.campo)).toEqual(['regimenIva']);
    expect(faltaContestar(conIva, { regimenIva: 'primario' })).toBe(false);
  });

  it('envía el régimen de IVA y completa lo que el servidor ignora en un régimen especial', () => {
    expect(datosFiscalesContestados({ regimenIva: 'sin_inscripcion' })).toEqual({
      regimenIva: 'sin_inscripcion',
      regimenIsr: 'utilidades',
      esAgenteDeRetencionIva: false,
    });
    expect(
      datosFiscalesContestados({ regimenIva: 'general', regimenIsr: 'exento', esAgenteDeRetencionIva: 'true' }),
    ).toEqual({ regimenIva: 'general', regimenIsr: 'exento', esAgenteDeRetencionIva: true });
    expect(datosFiscalesContestados({ regimenIva: 'general' })).toBeNull();
  });
});

describe('errores de la factura especial', () => {
  it('los del vendedor van en el campo del vendedor, diciendo cómo corregir', () => {
    for (const codigo of ['vendedor_de_factura_especial_invalido', 'receptor_invalido', 'vendedor_no_coincide']) {
      const fallo = error(codigo === 'vendedor_no_coincide' ? 422 : 400, codigo, 'Mensaje del servidor.');
      expect(problemaDeError(fallo)).toBeNull();
      expect(errorDelTipo(fallo)?.nitReceptor).toBeTruthy();
      expect(errorDelTipo(fallo)?.tipoDte).toBeUndefined();
    }
    expect(errorDelTipo(error(400, 'vendedor_de_factura_especial_invalido', 'x'))?.nitReceptor).toContain(
      'NIT o el CUI',
    );
    expect(errorDelTipo(error(422, 'vendedor_no_coincide', 'x'))?.nitReceptor).toContain('proveedor elegido');
  });

  it('la nota sobre una factura especial dice qué hacer', () => {
    expect(errorDelTipo(error(422, 'nota_sobre_factura_especial', 'x'))?.tipoDte).toContain('Anule la FESP');
  });
});
