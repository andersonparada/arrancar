import { beforeEach, describe, expect, it } from 'vitest';
import { AccesoDenegado } from '../../../../core/compartido/aplicacion/errores.js';
import { AVISO_DE_RETENCION_QUITADA } from '../../../dominio/avisos-de-retenciones.js';
import { DatosFiscalesDeEmpresa } from '../../../dominio/datos-fiscales-de-empresa.js';
import { DatosFiscalesDeProveedor } from '../../../dominio/datos-fiscales-de-proveedor.js';
import {
  FaltanDatosFiscalesDelProveedor,
  TipoNoCorrespondeAlProveedor,
} from '../../../dominio/errores-de-documento.js';
import { AVISO_DE_CONSUMIDOR_FINAL_GRANDE } from '../../../dominio/fuera-del-libro.js';
import { AVISO_DE_CAMBIO_DE_REGIMEN } from '../../../dominio/reglas-del-encabezado.js';
import {
  crearEscenario,
  operador,
  proveedorId,
  solicitud,
} from '../../../pruebas/escenario-de-documentos-en-memoria.soporte.js';
import type { SolicitudDeDocumento } from '../../dto/solicitud-de-documento.js';
import { PrevisualizarDocumento } from './previsualizar-documento.js';
import { RegistrarDocumento } from './registrar-documento.js';

let e = crearEscenario();
const peticion = (cambios: Partial<SolicitudDeDocumento>, puedeAjustarRetenciones = false) => ({
  solicitud: solicitud(cambios),
  puedeAjustarRetenciones,
});
const registrar = (cambios: Partial<SolicitudDeDocumento> = {}, puedeAjustar = false) =>
  new RegistrarDocumento(e.dependencias).ejecutar(operador, peticion(cambios, puedeAjustar));
const previsualizar = (cambios: Partial<SolicitudDeDocumento> = {}) =>
  new PrevisualizarDocumento(e.dependencias).ejecutar(operador, peticion(cambios));
const grande = () => [{ ...solicitud().lineas[0]!, total: '5600.00' }];
const sinDatos = { datosFiscalesDelProveedor: null };
const opcional = { regimenIsr: 'opcional_simplificado', esAgenteDeRetencionIva: false } as const;

beforeEach(() => {
  e = crearEscenario();
});

describe('proveedor sin datos fiscales guardados (opción C)', () => {
  it('en una factura del libro, con una empresa que retiene, registrar y calcular piden los datos con sus preguntas', async () => {
    for (const operacion of [registrar, previsualizar]) {
      const error = await operacion(sinDatos).catch((causa: unknown) => causa);

      expect(error).toBeInstanceOf(FaltanDatosFiscalesDelProveedor);
      expect(error).toMatchObject({
        codigo: 'faltan_datos_fiscales_del_proveedor',
        detalles: { campo: 'datosFiscalesDelProveedor', preguntas: [{ campo: 'regimenIsr' }, expect.anything()] },
      });
    }
    expect(e.repositorio.agregados).toHaveLength(0);
    expect(e.datosDeProveedor.filas.size).toBe(0);
  });

  it('con las respuestas se guardan con el documento, con auditoría, y las retenciones salen de ellas', async () => {
    const { documento, avisos } = await registrar({ datosFiscalesDelProveedor: opcional, lineas: grande() });

    expect(e.datosDeProveedor.filas.get(proveedorId)?.instantanea()).toMatchObject({
      esPequenoContribuyente: false,
      regimenIsr: 'opcional_simplificado',
      seLeRetieneIsr: true,
    });
    expect(e.auditoria.acciones()).toContain('libro-de-compras.datos-fiscales-de-proveedor:corregir');
    expect(documento.retenciones.map((retencion) => retencion.regla)).toEqual(['isr_opcional_simplificado']);
    expect(avisos.join(' ')).not.toContain('no tiene datos fiscales');
  });

  it('la vista previa usa las respuestas sin guardarlas', async () => {
    const { documento } = await previsualizar({ datosFiscalesDelProveedor: opcional, lineas: grande() });

    expect(documento.retenciones).toHaveLength(1);
    expect(e.datosDeProveedor.filas.size).toBe(0);
    expect(e.auditoria.entradas).toHaveLength(0);
  });

  it('si el proveedor ya tiene datos guardados, mandan ellos y no se pregunta ni se guarda nada', async () => {
    const guardados = DatosFiscalesDeProveedor.porOmision({ regimenIsr: 'no_domiciliado' });
    e.datosDeProveedor.filas.set(proveedorId, guardados);

    const { avisos } = await registrar({ ...sinDatos });

    expect(e.datosDeProveedor.filas.get(proveedorId)).toBe(guardados);
    expect(avisos.join(' ')).toContain('no está domiciliado');
  });

  it('la factura de pequeño contribuyente deduce el régimen de su tipo y lo guarda', async () => {
    await registrar({ ...sinDatos, tipo: 'factura_pequeno_contribuyente' });

    expect(e.datosDeProveedor.filas.get(proveedorId)?.instantanea()).toMatchObject({
      esPequenoContribuyente: true,
      regimenIsr: null,
    });
  });

  it('recibos y empresas que no retienen nada usan los valores por omisión, sin preguntar ni avisar', async () => {
    const recibo = await registrar({
      ...sinDatos,
      tipo: 'recibo',
      motivoFueraDelLibro: 'sin_fel',
      nitEmisor: null,
      serie: null,
      autorizacionFel: null,
    });
    const base = DatosFiscalesDeEmpresa.porOmision().instantanea();
    e.datosDeEmpresa.filas.set(
      operador.empresaId,
      DatosFiscalesDeEmpresa.crear({ ...base, esAgenteDeRetencionIsr: false }),
    );
    const sinRetener = await registrar({ ...sinDatos, numero: '2' });

    expect(recibo.avisos.join(' ')).not.toContain('datos fiscales');
    expect(sinRetener.avisos.join(' ')).not.toContain('datos fiscales');
    expect(e.datosDeProveedor.filas.size).toBe(0);
  });
});

