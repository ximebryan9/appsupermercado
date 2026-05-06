import express from 'express';
import cors from 'cors';
import multer from 'multer';
import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import morgan from 'morgan';

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'https://*.vercel.app'],
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERROR: Faltan variables de entorno');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ==============================================
// FUNCIÓN CORREGIDA PARA LIMPIAR PRECIOS
// RECHAZA PRECIOS CON COMAS O PUNTOS
// ==============================================
function cleanPrice(price) {
  if (!price) return null;
  
  let priceStr = String(price).trim();
  
  // Si ya es un número, verificar que sea entero
  if (typeof price === 'number' && !isNaN(price)) {
    return Math.round(price);
  }
  
  // 🔴 RECHAZAR si contiene comas o puntos (formato incorrecto)
  if (priceStr.includes(',') || priceStr.includes('.')) {
    console.log(`❌ Precio RECHAZADO por contener coma o punto: "${priceStr}"`);
    return null;
  }
  
  // Eliminar cualquier carácter no numérico
  priceStr = priceStr.replace(/[^0-9]/g, '');
  
  if (priceStr === '') {
    console.log(`❌ Precio RECHAZADO: vacío`);
    return null;
  }
  
  const result = parseInt(priceStr, 10);
  
  if (isNaN(result) || result <= 0) {
    console.log(`❌ Precio RECHAZADO: ${priceStr} no es válido`);
    return null;
  }
  
  console.log(`✅ Precio ACEPTADO: ${result}`);
  return result;
}

// Función para limpiar unidades
function cleanUnit(unit) {
  if (!unit) return 'unidad';
  let unitStr = String(unit).trim().toLowerCase();

  const unitMap = {
    'kg': 'kg', 'kilo': 'kg', 'kkl': 'kg', 'kl': 'kg',
    'gramo': 'g', 'gramos': 'g', 'g': 'g',
    'lb': 'lb', 'libra': 'lb',
    'litro': 'litro', 'l': 'litro',
    'unidad': 'unidad', 'unidades': 'unidad',
    'ban': 'bandeja', 'bandeja': 'bandeja',
    'pan': 'panal', 'panal': 'panal', 'panel': 'panal',
    'carton': 'cartón', 'cartón': 'cartón',
    'bolsa': 'bolsa', 'funda': 'funda'
  };

  const match = unitStr.match(/(kg|kilo|kl?|g|lb|litro|l|unidad|ban|bandeja|pan|panal|panel|carton|bolsa|funda)/i);
  if (match) {
    const key = match[1].toLowerCase();
    return unitMap[key] || key;
  }

  return unitStr;
}

// Ruta de salud
app.get('/api/health', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('count', { count: 'exact', head: true });

    if (error) throw error;

    res.json({
      status: 'OK',
      database: 'Supabase conectado',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      error: error.message
    });
  }
});

