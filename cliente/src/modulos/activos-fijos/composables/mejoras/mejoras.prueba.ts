import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  consultaDeComponente,
  datosDeMejora,
  edicionDeMejoraNueva,
  erroresDeMejora,
  mensajeDeAnulacionDeMejora,
  mensajeDeRegistroDeMejora,
  renglonDeMejoraNuevo,
  sugiereComponente,
  totalDeMejoraEnCentavos,
  type EdicionDeMejora,
} from './edicion-de-mejora';
import {
  datosDeEstimacion,
  datosDeMatricula,
  edicionDeEstimacionNueva,
  edicionDeMatriculaNueva,
  erroresDeEstimacion,
  erroresDeMatricula,
} from './edicion-de-revision';

beforeEach(() => setActivePinia(createPinia()));

const llena = (): EdicionDeMejora => {
  const edicion = edicionDeMejoraNueva('2026-11-20');
  edicion.descripcion = ' Cambio de techo ';
  edicion.renglones = [{ ...renglonDeMejoraNuevo(1), monto: '1500.50', documentoDeSoporte: ' Factura 9 ' }];
  return edicion;
};

describe('mejora', () => {
  it('empieza como mejora, con un renglón y la fecha dada', () => {
    const edicion = edicionDeMejoraNueva('2026-11-20');
    expect(edicion).toMatchObject({ clase: 'mejora', fecha: '2026-11-20', separable: false });
    expect(edicion.renglones).toHaveLength(1);
  });

  it('pide descripción, monto y soporte, nombrando el renglón como el servidor', () => {
    expect(erroresDeMejora(llena())).toEqual({});
    const errores = erroresDeMejora(edicionDeMejoraNueva('2026-11-20'));
    expect(Object.keys(errores).sort()).toEqual([
      'costosManuales.0.documentoDeSoporte',
      'costosManuales.0.monto',
      'descripcion',
    ]);
  });

  it('una mejora no admite montos negativos, un costo posterior sí (nota de crédito), pero nunca cero', () => {
    const edicion = llena();
    edicion.renglones[0]!.monto = '-100.00';
    expect(erroresDeMejora(edicion)['costosManuales.0.monto']).toMatch(/mayor que cero/);
    edicion.clase = 'costo_posterior';
    expect(erroresDeMejora(edicion)).toEqual({});
    edicion.renglones[0]!.monto = '0';
    expect(erroresDeMejora(edicion)['costosManuales.0.monto']).toMatch(/cero/);
  });

  it('exige el motivo de un costo fuera del libro fiscal y revisa la vida', () => {
    const edicion = llena();
    edicion.renglones[0]!.aplicaAlLibroFiscal = false;
    edicion.vidaUtilRestante = '0';
    const errores = erroresDeMejora(edicion);
    expect(errores['costosManuales.0.motivoFueraDelLibroFiscal']).toBeDefined();
    expect(errores.vidaUtilRestanteContableMeses).toBeDefined();
  });

  it('pide al menos un costo', () => {
    const edicion = llena();
    edicion.renglones = [];
    expect(erroresDeMejora(edicion).costosManuales).toBeDefined();
  });

  it('suma los renglones válidos en centavos', () => {
    const edicion = llena();
    edicion.renglones.push({ ...renglonDeMejoraNuevo(2), monto: '0.25' }, { ...renglonDeMejoraNuevo(3), monto: 'x' });
    expect(totalDeMejoraEnCentavos(edicion)).toBe(150075);
  });

  it('manda lo vacío como null, la vida solo en mejora y «no es edificación» solo en edificios', () => {
    const edicion = llena();
    edicion.vidaUtilRestante = '120';
    edicion.noEsEdificacion = true;
    const datos = datosDeMejora('a1', edicion, false);
    expect(datos).toMatchObject({
      activoId: 'a1',
      descripcion: 'Cambio de techo',
      vidaUtilRestanteContableMeses: 120,
      noEsEdificacion: false,
    });
    expect(datos.costosManuales[0]).toMatchObject({
      monto: '1500.50',
      documentoDeSoporte: 'Factura 9',
      descripcion: null,
    });
    expect(datosDeMejora('a1', edicion, true).noEsEdificacion).toBe(true);
    edicion.clase = 'costo_posterior';
    expect(datosDeMejora('a1', edicion, true).vidaUtilRestanteContableMeses).toBeNull();
  });

  it('sugiere componente solo en una mejora separable', () => {
    expect(sugiereComponente({ clase: 'mejora', separable: true })).toBe(true);
    expect(sugiereComponente({ clase: 'mejora', separable: false })).toBe(false);
    expect(sugiereComponente({ clase: 'costo_posterior', separable: true })).toBe(false);
  });

  it('lleva al alta del componente con su principal y la descripción', () => {
    expect(consultaDeComponente('a1', ' Motor ')).toEqual({ padre: 'a1', descripcion: 'Motor' });
    expect(consultaDeComponente('a1', ' ')).toEqual({ padre: 'a1' });
  });

  it('dice cómo cambia el costo del activo y la vida', () => {
    const edicion = llena();
    edicion.vidaUtilRestante = '60';
    const mensaje = mensajeDeRegistroDeMejora(edicion, '10000.00');
    expect(mensaje).toContain('una mejora');
    expect(mensaje).toContain('60 meses');
  });

  it('explica la anulación de una mejora', () => {
    const texto = mensajeDeAnulacionDeMejora({
      id: 'm1',
      activoId: 'a1',
      numero: 1,
      anioDeNumero: 2026,
      clase: 'costo_posterior',
      fecha: '2026-11-01',
      descripcion: 'Flete',
      vidaUtilRestanteContableMeses: null,
      noEsEdificacion: false,
      estado: 'vigente',
      anuladaEn: null,
      motivoDeAnulacion: null,
      monto: '50.00',
      cantidadDeCostos: 1,
    });
    expect(texto).toContain('el costo posterior «Flete»');
    expect(texto).toContain('último cambio');
  });
});