describe('cambio de régimen del proveedor', () => {
  beforeEach(() => {
    e.datosDeProveedor.filas.set(proveedorId, DatosFiscalesDeProveedor.porOmision({ esPequenoContribuyente: true }));
  });

  it('el error sugiere actualizar los datos fiscales o confirmar', async () => {
    const error = await registrar({ ...sinDatos }).catch((causa: unknown) => causa);

    expect(error).toBeInstanceOf(TipoNoCorrespondeAlProveedor);
    expect((error as Error).message).toContain('actualice sus datos fiscales o confirme');
  });

  it('con la confirmación pasa, avisa y deja la auditoría con el motivo', async () => {
    const { avisos } = await registrar({ ...sinDatos, confirmarCambioDeRegimen: true });

    expect(avisos).toContain(AVISO_DE_CAMBIO_DE_REGIMEN);
    expect(e.auditoria.entradas).toMatchObject([
      {
        recurso: 'libro-de-compras.documentos',
        accion: 'corregir',
        motivo: expect.stringContaining('cambió de régimen'),
      },
    ]);
  });

  it('confirmar sin que haya cambio no avisa ni audita', async () => {
    e.datosDeProveedor.filas.set(proveedorId, DatosFiscalesDeProveedor.porOmision());

    const { avisos } = await registrar({ confirmarCambioDeRegimen: true });

    expect(avisos).not.toContain(AVISO_DE_CAMBIO_DE_REGIMEN);
    expect(e.auditoria.entradas).toHaveLength(0);
  });
});

describe('receptor de la FEL', () => {
  const fueraDelLibro = (cambios: Partial<SolicitudDeDocumento>) => ({
    motivoFueraDelLibro: 'fel_a_otro_nit' as const,
    nitReceptor: '1234 56789 0101',
    ...cambios,
  });

  it('una FEL a otra persona acepta su CUI', async () => {
    const { documento } = await registrar(fueraDelLibro({}));

    expect(documento).toMatchObject({ muestraEnReportesSat: false, nitReceptor: '1234567890101' });
  });

  it('una FEL a consumidor final de Q2,500.00 o más avisa; con menos, no', async () => {
    const consumidor = fueraDelLibro({ motivoFueraDelLibro: 'fel_a_consumidor_final', nitReceptor: 'CF' });

    const grandeAviso = await registrar({ ...consumidor, lineas: [{ ...solicitud().lineas[0]!, total: '2500.00' }] });
    const chica = await registrar({
      ...consumidor,
      numero: '2',
      lineas: [{ ...solicitud().lineas[0]!, total: '2499.99' }],
    });

    expect(grandeAviso.avisos).toContain(AVISO_DE_CONSUMIDOR_FINAL_GRANDE);
    expect(chica.avisos).not.toContain(AVISO_DE_CONSUMIDOR_FINAL_GRANDE);
  });

  it('sin FEL el receptor queda vacío, y en el libro es el NIT de la empresa', async () => {
    const sinFel = await registrar({ motivoFueraDelLibro: 'sin_fel', autorizacionFel: null, numero: '2' });
    const enElLibro = await registrar({ numero: '3' });

    expect(sinFel.documento.nitReceptor).toBeNull();
    expect(enElLibro.documento.nitReceptor).toBe('12345679');
  });
});