// Subir Excel con soporte para equivalencias de empaques
app.post('/api/upload-excel', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    let { monthDate } = req.body;

    // Convertir "2026-05" a "2026-05-01"
    if (monthDate && monthDate.length === 7 && /^\d{4}-\d{2}$/.test(monthDate)) {
      monthDate = `${monthDate}-01`;
      console.log(`📅 Fecha convertida: ${monthDate}`);
    }

    if (!file || !monthDate) {
      return res.status(400).json({ error: 'Faltan archivo o fecha' });
    }

    console.log(`📥 Procesando: ${file.originalname} para ${monthDate}`);

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📊 Filas encontradas: ${data.length}`);

    if (data.length === 0) {
      return res.status(400).json({ error: 'El archivo Excel está vacío' });
    }

    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    const successItems = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      const productName = row['Producto'] || row['producto'];
      const quantity = row['Cantidad'] || row['cantidad'];
      const unit = row['Unidad'] || row['unidad'];
      const price = row['Precio'] || row['precio'];

      // Leer equivalencias (opcionales)
      const equivQty = row['Equivalencia_Cantidad'] || row['equiv_cantidad'] || row['Equivalencia'] || null;
      const equivUnit = row['Equivalencia_Unidad'] || row['equiv_unidad'] || null;

      if (!productName) {
        errorCount++;
        errors.push(`Fila ${i + 2}: No se encontró nombre del producto`);
        continue;
      }

      if (!price) {
        errorCount++;
        errors.push(`Fila ${i + 2}: No se encontró precio para "${productName}"`);
        continue;
      }

      // Limpiar precio usando la función mejorada
      const cleanPriceValue = cleanPrice(price);
      
      if (cleanPriceValue === null || cleanPriceValue <= 0) {
        errorCount++;
        errors.push(`Fila ${i + 2}: Precio inválido para "${productName}". NO uses comas ni puntos. Ejemplo correcto: 5483 para $5,483`);
        console.log(`❌ ERROR: Precio inválido para "${productName}"`);
        continue;
      }

      // Limpiar cantidad
      let quantityNum;
      if (typeof quantity === 'number') {
        quantityNum = quantity;
      } else {
        quantityNum = parseFloat(String(quantity).replace(',', '.').replace(/[^0-9.-]/g, ''));
      }

      if (isNaN(quantityNum) || quantityNum <= 0) {
        quantityNum = 1;
      }

      // Limpiar unidad
      let cleanUnitValue = unit ? String(unit).trim().toLowerCase() : 'unidad';
      cleanUnitValue = cleanUnit(cleanUnitValue);

      // Determinar si es empaque o unidad básica
      const basicUnits = ['kg', 'g', 'lb', 'litro', 'ml', 'unidad'];
      const isPackage = !basicUnits.includes(cleanUnitValue);

      // Procesar equivalencias
      let equivalentQty = null;
      let equivalentUnit = null;
      let pricePerUnit = null;

      if (isPackage && (equivQty || equivUnit)) {
        // Empaque con equivalencia
        equivalentQty = equivQty ? parseFloat(equivQty) : quantityNum;
        equivalentUnit = equivUnit ? cleanUnit(equivUnit) : cleanUnitValue;
        const totalBaseUnits = quantityNum * equivalentQty;
        pricePerUnit = cleanPriceValue / totalBaseUnits;
        console.log(`📦 Empaque: ${quantityNum} ${cleanUnitValue} = ${totalBaseUnits} ${equivalentUnit}, precio por ${equivalentUnit}: $${pricePerUnit.toFixed(2)}`);
      } else if (!isPackage) {
        // Unidad básica
        pricePerUnit = cleanPriceValue / quantityNum;
      } else {
        // Empaque sin equivalencia
        pricePerUnit = null;
        console.log(`⚠️ Empaque sin equivalencia: ${productName.trim()}`);
      }

      // Redondear pricePerUnit a 2 decimales
      if (pricePerUnit !== null) {
        pricePerUnit = Math.round(pricePerUnit * 100) / 100;
      }

      try {
        // Buscar producto
        let { data: existingProduct } = await supabase
          .from('products')
          .select('id')
          .ilike('name', productName.trim())
          .maybeSingle();

        let productId;

        if (!existingProduct) {
          const { data: newProduct, error: insertError } = await supabase
            .from('products')
            .insert({
              name: productName.trim(),
              default_quantity: quantityNum,
              default_unit: cleanUnitValue,
              unit_type: isPackage ? 'package' : 'basic'
            })
            .select()
            .single();

          if (insertError) throw insertError;
          productId = newProduct.id;
          console.log(`✅ Nuevo producto: ${productName.trim()}`);
        } else {
          productId = existingProduct.id;
          console.log(`✅ Producto existente: ${productName.trim()}`);
        }

        // Verificar si ya existe un registro para este producto y mes
        const { data: existingPrice } = await supabase
          .from('price_history')
          .select('id')
          .eq('product_id', productId)
          .eq('month_date', monthDate)
          .maybeSingle();

        let priceError;

        if (existingPrice) {
          // Actualizar precio existente
          const { error } = await supabase
            .from('price_history')
            .update({
              price: cleanPriceValue,
              quantity: quantityNum,
              unit: cleanUnitValue,
              price_per_unit: pricePerUnit,
              is_package: isPackage,
              equivalent_quantity: equivalentQty,
              equivalent_unit: equivalentUnit
            })
            .eq('id', existingPrice.id);
          priceError = error;
          console.log(`🔄 Actualizado: ${productName.trim()} para ${monthDate}`);
        } else {
          // Insertar nuevo precio
          const { error } = await supabase
            .from('price_history')
            .insert({
              product_id: productId,
              price: cleanPriceValue,
              quantity: quantityNum,
              unit: cleanUnitValue,
              price_per_unit: pricePerUnit,
              month_date: monthDate,
              is_package: isPackage,
              equivalent_quantity: equivalentQty,
              equivalent_unit: equivalentUnit
            });
          priceError = error;
          console.log(`✨ Insertado: ${productName.trim()} para ${monthDate}`);
        }

        if (priceError) throw priceError;

        successCount++;
        successItems.push(productName.trim());

      } catch (error) {
        errorCount++;
        errors.push(`Fila ${i + 2} (${productName}): ${error.message}`);
        console.error(`❌ Error:`, error.message);
      }
    }

    console.log(`\n📊 ========== RESUMEN FINAL ==========`);
    console.log(`✅ Exitosos: ${successCount}`);
    console.log(`❌ Errores: ${errorCount}`);

    res.json({
      success: successCount > 0,
      message: 'Archivo procesado',
      nuevos: successCount,
      errores: errorCount,
      erroresDetalle: errors.slice(0, 10),
      productosProcesados: successItems
    });

  } catch (error) {
    console.error('❌ Error general:', error);
    res.status(500).json({ error: error.message });
  }
});

// Buscar productos (con soporte para equivalencias)
app.get('/api/search', async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) return res.json([]);

    const { data: products } = await supabase
      .from('products')
      .select('*')
      .ilike('name', `%${query}%`)
      .limit(20);

    if (!products || products.length === 0) {
      return res.json([]);
    }

    const productIds = products.map(p => p.id);

    const { data: prices } = await supabase
      .from('price_history')
      .select('*')
      .in('product_id', productIds)
      .order('month_date', { ascending: false });

    const results = products.map(product => {
      const productPrices = prices.filter(p => p.product_id === product.id);

      return {
        id: product.id,
        name: product.name,
        defaultQuantity: product.default_quantity,
        defaultUnit: product.default_unit,
        unitType: product.unit_type,
        priceHistory: productPrices.map(p => {
          let displayText = `${p.quantity} ${p.unit} por $${p.price}`;
          let priceDisplay = '';
          let equivalentInfo = null;

          if (p.is_package && p.equivalent_quantity && p.equivalent_unit) {
            equivalentInfo = {
              quantity: p.equivalent_quantity,
              unit: p.equivalent_unit,
              totalEquivalent: p.quantity * p.equivalent_quantity
            };
            priceDisplay = p.price_per_unit ? `$${p.price_per_unit.toFixed(2)}/${p.equivalent_unit}` : `$${p.price}/${p.unit}`;
            displayText = `${p.quantity} ${p.unit} (equivale a ${p.quantity * p.equivalent_quantity} ${p.equivalent_unit}) por $${p.price}`;
          } else if (!p.is_package) {
            priceDisplay = p.price_per_unit ? `$${p.price_per_unit.toFixed(2)}/${p.unit}` : `$${p.price}/${p.unit}`;
          } else {
            priceDisplay = `$${p.price}/${p.unit}`;
          }

          return {
            date: p.month_date,
            price: p.price,
            quantity: p.quantity,
            unit: p.unit,
            pricePerUnit: p.price_per_unit,
            isPackage: p.is_package,
            equivalentQuantity: p.equivalent_quantity,
            equivalentUnit: p.equivalent_unit,
            displayText: displayText,
            priceDisplay: priceDisplay,
            equivalentInfo: equivalentInfo
          };
        })
      };
    });

    res.json(results);

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta para descargar plantilla Excel
app.get('/api/download-template', (req, res) => {
  try {
    const templateData = [
      { 'Producto': 'Ejemplo: Leche Entera', 'Cantidad': 1, 'Unidad': 'litro', 'Precio': 2500, 'Equivalencia_Cantidad': '', 'Equivalencia_Unidad': '' },
      { 'Producto': 'Ejemplo: Pollo', 'Cantidad': 2, 'Unidad': 'kg', 'Precio': 16000, 'Equivalencia_Cantidad': '', 'Equivalencia_Unidad': '' },
      { 'Producto': 'Ejemplo: Huevos', 'Cantidad': 30, 'Unidad': 'unidades', 'Precio': 12000, 'Equivalencia_Cantidad': '', 'Equivalencia_Unidad': '' },
      { 'Producto': 'Ejemplo: Panal de Huevos', 'Cantidad': 1, 'Unidad': 'panal', 'Precio': 12000, 'Equivalencia_Cantidad': 30, 'Equivalencia_Unidad': 'unidades' },
      { 'Producto': 'Ejemplo: Ciruelas (bandeja)', 'Cantidad': 1, 'Unidad': 'bandeja', 'Precio': 5000, 'Equivalencia_Cantidad': 500, 'Equivalencia_Unidad': 'gramos' }
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    worksheet['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 18 }, { wch: 18 }];

    const instructionsData = [
      { 'Instrucciones': '📋 GUÍA RÁPIDA PARA LLENAR LA PLANTILLA' },
      { 'Instrucciones': '' },
      { 'Instrucciones': '1️⃣ COLUMNA PRODUCTO:' },
      { 'Instrucciones': '   - Escribe el nombre exacto del producto' },
      { 'Instrucciones': '   - Ejemplo: "Leche Entera", "Pollo", "Manzanas"' },
      { 'Instrucciones': '' },
      { 'Instrucciones': '2️⃣ COLUMNA CANTIDAD:' },
      { 'Instrucciones': '   - Usa números (ej: 1, 2.5, 0.75)' },
      { 'Instrucciones': '   - Para empaques usa 1' },
      { 'Instrucciones': '   - Usa punto para decimales: 1.5 (no 1,5)' },
      { 'Instrucciones': '' },
      { 'Instrucciones': '3️⃣ COLUMNA UNIDAD (usar minúsculas):' },
      { 'Instrucciones': '   ✅ UNIDADES VÁLIDAS:' },
      { 'Instrucciones': '   • kg (kilogramos)' },
      { 'Instrucciones': '   • g (gramos)' },
      { 'Instrucciones': '   • lb (libras)' },
      { 'Instrucciones': '   • litro' },
      { 'Instrucciones': '   • unidad' },
      { 'Instrucciones': '   • bandeja' },
      { 'Instrucciones': '   • panal' },
      { 'Instrucciones': '   • caja' },
      { 'Instrucciones': '   • bolsa' },
      { 'Instrucciones': '' },
      { 'Instrucciones': '4️⃣ COLUMNA PRECIO ⚠️ IMPORTANTE ⚠️:' },
      { 'Instrucciones': '   🔴 NO uses puntos, NO uses comas' },
      { 'Instrucciones': '   ✅ Ejemplo CORRECTO: 5483 (para cinco mil cuatrocientos ochenta y tres)' },
      { 'Instrucciones': '   ❌ Ejemplo INCORRECTO: 5,483 o 5.483' },
      { 'Instrucciones': '   ✅ Ejemplo CORRECTO: 27980 (para veintisiete mil novecientos ochenta)' },
      { 'Instrucciones': '   ❌ Ejemplo INCORRECTO: 27,980 o 27.980' },
      { 'Instrucciones': '   ✅ Ejemplo CORRECTO: 1250 (para mil doscientos cincuenta)' },
      { 'Instrucciones': '   ❌ Ejemplo INCORRECTO: 1.250 o 1,250' },
      { 'Instrucciones': '' },
      { 'Instrucciones': '📌 EJEMPLOS PRÁCTICOS:' },
      { 'Instrucciones': '   • Si pagaste $5,483 → Escribe: 5483' },
      { 'Instrucciones': '   • Si pagaste $27,980 → Escribe: 27980' },
      { 'Instrucciones': '   • Si pagaste $1,200 → Escribe: 1200' },
      { 'Instrucciones': '' },
      { 'Instrucciones': '5️⃣ COLUMNAS DE EQUIVALENCIA (opcional, solo para empaques):' },
      { 'Instrucciones': '   • Equivalencia_Cantidad: ¿Cuántas unidades base tiene el empaque?' },
      { 'Instrucciones': '   • Equivalencia_Unidad: ¿Cuál es la unidad base? (ej: unidades, gramos, kg)' },
      { 'Instrucciones': '   • Ejemplo: 1 panal = 30 unidades → Cantidad:30, Unidad:unidades' },
      { 'Instrucciones': '' },
      { 'Instrucciones': '💡 CONSEJOS IMPORTANTES:' },
      { 'Instrucciones': '🔥 LOS PRECIOS DEBEN SER SÓLO NÚMEROS, SIN PUNTOS NI COMAS 🔥' },
      { 'Instrucciones': '• Borra las filas de ejemplo antes de subir tu archivo' },
      { 'Instrucciones': '• Revisa que los precios no tengan comas ni puntos' },
      { 'Instrucciones': '• Si ves un error, verifica el formato de los precios' }
    ];

    const instructionsSheet = XLSX.utils.json_to_sheet(instructionsData);
    instructionsSheet['!cols'] = [{ wch: 80 }];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla');
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instrucciones');

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=plantilla_precios_supermercado.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(excelBuffer);

  } catch (error) {
    console.error('Error generando plantilla:', error);
    res.status(500).json({ error: 'Error generando plantilla' });
  }
});

// Comparar precios (con soporte para equivalencias)
app.get('/api/compare/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { month1, month2 } = req.query;

    const { data: product } = await supabase
      .from('products')
      .select('name, default_quantity, default_unit, unit_type')
      .eq('id', productId)
      .single();

    const { data: prices } = await supabase
      .from('price_history')
      .select('*')
      .eq('product_id', productId)
      .in('month_date', [month1, month2]);

    const price1 = prices.find(p => p.month_date === month1);
    const price2 = prices.find(p => p.month_date === month2);

    const getBasePrice = (priceData) => {
      if (!priceData) return null;
      if (priceData.is_package && priceData.equivalent_quantity && priceData.equivalent_unit) {
        const totalBaseUnits = priceData.quantity * priceData.equivalent_quantity;
        return priceData.price / totalBaseUnits;
      } else if (!priceData.is_package) {
        return priceData.price_per_unit;
      }
      return null;
    };

    const getBaseUnit = (priceData) => {
      if (!priceData) return 'unidad';
      if (priceData.is_package && priceData.equivalent_unit) {
        return priceData.equivalent_unit;
      }
      return priceData.unit || 'unidad';
    };

    const getDisplayText = (priceData) => {
      if (!priceData) return 'No disponible';
      if (priceData.is_package && priceData.equivalent_quantity && priceData.equivalent_unit) {
        const totalBaseUnits = priceData.quantity * priceData.equivalent_quantity;
        return `${priceData.quantity} ${priceData.unit} (equivale a ${totalBaseUnits} ${priceData.equivalent_unit}) por $${priceData.price}`;
      }
      return `${priceData.quantity} ${priceData.unit} por $${priceData.price}`;
    };

    const basePrice1 = getBasePrice(price1);
    const basePrice2 = getBasePrice(price2);
    const baseUnit = getBaseUnit(price1) || getBaseUnit(price2) || 'unidad';

    const difference = (basePrice1 && basePrice2) ? (basePrice2 - basePrice1) : null;
    const percentageChange = (basePrice1 && basePrice2) ? ((basePrice2 - basePrice1) / basePrice1 * 100) : null;

    res.json({
      productName: product.name,
      productType: product.unit_type,
      month1: {
        date: month1,
        price: price1?.price || null,
        quantity: price1?.quantity || null,
        unit: price1?.unit || null,
        isPackage: price1?.is_package || false,
        equivalentQuantity: price1?.equivalent_quantity || null,
        equivalentUnit: price1?.equivalent_unit || null,
        basePrice: basePrice1,
        baseUnit: baseUnit,
        displayText: getDisplayText(price1)
      },
      month2: {
        date: month2,
        price: price2?.price || null,
        quantity: price2?.quantity || null,
        unit: price2?.unit || null,
        isPackage: price2?.is_package || false,
        equivalentQuantity: price2?.equivalent_quantity || null,
        equivalentUnit: price2?.equivalent_unit || null,
        basePrice: basePrice2,
        baseUnit: baseUnit,
        displayText: getDisplayText(price2)
      },
      difference: difference,
      percentageChange: percentageChange,
      baseUnit: baseUnit,
      priceIncreased: difference > 0,
      priceDecreased: difference < 0
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener meses disponibles
app.get('/api/months', async (req, res) => {
  try {
    const { data } = await supabase
      .from('price_history')
      .select('month_date')
      .order('month_date', { ascending: false });

    const months = [...new Set(data.map(m => m.month_date))];
    res.json(months);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Estadísticas
app.get('/api/stats', async (req, res) => {
  try {
    const { count: productCount } = await supabase
      .from('products')
      .select('count', { count: 'exact', head: true });

    const { count: priceCount } = await supabase
      .from('price_history')
      .select('count', { count: 'exact', head: true });

    const { data: months } = await supabase
      .from('price_history')
      .select('month_date');

    const uniqueMonths = [...new Set(months?.map(m => m.month_date) || [])];

    const { data: units } = await supabase
      .from('price_history')
      .select('unit')
      .not('unit', 'is', null);

    const uniqueUnits = [...new Set(units?.map(u => u.unit) || [])];

    res.json({
      totalProducts: productCount || 0,
      totalPriceRecords: priceCount || 0,
      totalMonths: uniqueMonths.length,
      months: uniqueMonths.sort().reverse(),
      units: uniqueUnits
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==============================================
// RUTAS DE LIMPIEZA (VERSIÓN SIMPLIFICADA)
// ==============================================

// Ruta para limpiar todos los datos
app.delete('/api/clear-all-data', async (req, res) => {
  try {
    const { password } = req.body;
    const ADMIN_PASSWORD = 'admin123';

    if (!password || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    console.log('⚠️ Iniciando limpieza total de datos...');

    await supabase.from('price_history').delete().neq('id', 0);
    await supabase.from('products').delete().neq('id', 0);

    console.log('✅ Todos los datos han sido eliminados correctamente');

    res.json({ success: true, message: 'Todos los datos han sido eliminados' });
  } catch (error) {
    console.error('❌ Error limpiando datos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta para limpiar datos de un mes específico
app.delete('/api/clear-month-data', async (req, res) => {
  try {
    const { monthDate, password } = req.body;
    const ADMIN_PASSWORD = 'admin123';

    if (!password || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    if (!monthDate) {
      return res.status(400).json({ error: 'Debes especificar el mes a limpiar' });
    }

    console.log(`⚠️ Eliminando datos del mes: ${monthDate}`);

    await supabase.from('price_history').delete().eq('month_date', monthDate);

    console.log(`✅ Datos del mes ${monthDate} eliminados correctamente`);

    res.json({ success: true, message: `Datos del mes ${monthDate} eliminados` });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==============================================
// INICIAR SERVIDOR
// ==============================================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Servidor backend corriendo en http://localhost:${PORT}`);
  console.log(`📋 Endpoints disponibles:`);
  console.log(`   GET    /api/health`);
  console.log(`   POST   /api/upload-excel`);
  console.log(`   GET    /api/search?query=...`);
  console.log(`   GET    /api/compare/:id?month1=&month2=`);
  console.log(`   GET    /api/months`);
  console.log(`   GET    /api/stats`);
  console.log(`   DELETE /api/clear-all-data`);
  console.log(`   DELETE /api/clear-month-data`);
  console.log(`\n💾 Base de datos: Supabase PostgreSQL`);
  console.log(`📦 Enfoque Híbrido: Unidades básicas + Empaques especiales`);
  console.log(`🔄 Soporte para equivalencias (ej: 1 panal = 30 unidades)`);
  console.log(`🗑️ Contraseña de limpieza: admin123`);
  console.log(`🔴 Validación: Precios con comas o puntos son RECHAZADOS\n`);
});