describe('revisión de la estimación y de la matrícula', () => {
  it('la estimación parte del residual actual y pide vida y motivo', () => {
    const edicion = edicionDeEstimacionNueva({ valorResidual: '100.00' });
    expect(edicion.valorResidual).toBe('100.00');
    expect(Object.keys(erroresDeEstimacion(edicion)).sort()).toEqual(['motivo', 'vidaUtilRestanteMeses']);
    edicion.vidaUtilRestante = '36';
    edicion.motivo = ' Mejor uso ';
    expect(erroresDeEstimacion(edicion)).toEqual({});
    expect(datosDeEstimacion(edicion)).toEqual({
      vidaUtilRestanteMeses: 36,
      valorResidual: '100.00',
      motivo: 'Mejor uso',
    });
  });

  it('rechaza un residual negativo y manda vacío como null', () => {
    const edicion = { ...edicionDeEstimacionNueva({ valorResidual: null }), vidaUtilRestante: '12', motivo: 'x' };
    expect(datosDeEstimacion(edicion).valorResidual).toBeNull();
    expect(erroresDeEstimacion({ ...edicion, valorResidual: '-5' }).valorResidual).toBeDefined();
  });

  it('la matrícula parte de lo que el edificio tiene y pide un valor, el soporte y el motivo', () => {
    const edicion = edicionDeMatriculaNueva({
      valorDeMatricula: null,
      valorCatastral: null,
      valoresDelInmuebleCompleto: true,
    });
    expect(edicion.valoresDelInmuebleCompleto).toBe(true);
    expect(Object.keys(erroresDeMatricula(edicion)).sort()).toEqual([
      'documentoDeSoporte',
      'motivo',
      'valorDeMatricula',
    ]);
    edicion.valorCatastral = '500000.00';
    edicion.documentoDeSoporte = 'Certificación';
    edicion.motivo = 'Actualización';
    expect(erroresDeMatricula(edicion)).toEqual({});
    expect(datosDeMatricula(edicion)).toMatchObject({ valorDeMatricula: null, valorCatastral: '500000.00' });
  });
});