describe('retención ya practicada en un documento anulado', () => {
  const practicada = {
    serie: 'A',
    numero: '9',
    retenciones: [{ impuesto: 'iva' as const, regla: 'iva_contribuyente_especial' as const, monto: 9000 }],
  };

  beforeEach(() => {
    const base = DatosFiscalesDeEmpresa.porOmision().instantanea();
    const agente = DatosFiscalesDeEmpresa.crear({ ...base, agenteDeRetencionIva: 'contribuyente_especial' });
    e.datosDeEmpresa.filas.set(operador.empresaId, agente);
    e.consultas.anuladoConRetenciones = practicada;
  });

  it('propone en cero las mismas reglas, con el motivo y el aviso de lo ya retenido, sin pedir el permiso de ajustar', async () => {
    const { documento, avisos } = await registrar({ lineas: grande() });

    expect(documento.retenciones[0]).toMatchObject({
      regla: 'iva_contribuyente_especial',
      montoPropuesto: '0.00',
      monto: '0.00',
      motivoDelAjuste: 'Practicada en el documento anulado A-9',
    });
    expect(avisos.join(' ')).toContain('ya se retuvo IVA Q90.00');
    expect(avisos).not.toContain(AVISO_DE_RETENCION_QUITADA);
  });

  it('busca por la misma autorización FEL y por NIT, tipo, serie y número', async () => {
    const autorizacionFel = crypto.randomUUID();

    await registrar({ lineas: grande(), autorizacionFel });

    expect(e.consultas.clavesBuscadas).toEqual([
      expect.objectContaining({ autorizacionFel, nitEmisor: '576937K', tipo: 'factura', serie: 'A', numero: '1' }),
    ]);
  });

  it('queda auditado como corrección, con lo que habría propuesto y el motivo', async () => {
    const { documento } = await registrar({ lineas: grande() });

    expect(e.auditoria.entradas).toMatchObject([
      {
        recurso: 'libro-de-compras.retenciones',
        registroId: documento.id,
        accion: 'corregir',
        anterior: { regla: 'iva_contribuyente_especial', monto: '90.00', montoPropuesto: '90.00' },
        motivo: 'Practicada en el documento anulado A-9',
      },
    ]);
  });

  it('si el usuario la cambia sí exige el permiso de ajustar y su propio motivo', async () => {
    const ajuste = [{ regla: 'iva_contribuyente_especial' as const, monto: '90.00', motivo: 'La primera se devolvió' }];

    await expect(registrar({ lineas: grande(), ajustesDeRetenciones: ajuste })).rejects.toThrow(AccesoDenegado);
    const { documento } = await registrar({ lineas: grande(), ajustesDeRetenciones: ajuste }, true);

    expect(documento.retenciones[0]).toMatchObject({ monto: '90.00', motivoDelAjuste: 'La primera se devolvió' });
  });

  it('la vista previa también la propone en cero', async () => {
    const { documento } = await previsualizar({ lineas: grande() });

    expect(documento.retenciones[0]).toMatchObject({ monto: '0.00', montoPropuesto: '0.00' });
  });
});

describe('retención rebajada', () => {
  it('rebajar una retención (no solo quitarla) avisa la responsabilidad solidaria', async () => {
    const base = DatosFiscalesDeEmpresa.porOmision().instantanea();
    const agente = DatosFiscalesDeEmpresa.crear({ ...base, agenteDeRetencionIva: 'contribuyente_especial' });
    e.datosDeEmpresa.filas.set(operador.empresaId, agente);
    const ajuste = [{ regla: 'iva_contribuyente_especial' as const, monto: '45.00', motivo: 'Convenio' }];

    const { avisos } = await registrar({ lineas: grande(), ajustesDeRetenciones: ajuste }, true);

    expect(avisos).toContain(AVISO_DE_RETENCION_QUITADA);
  });
});
