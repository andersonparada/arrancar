import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { cargoDeEjemplo, datosDeEjemplo } from './ejemplos-de-pago';
import { claveDeProveedor, erroresDelReparto, repartirErroresDelReparto } from './errores-del-reparto';
import { conLosCargos, conSumaDeOtroMes, proveedorDelReparto } from './reparto-de-efectivo';
import { avisoDeUmbral, explicacionDeBancarizacion } from './resumen-del-reparto';

beforeEach(() => setActivePinia(createPinia()));

function proveedor(id: string, nombre: string, cargos = [cargoDeEjemplo(`${id}-a`)]) {
  const nuevo = proveedorDelReparto(
    { proveedorId: id, nombre, nit: '1234567', porPagar: '1000.00', disponible: '1000.00', contrasenas: 1 },
    HOY,
  );
  conLosCargos(nuevo, datosDeEjemplo(cargos), null);
  return nuevo;
}

const HOY = '2026-11-15';

describe('errores generales del proveedor', () => {
  it('un error general del servidor queda en la clave general del proveedor', () => {
    const p = proveedor('p1', 'Agro');
    expect(repartirErroresDelReparto({ 'pagos.0.aplicaciones': 'Demasiados' }, [p])).toEqual({
      [claveDeProveedor('p1', 'general')]: 'Demasiados',
    });
  });

  it('más de 100 documentos en un pago se avisa antes de enviar', () => {
    const cargos = Array.from({ length: 101 }, (_, i) =>
      cargoDeEjemplo(`c${i}`, { saldo: '10.00', propuesto: '10.00' }),
    );
    const p = proveedor('p1', 'Agro', cargos);
    const errores = erroresDelReparto([p], { disponible: '99999.00', fechaDelRetiro: '2026-11-01', hoy: HOY });
    expect(errores[claveDeProveedor('p1', 'general')]).toContain('hasta 100 documentos');
  });
});

describe('bancarización anticipada', () => {
  it('una factura de Q30,000 o más pagada por partes anticipa el aviso, con lo que se pierde', () => {
    const p = proveedor('p1', 'Agro', [
      cargoDeEjemplo('g', { saldo: '35000.00', propuesto: '5000.00', sobreUmbralDeBancarizacion: true }),
    ]);
    const aviso = avisoDeUmbral(p)!;
    expect(aviso).toContain('de ese monto o más');
    expect(aviso).toContain('art. 106');
    expect(explicacionDeBancarizacion(proveedor('p2', 'Sin datos'))).toContain('Código Tributario');
  });

  it('un proveedor cuya fecha pasó a otro mes tiene la suma vieja', () => {
    const p = proveedor('p1', 'Agro');
    expect(conSumaDeOtroMes([p])).toEqual([]);
    p.edicion.fecha = '2025-01-10';
    expect(conSumaDeOtroMes([p])).toEqual([p]);
  });
});
