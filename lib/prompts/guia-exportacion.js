// ─────────────────────────────────────────────
// GUÍA OPERATIVA DE EXPORTACIÓN ARGENTINA
// Fuente: Manual de Aduanas — Juarez et al. (2018)
// Se inyecta dinámicamente en consultas de exportación.
// ─────────────────────────────────────────────
export const GUIA_EXPORTACION = `
GUIA OPERATIVA DE EXPORTACION ARGENTINA
Basada en: Manual de Aduanas - Juarez et al. (2018)
Fuente exclusiva: manual-de-aduanas-2021.txt



1. PASO A PASO OPERATIVO DE UNA EXPORTACION
1.1 Condicion previa: inscripcion del exportador
Antes de poder operar, el exportador (persona fisica o juridica) debe inscribirse en el Registro de Exportadores e Importadores de la Direccion General de Aduanas (DGA). Este registro habilita el acceso al Sistema Informatico Malvina (SIM). Sin esta inscripcion, no es posible oficializar ninguna destinacion de exportacion.

1.2 Secuencia operativa paso a paso

1 Negociacion comercial y preparacion de la operacion
El exportador cierra la venta con el comprador del exterior. Se define el precio (generalmente en USD), el Incoterm aplicable, el medio de pago (carta de credito, transferencia, etc.), el medio de transporte y el puerto/aeropuerto/paso fronterizo de salida. Se emite la Factura Pro-forma si el comprador la requiere.

2 Emision de la Factura tipo E y Packing List
El exportador emite la Factura Comercial tipo 'E' (formato establecido por AFIP), que debe contener descripcion, valor de la mercaderia, medio y forma de pago. Si existe Carta de Credito, debe redactarse en los mismos terminos. Salvo coincidencia idiomatica con el pais comprador, se redacta en ingles y los montos se expresan en la moneda pactada (generalmente USD). La AFIP exige CAI (Codigo de Autorizacion de Impresion) valido para poder acceder luego al cobro de reintegros. Ademas se emite el Packing List especificando contenido, peso bruto y neto de la mercaderia.

3 Obtencion de certificados de organismos intervinientes
Segun el tipo de producto, se obtienen los certificados requeridos por otros organismos: SENASA (fitosanitario/sanitario), INAL, ANMAT, INPI, etc. El Certificado Sanitario o Fitosanitario es extendido y firmado por el profesional del organismo oficial que corresponda y certifica que la mercaderia esta libre de germenes o virus. El Certificado de Origen se gestiona ante el organismo autorizado segun el acuerdo comercial aplicable (ej: ALADI, MERCOSUR), y acredita ante el pais de destino el origen argentino de la mercaderia.

4 Contratacion del Despachante de Aduana
El exportador designa un Despachante de Aduana habilitado, quien actuara como mandatario ante el servicio aduanero. Para ello el exportador le otorga una Carta Poder en papel membretado firmada por el. El despachante es quien firma la declaracion principal (Permiso de Embarque) y es responsable de la presentacion ante la aduana.

5 Oficializacion de la Destinacion de Exportacion en el SIM
El Despachante ingresa al Sistema Informatico Malvina (SIM) todos los datos de la operacion y oficializa la Destinacion de Exportacion. El documento central es el Permiso de Embarque (Formulario OM-1993-A SIM, emitido por el sistema Malvina). En caso de pago de derechos de exportacion, se afectan fondos depositados en subcuenta Malvina o se constituye garantia (efectivo, aval bancario o poliza de seguro de caucion). La declaracion es inalterable una vez registrada, salvo excepciones expresamente previstas en el Codigo Aduanero. El plazo de validez del Permiso de Embarque es de 31 dias corridos desde su registro (45 dias si hay transito terrestre con camion o ferrocarril).

6 Ingreso de la mercaderia al deposito de exportacion
La mercaderia se ingresa a la Zona Primaria Aduanera y al deposito de exportacion habilitado. El depositario deja constancia en el SIM del ingreso de bultos, indicando cantidad y estado de los mismos en el reverso del OM-1993 SIM. Este ingreso debe realizarse en forma PREVIA a la Presentacion de la Declaracion Detallada. El deposito debe estar habilitado por el Servicio Aduanero, con condiciones de seguridad especificas (paredes, alambrados, cerraduras). La mercaderia en deposito provisorio de exportacion debe ser despachada dentro de 1 mes o cae en rezago (venta en subasta publica).

7 Presentacion ante aduana y asignacion de canal de selectividad
El Servicio Aduanero efectua la presentacion de la Destinacion de Exportacion y el Sistema Malvina asigna automaticamente el canal de selectividad. Existen 3 canales posibles:
- CANAL VERDE: Libramiento inmediato. El sistema cambia el estado de Oficializado a 'Autorizacion a Retiro' sin control fisico de la mercaderia. Es la aplicacion del 'Despacho en Confianza'.
- CANAL NARANJA: Control documental estricto sin verificacion fisica. El estado queda en 'Presentado'. Se aplica cuando la operacion exige documentacion adicional o cuando hay mercancias bajo cupos.
- CANAL ROJO: Control documental + verificacion fisica obligatoria como condicion previa al libramiento. El estado queda en 'Presentado' hasta que el verificador ingrese el 'Resultado de la Verificacion'.

IMPORTANTE: El exportador o su Despachante deben estar presentes en el acto de verificacion. Si no concurren, pierden el derecho a reclamar contra el resultado de la verificacion establecido por el servicio aduanero.

8 Verificacion de mercaderia (si canal rojo/naranja)
El verificador aduanero controla fisicamente la mercaderia contra lo declarado. Si la mercaderia es extremadamente delicada, fragil o peligrosa, el Servicio Aduanero puede exigir que el interesado ponga a disposicion personal especializado. El Servicio Aduanero puede exigir informacion complementaria sobre caracteristicas tecnicas, dando un plazo no inferior a 2 dias, bajo apercibimiento de declarar la caducidad de la solicitud.

9 Pre-cumplido, cumplido de embarque y transito
Realizada la presentacion y verificacion, se carga el Pre-cumplido (constancia de unidades, consolidacion y precintado, previa al embarque o inicio del transito). Si hay transito de exportacion, el ATA presenta el MIC/DTA. La Aduana de Registro verifica y coloca precintos numerados. La Aduana de Salida verifica la inviolabilidad de los precintos antes de autorizar el paso al exterior.

10 Libramiento
Es el acto administrativo por el cual el Servicio Aduanero autoriza la salida de la mercaderia con destino al exterior.

11 Embarque y cumplido definitivo
La mercaderia es cargada a bordo del medio de transporte. El ATA presenta la Relacion de Carga (Formulario OM-1967) ante la Aduana. Plazos:
- Buques: dentro de los 15 dias del zarpado.
- Camiones: de inmediato una vez precintado el vehiculo.
- Ferrocarriles: dentro de los 2 dias de la salida de la Aduana.
- Aeronaves: de inmediato una vez efectuado el despegue.

12 Pago de los Derechos de Exportacion
Los derechos de exportacion se pagan sobre el Valor FOB de la mercaderia, deducidos los insumos importados temporalmente. Segun los Decretos 583/02 y 835/02:
- Para exportadores que exporten hasta u$s 20.000.000 anuales: plazo de espera de 120 dias desde el libramiento o la fecha de ingreso de divisas (el menor de ambos), o 15 dias si las divisas se liquidaron anticipadamente.
- Para exportadores que exporten mas de u$s 20.000.000 anuales: 15 dias del libramiento.
Si se paga fuera de plazo, se abonan intereses moratorios.

13 Cobro de Reintegros a la Exportacion
El Sistema Malvina verifica automaticamente: habilitacion en el Registro, CBU habilitada, Cumplido de Embarque 'conforme' o Declaracion Post-Embarque presentada, Derechos de Exportacion abonados, y que no haya inhabilitaciones tributarias o previsionales. Cumplidos estos requisitos, el area Contable de la Aduana transfiere los fondos en la cuenta bancaria designada por el exportador.


2. TIEMPOS REALES DE CADA ETAPA
2.1 Plazos legales formales

- Validez del Permiso de Embarque (exportacion acuatica/aerea): 31 dias corridos desde el registro (Decreto 1001/82)
- Validez del Permiso de Embarque (transito terrestre): 45 dias corridos desde el registro (Decreto 1001/82)
- Deposito provisorio de exportacion (max sin destinacion): 1 mes; prorroga por unica vez por plazo igual (Art. 398 CA)
- Pago de derechos: exportadores hasta u$s 20M/anio: 120 dias desde libramiento (Decretos 583/02 y 835/02)
- Pago de derechos: exportadores mas de u$s 20M/anio: 15 dias del libramiento
- Informacion complementaria tecnica exigible por Aduana: no inferior a 2 dias habiles
- Exportacion temporaria - mercaderia con transformacion: 2 anios (ampliable)
- Exportacion temporaria - bienes de capital: 3 anios
- Exportacion temporaria - otras categorias (ferias, muestras): 1 anio
- Exportacion en consignacion (plazo en exterior): 360 dias desde oficializacion; 60 dias adicionales para reingreso (Decreto 975/98)
- Solicitud de prorroga deposito provisorio: con 5 dias de anticipacion al vencimiento


3. COSTOS ASOCIADOS A CADA ETAPA

3.1 Dato global de referencia (Banco Mundial - Doing Business)
El costo de exportar un contenedor desde Argentina es de u$s 1.910 dolares. Esto incluye tramites y documentacion, transporte interno y costo de frontera o puerto. Argentina es cara para exportar. (Para referencia: Australia u$s 1.538 - Nueva Zelanda u$s 694).

3.2 Costo fijo del registro en el SIM
Cada registro en el SIM tiene un costo de u$s 10,00 que debe ser pagado por el operador junto con los impuestos correspondientes al despacho.

3.3 Componentes del valor imponible
El valor imponible para derechos de exportacion incluye todos los gastos hasta el punto de salida:
- Gastos de transporte y seguro hasta el puerto/aeropuerto
- Comisiones y corretajes
- Gastos para la obtencion de documentos relacionados con la exportacion
- Tributos exigibles dentro del territorio aduanero (con exclusion de los eximidos/reembolsados)
- Costo de los embalajes
- Gastos de embalaje (mano de obra, materiales)
- Gastos de carga (excluidos los de estiba en la medida en que no estuvieren incluidos)

3.4 Derechos de Exportacion (Retenciones)
El Derecho de Exportacion (retenciones) grava la exportacion para consumo (art. 724 del CA). Es ad valorem: se calcula aplicando un porcentual sobre el valor imponible FOB. El momento imponible es la fecha de registro de la destinacion. Para mercaderias con Precio Oficial (principalmente agropecuarias), ese PO es la unica base de tributacion.

3.5 Reintegros y estimulos a la exportacion
Los reintegros son devoluciones al exportador de tributos internos contenidos en la mercaderia exportada. Los porcentajes son variables por posicion arancelaria NCM. La base de calculo es el valor FOB. Los reintegros son incompatibles con la exportacion de mercaderias con insumos importados temporalmente en su porcion proporcional.

FUENTE INSUFICIENTE PARA: Honorarios del Despachante (consultar www.cda.org.ar), costos portuarios, certificados SENASA/ANMAT actualizados, almacenamiento en deposito fiscal, seguro internacional de carga.


4. DIFERENCIA ENTRE EXPORTACION MARITIMA, AEREA Y TERRESTRE

4.1 Documentos de transporte segun via
- Maritima o Fluvial: Conocimiento de Embarque (Bill of Lading - B/L) — titulo de credito transmisible por endoso.
- Aerea: Guia Aerea (Air Waybill - AWB) — mismo valor probatorio que el B/L.
- Terrestre (camion): Conocimiento Rodaviario (CRT) + MIC/DTA — el ATIT exige el MIC/DTA ante la Aduana de Partida.
- Ferroviario: Carta de Porte.

4.2 Diferencias en desistimiento y rectificacion
- Via acuatica o aerea: NO se puede desistir una vez que el medio de transporte hubiere partido con destino inmediato al exterior. Se puede rectificar hasta la carga definitiva a bordo.
- Via terrestre: NO se puede desistir una vez que el ultimo control de la aduana de frontera hubiere autorizado la salida. Se puede rectificar hasta ese ultimo control.

4.3 Plazos Relacion de Carga (Formulario OM-1967)
- Buques: dentro de los 15 dias del zarpado.
- Camiones: de inmediato, una vez precintado el vehiculo.
- Ferrocarriles: dentro de los 2 dias de la salida de la Aduana.
- Aeronaves: de inmediato, una vez efectuado el despegue.


6. DOCUMENTOS NECESARIOS EN CADA ETAPA Y QUIEN LOS GENERA

- Factura Pro-forma: exportador (si el comprador la requiere).
- Carta Poder al Despachante: exportador (en papel membretado).
- Factura Comercial tipo 'E': exportador (con CAI de AFIP). Requisito para cobrar reintegros. En ingles, montos en USD.
- Packing List: exportador.
- Certificado Sanitario o Fitosanitario: profesional del organismo oficial (SENASA o INAL/ANMAT segun producto).
- Certificado de Origen: organismo autorizado segun el acuerdo comercial.
- Permiso de Embarque (OM-1993-A SIM): despachante de aduana via SIM. Documento principal.
- Sobre Contenedor (OM-2133 SIM): despachante.
- Declaracion de los Elementos Relativos al Valor (OM-1993/2 SIM): despachante.
- Documento de Transporte (B/L, AWB, CRT o Carta de Porte): empresa transportista / ATA.
- Relacion de Carga (OM-1967): ATA.
- MIC/DTA: ATA / empresa transportista (solo transporte terrestre internacional).
- Declaracion Post-Embarque: exportador o su representante (cuando se embarco menor cantidad que la declarada, Art. 346 CA).

Juego completo de la Destinacion de Exportacion:
- Sobre Contenedor OM-2133 SIM (Color Verde)
- Permiso de Embarque (Form. OM-1993-A SIM)
- Declaracion de los Elementos Relativos al Valor (Formulario OM-1993/2 SIM)
- Intervenciones de otros organismos (si correspondiere)
- Lista de empaque
- Detalle de las Importaciones Temporales a cancelar (si correspondiere)


7. FLUJO DE LA OPERACION EN EL SIM (SISTEMA INFORMATICO MALVINA)

El SIM es un sistema de doble registracion: documental (sustento juridico) e informatica (todos los pasos registrados).

Usuarios del SIM: Agente de Transporte Aduanero (ATA), Agente Desconsolidador, Depositario, Despachante de Aduana, Servicio Aduanero.

7.1 Flujo completo de exportacion en el SIM

SIM-1: ATA registra el Manifiesto de Carga (Declaracion Sumaria). Estados: En curso -> Registrado -> Presentado.
SIM-2: Despachante ingresa la Declaracion Detallada y oficializa. El sistema genera el Permiso de Embarque (OM-1993-A SIM). Al oficializar: otorga numero de despacho definitivo, afecta fondos de subcuenta Malvina (o registra garantia), cancela el documento de transporte.
SIM-3: Depositario registra el ingreso de bultos (cantidad y estado). Este paso es PREVIO a la Presentacion de la Declaracion Detallada.
SIM-4: Servicio Aduanero efectua la Presentacion. Sistema Malvina asigna canal automaticamente:
  - CANAL VERDE: Estado cambia a 'Autorizacion a Retiro'. Libramiento inmediato.
  - CANAL NARANJA: Estado cambia a 'Presentado'. Requiere control documental.
  - CANAL ROJO: Estado cambia a 'Presentado'. Requiere control documental + verificacion fisica.
SIM-5: Verificador ingresa el 'Resultado de la Verificacion' (canal rojo/naranja).
SIM-6: Carga del Pre-cumplido (constancias de unidades, consolidacion/precintado). Estado pasa a 'Pre-cumplido'.
SIM-7: Egreso de Transito de Exportacion (si aplica). Depositario registra en SIM.
SIM-8: Validacion por el ATA o Despachante ('Control salida de transitos de Exportacion').
SIM-9: LIBRAMIENTO. Estado: 'Liberado'. El Servicio Aduanero autoriza la salida al exterior.
SIM-10: Verificacion automatica y acreditacion de Reintegros. El sistema transfiere fondos a la cuenta bancaria del exportador.

7.2 Estados de una destinacion de exportacion en el SIM
- OFICIALIZADO: el despachante registro la destinacion. Fondos afectados o garantia registrada.
- AUTORIZACION A RETIRO: Canal Verde asignado. Libramiento inmediato.
- PRESENTADO: Canal Rojo o Naranja asignado. El verificador debe ingresar resultado.
- PRE-CUMPLIDO: Se cargaron las constancias previas al embarque.
- LIBERADO / LIBRAMIENTO: Autorizacion definitiva para la salida.
- CUMPLIDO: Se consignaron las cantidades efectivamente embarcadas.

7.3 Costo del registro en el SIM
Cada registro en el SIM: u$s 10,00 por operacion.

7.4 Principales aduanas argentinas con codigo SIM
Buenos Aires (29), Rosario (52), Cordoba (17), Ezeiza (73), San Lorenzo (57),
Posadas (46), Gualeguaychu (26), Paso de los Libres (45), Mendoza (38), Salta (53),
Bahia Blanca (03), Mar del Plata (37), Iguazu (29), Rio Gallegos (48), Ushuaia (87).


Documento generado en base exclusiva al Manual de Aduanas - Juarez et al. (2018) | trade.ai
`
