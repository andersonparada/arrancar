import { describe, expect, it } from 'vitest';
import { DatosFiscalesDeEmpresa } from './datos-fiscales-de-empresa.js';
import { DatosFiscalesDeProveedor } from './datos-fiscales-de-proveedor.js';
import {
  preguntasDeDatosFiscales,
  resolverDatosFiscalesDelProveedor,
  type EntradaDeDatosFiscalesDelDocumento,
} from './datos-fiscales-del-documento.js';
import { FaltanDatosFiscalesDelProveedor } from './errores-de-documento.js';

const empresaQueRetiene = DatosFiscalesDeEmpresa.porOmision();
const empresaQueNoRetiene = DatosFiscalesDeEmpresa.crear({
  ...empresaQueRetiene.instantanea(),
  esAgenteDeRetencionIsr: false,
});
const pedidos = { regimenIsr: 'opcional_simplificado', esAgenteDeRetencionIva: false } as const;

const entrada = (cambios: Partial<EntradaDeDatosFiscalesDelDocumento> = {}): EntradaDeDatosFiscalesDelDocumento => ({
  tipo: 'factura',
  enElLibro: true,
  empresa: empresaQueRetiene,
  guardados: null,
  pedidos: null,
  ...cambios,
});

describe('datos fiscales de un proveedor sin fila guardada (opción C)', () => {
  it('en una factura del libro, si la empresa retiene, son obligatorios y el error dice qué preguntar', () => {
    const intento = () => resolverDatosFiscalesDelProveedor(entrada());

    expect(intento).toThrow(FaltanDatosFiscalesDelProveedor);
    try {
      intento();
    } catch (error) {
      expect(error).toMatchObject({
        codigo: 'faltan_datos_fiscales_del_proveedor',
        detalles: {
          campo: 'datosFiscalesDelProveedor',
          preguntas: [{ campo: 'regimenIva' }, { campo: 'regimenIsr' }, { campo: 'esAgenteDeRetencionIva' }],
        },
      });
    }
  });

  it('con las respuestas se calcula con ellas y se guardan', () => {
    const { vigentes, porGuardar } = resolverDatosFiscalesDelProveedor(entrada({ pedidos }));

    expect(vigentes.instantanea()).toMatchObject({ regimenIsr: 'opcional_simplificado', seLeRetieneIsr: true });
    expect(porGuardar).toBe(vigentes);
  });

  it('si la empresa no retiene nada no se pregunta: valores por omisión, y las respuestas, si llegan, se guardan', () => {
    const sin = resolverDatosFiscalesDelProveedor(entrada({ empresa: empresaQueNoRetiene }));
    const con = resolverDatosFiscalesDelProveedor(entrada({ empresa: empresaQueNoRetiene, pedidos }));

    expect(sin.vigentes.esIgualA(DatosFiscalesDeProveedor.porOmision())).toBe(true);
    expect(sin.porGuardar).toBeNull();
    expect(con.porGuardar?.instantanea().regimenIsr).toBe('opcional_simplificado');
  });

  it('la factura de pequeño contribuyente deduce el régimen de su tipo y no pregunta nada', () => {
    const { vigentes, porGuardar } = resolverDatosFiscalesDelProveedor(
      entrada({ tipo: 'factura_pequeno_contribuyente' }),
    );

    expect(vigentes.instantanea()).toMatchObject({ regimenIva: 'pequeno_contribuyente', regimenIsr: null });
    expect(porGuardar).toBe(vigentes);
  });

  it('la pregunta del régimen de IVA ofrece los dos que facturan como general', () => {
    const [regimenIva] = preguntasDeDatosFiscales().preguntas;

    expect(regimenIva?.campo).toBe('regimenIva');
    expect(regimenIva?.opciones.map((opcion) => opcion.valor)).toEqual(['general', 'no_domiciliado']);
  });

  it.each([
    ['FARP', 'primario'],
    ['FCRP', 'primario'],
    ['FPEC', 'pecuario'],
    ['FCPC', 'pecuario'],
    [null, 'primario'],
  ] as const)('el primario y pecuario con %s deduce %s y lo guarda', (tipoDte, regimenIva) => {
    const entradaDelDocumento = entrada({ tipo: 'factura_primario_pecuario', tipoDte });

    const { vigentes, porGuardar } = resolverDatosFiscalesDelProveedor(entradaDelDocumento);

    expect(vigentes.instantanea()).toMatchObject({ regimenIva, regimenIsr: null, seLeRetieneIva: false });
    expect(porGuardar).toBe(vigentes);
  });

  it.each([
    ['factura_pequeno_contribuyente_electronico', 'pequeno_contribuyente_electronico'],
    ['factura_contribuyente_agropecuario', 'contribuyente_agropecuario'],
  ] as const)('%s se calcula con el régimen derogado y no se guarda', (tipo, regimenIva) => {
    const { vigentes, porGuardar } = resolverDatosFiscalesDelProveedor(entrada({ tipo }));

    expect(vigentes.instantanea().regimenIva).toBe(regimenIva);
    expect(porGuardar).toBeNull();
  });

  it('lo guardado del proveedor manda sobre lo que se deduce de la familia', () => {
    const guardados = DatosFiscalesDeProveedor.porOmision({ regimenIva: 'general' });

    const resuelto = resolverDatosFiscalesDelProveedor(entrada({ tipo: 'factura_primario_pecuario', guardados }));

    expect(resuelto).toEqual({ vigentes: guardados, porGuardar: null });
  });

  it('recibos, documentos fuera del libro y notas usan los valores por omisión sin preguntar ni guardar', () => {
    for (const cambios of [
      { tipo: 'recibo' as const, enElLibro: false },
      { enElLibro: false },
      { tipo: 'nota_de_credito' as const },
    ]) {
      const { vigentes, porGuardar } = resolverDatosFiscalesDelProveedor(entrada({ ...cambios, pedidos }));

      expect(vigentes.esIgualA(DatosFiscalesDeProveedor.porOmision())).toBe(true);
      expect(porGuardar).toBeNull();
    }
  });

  it('lo guardado manda: no se pregunta ni se guarda nada', () => {
    const guardados = DatosFiscalesDeProveedor.porOmision({ regimenIva: 'pequeno_contribuyente' });

    const resultado = resolverDatosFiscalesDelProveedor(entrada({ guardados, pedidos }));

    expect(resultado).toEqual({ vigentes: guardados, porGuardar: null });
  });
});
