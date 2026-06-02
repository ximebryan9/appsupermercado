import React, { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('upload')
  const [customSupermarket, setCustomSupermarket] = useState('');
  const [supermarket, setSupermarket] = useState('No especificado');
  const [file, setFile] = useState(null)
  const [monthDate, setMonthDate] = useState('')
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [months, setMonths] = useState([])
  const [month1, setMonth1] = useState('')
  const [month2, setMonth2] = useState('')
  const [comparison, setComparison] = useState(null)
  const [stats, setStats] = useState(null)
  const [backendStatus, setBackendStatus] = useState('checking')
  const [showAddSupermarket, setShowAddSupermarket] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [previewErrors, setPreviewErrors] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [editableData, setEditableData] = useState([]);
  const [tempMonthDate, setTempMonthDate] = useState('');
  const [tempSupermarket, setTempSupermarket] = useState('');

  // supermercados
  const [supermarketsList, setSupermarketsList] = useState([]);
  const [isAddingSupermarket, setIsAddingSupermarket] = useState(false);
  const [newSupermarket, setNewSupermarket] = useState('');

  // Estados para limpiar datos
  const [showClearModal, setShowClearModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [clearPassword, setClearPassword] = useState('')
  const [clearMonth, setClearMonth] = useState('')
  const [clearType, setClearType] = useState('all')
  const [clearing, setClearing] = useState(false)

  // Estados para la nueva sección de productos
  const [allProducts, setAllProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('todos');
  const [selectedLetter, setSelectedLetter] = useState('todos');
  const [showProductDetail, setShowProductDetail] = useState(false);

  useEffect(() => {
    checkBackend()
    fetchMonths()
    fetchStats()
    fetchSupermarkets()
  }, [])

  useEffect(() => {
    if (activeTab === 'search') {
      fetchAllProducts(selectedMonth, selectedLetter);
    }
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'search') {
      fetchAllProducts(selectedMonth, selectedLetter);
    }
  }, [selectedMonth, selectedLetter])

  const checkBackend = async () => {
    try {
      const response = await axios.get('/api/health')
      if (response.data.status === 'OK') {
        setBackendStatus('connected')
      }
    } catch (error) {
      console.error('Backend not connected:', error)
      setBackendStatus('disconnected')
    }
  }

const fetchSupermarkets = async () => {
  try {
    const response = await axios.get('/api/supermarkets');
    console.log('Supermercados cargados:', response.data); // Para depurar
    setSupermarketsList(response.data);
  } catch (error) {
    console.error('Error fetching supermarkets:', error);
    // Si hay error, usar lista por defecto
    setSupermarketsList(['Éxito', 'Carulla', 'Jumbo', 'D1', 'Ara', 'Mercacentro', 'Surtimax', 'Olímpica', 'Metro', 'PriceSmart']);
  }
};

  const addNewSupermarket = async () => {
    if (!newSupermarket.trim()) {
      alert('❌ Por favor escribe el nombre del supermercado');
      return;
    }
    
    setIsAddingSupermarket(true);
    try {
      const response = await axios.post('/api/supermarkets', { name: newSupermarket.trim() });
      if (response.data.success) {
        setSupermarketsList([...supermarketsList, newSupermarket.trim()]);
        setSupermarket(newSupermarket.trim());
        setNewSupermarket('');
        setIsAddingSupermarket(false);
        setShowAddSupermarket(false);
        alert(`✅ Supermercado "${newSupermarket}" agregado correctamente`);
      }
    } catch (error) {
      alert('❌ Error al agregar el supermercado: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsAddingSupermarket(false);
    }
  };

  const fetchMonths = async () => {
    try {
      const response = await axios.get('/api/months')
      setMonths(response.data)
    } catch (error) {
      console.error('Error fetching months:', error)
    }
  }

  const fetchAllProducts = async (month = 'todos', letter = 'todos') => {
    setProductsLoading(true);
    try {
      const response = await axios.get(`/api/products/recent?month=${month}&letter=${letter}`);
      setAllProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
      alert('Error al cargar los productos');
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/stats')
      setStats(response.data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    
    console.log('Supermarket seleccionado:', supermarket); 

    if (!file || !monthDate) {
      setMessage('❌ Selecciona un archivo y una fecha')
      return
    }
    if (supermarket === 'No especificado') {
      setMessage('❌ Por favor selecciona un supermercado')
      return
    }
    let finalSupermarket = supermarket;

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    const fullDate = `${monthDate}-01`
    formData.append('monthDate', fullDate)
    formData.append('supermarket', finalSupermarket)

    try {
      const response = await axios.post('/api/upload-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setMessage(`✅ ${response.data.message} - Nuevos: ${response.data.nuevos}, Errores: ${response.data.errores}`)

      setFile(null)
      setMonthDate('')
      setSupermarket('No especificado')
      setCustomSupermarket('')
      const fileInput = document.getElementById('excel-file')
      if (fileInput) fileInput.value = ''

      fetchMonths()
      fetchStats()

    } catch (error) {
      setMessage('❌ Error al subir el archivo: ' + (error.response?.data?.error || error.message))
    } finally {
      setUploading(false)
    }
  }

const handlePreview = async (e) => {
  e.preventDefault();
  
  if (!file || !monthDate) {
    setMessage('❌ Selecciona un archivo y una fecha');
    return;
  }
  
  if (supermarket === 'No especificado') {
    setMessage('❌ Por favor selecciona un supermercado');
    return;
  }
  
  setPreviewLoading(true);
  const formData = new FormData();
  formData.append('file', file);
  const fullDate = `${monthDate}-01`;
  formData.append('monthDate', fullDate);
  formData.append('supermarket', supermarket);
  
  try {
    const response = await axios.post('/api/preview-excel', formData);
    
    if (response.data.success) {
      // Limpiar los datos para evitar valores null/undefined
      const cleanedData = response.data.data.map(item => ({
        ...item,
        productName: item.productName || '',
        quantity: item.quantity || 1,
        unit: item.unit || 'unidad',
        price: item.price || 0,
        equivalentQty: item.equivalentQty || null,
        equivalentUnit: item.equivalentUnit || null,
        row: item.row || 0,
        isValid: item.isValid !== false
      }));
      
      setPreviewData(cleanedData);
      setPreviewErrors(response.data.errors || []);
      setEditableData(cleanedData);
      setTempMonthDate(response.data.monthDate);
      setTempSupermarket(response.data.supermarket);
      setShowPreview(true);
    } else {
      setMessage('❌ Error al previsualizar el archivo');
    }
  } catch (error) {
    setMessage('❌ Error al previsualizar: ' + (error.response?.data?.error || error.message));
  } finally {
    setPreviewLoading(false);
  }
};

const handleConfirmUpload = async () => {
  // Validar que hay datos para guardar
  if (!editableData || editableData.length === 0) {
    setMessage('❌ No hay datos para guardar');
    return;
  }
  
  // Validar cada fila antes de guardar
  const validatedData = [];
  const validationErrors = [];
  
  for (let i = 0; i < editableData.length; i++) {
    const item = editableData[i];
    const errors = [];
    
    // 1. Validar que el producto no esté vacío
    if (!item.productName || item.productName.trim() === '') {
      errors.push(`Fila ${item.row || i + 1}: El nombre del producto no puede estar vacío`);
    }
    
    // 2. Validar que la cantidad sea un número válido y mayor que 0
    const quantityNum = parseFloat(item.quantity);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      errors.push(`Fila ${item.row || i + 1}: Cantidad inválida para "${item.productName || 'producto'}" - Debe ser un número mayor a 0`);
    }
    
    // 3. Validar que la unidad no esté vacía
    if (!item.unit || item.unit.trim() === '') {
      errors.push(`Fila ${item.row || i + 1}: Unidad inválida para "${item.productName}" - La unidad no puede estar vacía`);
    }
    
    // 4. Validar que el precio sea un número válido y mayor que 0
    const priceNum = parseFloat(item.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      errors.push(`Fila ${item.row || i + 1}: Precio inválido para "${item.productName}" - Debe ser un número mayor a 0`);
    }
    
    // 5. Validar que el precio sea entero (sin decimales) para productos
    if (!isNaN(priceNum) && priceNum % 1 !== 0) {
      errors.push(`Fila ${item.row || i + 1}: Precio inválido para "${item.productName}" - No uses decimales. Ejemplo: 5483 para $5,483`);
    }
    
    // 6. Validar equivalencias: si hay cantidad de equivalencia, debe haber unidad, y viceversa
    const hasEquivQty = item.equivalentQty && item.equivalentQty !== '' && parseFloat(item.equivalentQty) > 0;
    const hasEquivUnit = item.equivalentUnit && item.equivalentUnit.trim() !== '';
    
    if (hasEquivQty && !hasEquivUnit) {
      errors.push(`Fila ${item.row || i + 1}: Para "${item.productName}" especificaste una cantidad de equivalencia pero no la unidad`);
    }
    
    if (!hasEquivQty && hasEquivUnit) {
      errors.push(`Fila ${item.row || i + 1}: Para "${item.productName}" especificaste una unidad de equivalencia pero no la cantidad`);
    }
    
    // 7. Validar que la cantidad de equivalencia sea positiva
    if (hasEquivQty && parseFloat(item.equivalentQty) <= 0) {
      errors.push(`Fila ${item.row || i + 1}: La cantidad de equivalencia para "${item.productName}" debe ser mayor a 0`);
    }
    
    if (errors.length > 0) {
      validationErrors.push(...errors);
    } else {
      // Crear objeto limpio para guardar
      validatedData.push({
        ...item,
        productName: item.productName.trim(),
        unit: item.unit.trim().toLowerCase(),
        quantity: quantityNum,
        price: Math.round(priceNum), // Asegurar que sea entero
        equivalentQty: hasEquivQty ? parseFloat(item.equivalentQty) : null,
        equivalentUnit: hasEquivQty ? item.equivalentUnit.trim().toLowerCase() : null
      });
    }
  }
  
  // Mostrar errores de validación si existen
  if (validationErrors.length > 0) {
    const errorMessage = validationErrors.slice(0, 10).join('\n');
    const moreErrors = validationErrors.length > 10 ? `\n... y ${validationErrors.length - 10} errores más` : '';
    alert(`❌ Errores de validación:\n${errorMessage}${moreErrors}`);
    return;
  }
  
  if (validatedData.length === 0) {
    setMessage('❌ No hay datos válidos para guardar');
    return;
  }
  
  setUploading(true);
  try {
    const response = await axios.post('/api/confirm-upload', {
      confirmedData: validatedData,
      monthDate: tempMonthDate,
      supermarket: tempSupermarket
    });
    
    if (response.data.success) {
      setMessage(`✅ ${response.data.message} - Guardados: ${response.data.nuevos}, Errores: ${response.data.errores}`);
      setShowPreview(false);
      setFile(null);
      setMonthDate('');
      setSupermarket('No especificado');
      const fileInput = document.getElementById('excel-file');
      if (fileInput) fileInput.value = '';
      fetchMonths();
      fetchStats();
      setPreviewData([]);
      setEditableData([]);
    } else {
      setMessage('❌ Error al guardar los datos');
    }
  } catch (error) {
    setMessage('❌ Error al guardar: ' + (error.response?.data?.error || error.message));
  } finally {
    setUploading(false);
  }
};

  const handleEditRow = (index, field, value) => {
    const newData = [...editableData];
    newData[index][field] = value;
    setEditableData(newData);
  };

  const handleOpenConfirm = () => {
    if (!clearPassword) {
      alert('❌ Ingresa la contraseña de administrador')
      return
    }

    if (clearType === 'month' && !clearMonth) {
      alert('❌ Selecciona un mes para eliminar')
      return
    }

    setShowClearModal(false)
    setShowConfirmModal(true)
  }

  const handleClearAllData = async () => {
    setClearing(true)
    try {
      const response = await axios.delete('/api/clear-all-data', {
        data: { password: clearPassword }
      })

      if (response.data.success) {
        alert('✅ Todos los datos han sido eliminados correctamente')
        setShowConfirmModal(false)
        setClearPassword('')
        fetchMonths()
        fetchStats()
        setSearchResults([])
        setSelectedProduct(null)
        setComparison(null)
      }
    } catch (error) {
      alert('❌ Error: ' + (error.response?.data?.error || error.message))
    } finally {
      setClearing(false)
    }
  }

  const handleClearMonthData = async () => {
    setClearing(true)
    try {
      const response = await axios.delete('/api/clear-month-data', {
        data: {
          monthDate: clearMonth,
          password: clearPassword
        }
      })

      if (response.data.success) {
        alert(`✅ Datos del mes ${clearMonth} eliminados correctamente`)
        setShowConfirmModal(false)
        setClearPassword('')
        setClearMonth('')
        fetchMonths()
        fetchStats()
        setSearchResults([])
        setSelectedProduct(null)
        setComparison(null)
      }
    } catch (error) {
      alert('❌ Error: ' + (error.response?.data?.error || error.message))
    } finally {
      setClearing(false)
    }
  }

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setShowProductDetail(true);
  };

  const handleBackToList = () => {
    setShowProductDetail(false);
    setSelectedProduct(null);
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      alert('Ingresa un producto para buscar')
      return
    }

    try {
      const response = await axios.get(`/api/search?query=${searchTerm}`)
      setSearchResults(response.data)

      if (response.data.length === 0) {
        alert('No se encontraron productos')
      }
    } catch (error) {
      console.error('Error searching:', error)
      alert('Error en la búsqueda')
    }
  }

  const handleCompare = async () => {
    if (!selectedProduct || !month1 || !month2) {
      alert('Selecciona un producto y dos meses')
      return
    }

    try {
      const response = await axios.get(`/api/compare/${selectedProduct.id}?month1=${month1}&month2=${month2}`)
      setComparison(response.data)
    } catch (error) {
      console.error('Error comparing:', error)
      alert('Error en la comparación')
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>🛒 Control de Precios del Supermercado</h1>
        <div className="header-buttons">
          <div className="status">
            {backendStatus === 'connected' && (
              <span className="status-badge connected">✅ Backend conectado</span>
            )}
            {backendStatus === 'disconnected' && (
              <span className="status-badge disconnected">❌ Backend no disponible</span>
            )}
          </div>
          <button
            onClick={() => setShowClearModal(true)}
            className="clear-data-btn"
          >
            🗑️ Limpiar Datos
          </button>
        </div>
        {stats && (
          <div className="stats">
            📊 {stats.totalProducts} productos | 💰 {stats.totalPriceRecords} precios | 📅 {stats.totalMonths} meses
            {stats.units && <span> | 📦 Unidades: {stats.units.join(', ')}</span>}
          </div>
        )}
      </header>

      <div className="tabs">
        <button
          className={activeTab === 'upload' ? 'active' : ''}
          onClick={() => setActiveTab('upload')}
        >
          📤 Subir Excel
        </button>
        <button
          className={activeTab === 'search' ? 'active' : ''}
          onClick={() => setActiveTab('search')}
        >
          🔍 Buscar Producto
        </button>
        <button
          className={activeTab === 'compare' ? 'active' : ''}
          onClick={() => setActiveTab('compare')}
        >
          📈 Comparar Precios
        </button>
      </div>

      <div className="content">
        {activeTab === 'upload' && (
          <div className="upload-section">
            <div className="template-download">
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/download-template');
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'plantilla_precios_supermercado.xlsx';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                  } catch (error) {
                    console.error('Error descargando plantilla:', error);
                    alert('Error al descargar la plantilla');
                  }
                }}
                className="download-template-btn"
              >
                📥 Descargar Plantilla Excel
              </button>
            </div>
            <h2>📤 Subir Excel de Precios</h2>

            <div className="info-box">
  <p>📋 El Excel debe tener las siguientes columnas:</p>
  <ul>
    <li><strong>Producto</strong> - Nombre del producto</li>
    <li><strong>Cantidad</strong> - Número de unidades (ej: 2, 0.5, 1.5)</li>
    <li><strong>Unidad</strong> - Unidad de medida (lb, kg, litro, unidad, docena, etc.)</li>
    <li><strong>Precio</strong> - Precio total pagado</li>
    <li><strong>Equivalencia_Cantidad</strong> (opcional) - Para empaques: ¿cuántas unidades base tiene?</li>
    <li><strong>Equivalencia_Unidad</strong> (opcional) - Unidad base del empaque</li>
  </ul>
  <div className="warning-box">
    <p>⚠️ <strong>¡IMPORTANTE para la columna PRECIO!</strong></p>
    <p>❌ NO uses puntos ni comas en los precios</p>
    <p>✅ Ejemplo correcto: <strong>5483</strong> (para $5,483)</p>
  </div>
  <div className="example">
    <p>💡 Ejemplo de formato correcto:</p>
    <table className="example-table">
      <thead>
        <tr>
          <th>Producto</th>
          <th>Cantidad</th>
          <th>Unidad</th>
          <th>Precio</th>
          <th>Equivalencia_Cantidad</th>
          <th>Equivalencia_Unidad</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Pollo</td>
          <td>2</td>
          <td>kg</td>
          <td>16000</td>
          <td></td>
          <td></td>
        </tr>
        <tr>
          <td>Huevos</td>
          <td>30</td>
          <td>unidades</td>
          <td>12000</td>
          <td></td>
          <td></td>
        </tr>
        <tr>
          <td>Panal de Huevos</td>
          <td>1</td>
          <td>panal</td>
          <td>12000</td>
          <td>30</td>
          <td>unidades</td>
        </tr>
        <tr>
          <td>Ciruelas Bandeja</td>
          <td>1</td>
          <td>bandeja</td>
          <td>5000</td>
          <td>500</td>
          <td>gramos</td>
        </tr>
      </tbody>
    </table>
    <p className="note">✨ El sistema calculará automáticamente el precio por unidad base para comparaciones justas</p>
  </div>
</div>

            <form onSubmit={handleUpload}>
              <div className="form-row">
                <div className="form-col">
                  <div className="form-group month-selector-group">
                    <label>📅 Selecciona el mes de compra</label>
                    <div className="month-input-wrapper">
                      <div className="calendar-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                          <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="1.5"/>
                          <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="1.5"/>
                          <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth="1.5"/>
                          <circle cx="12" cy="13" r="1" fill="currentColor"/>
                          <circle cx="16" cy="13" r="1" fill="currentColor"/>
                          <circle cx="8" cy="13" r="1" fill="currentColor"/>
                        </svg>
                      </div>
                      <input
                        type="month"
                        value={monthDate}
                        onChange={(e) => setMonthDate(e.target.value)}
                        required
                        className="month-input"
                        placeholder="Selecciona un mes"
                      />
                    </div>
                    <div className="month-hint">
                      <span className="hint-icon">📅</span>
                      <span>Mes de la compra</span>
                    </div>
                  </div>
                </div>

                <div className="form-col">
                  <div className="form-group supermarket-group">
                    <label>🏪 Selecciona el supermercado <span style={{ color: '#f56565' }}>*</span></label>
                    <div className="supermarket-input-wrapper">
                      <div className="supermarket-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M3 6H21L19 18H5L3 6Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                          <path d="M8 12L8 15" stroke="currentColor" strokeWidth="1.5"/>
                          <path d="M16 12L16 15" stroke="currentColor" strokeWidth="1.5"/>
                          <circle cx="9" cy="20" r="1.5" fill="currentColor"/>
                          <circle cx="15" cy="20" r="1.5" fill="currentColor"/>
                          <path d="M7 6L7 4" stroke="currentColor" strokeWidth="1.5"/>
                          <path d="M17 6L17 4" stroke="currentColor" strokeWidth="1.5"/>
                        </svg>
                      </div>
                      <select
                        value={supermarket}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '__add_new__') {
                            setShowAddSupermarket(true);
                            setSupermarket('No especificado');
                          } else {
                            setSupermarket(value);
                          }
                        }}
                        className="supermarket-select"
                        required
                      >
                        <option value="No especificado" disabled>📌 Selecciona un supermercado</option>
                        {supermarketsList.map(store => (
                          <option key={store} value={store}>🏪 {store}</option>
                        ))}
                        <option value="__add_new__" style={{ color: '#48bb78', fontWeight: 'bold' }}>
                          ➕ Agregar nuevo supermercado...
                        </option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-col">
                  <div className="form-group file-group">
                    <label>📁 Archivo Excel</label>
                    <div className="file-input-wrapper">
                      <div className="file-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M13 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V9L13 2Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                          <path d="M13 2V9H20" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                          <line x1="8" y1="13" x2="16" y2="13" stroke="currentColor" strokeWidth="1.5"/>
                          <line x1="8" y1="17" x2="16" y2="17" stroke="currentColor" strokeWidth="1.5"/>
                          <line x1="8" y1="9" x2="10" y2="9" stroke="currentColor" strokeWidth="1.5"/>
                        </svg>
                      </div>
                      <input
                        id="excel-file"
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={(e) => setFile(e.target.files[0])}
                        required
                        className="file-input"
                      />
                      <span className="file-name">
                        {file ? file.name : 'Ningún archivo seleccionado'}
                      </span>
                    </div>
                    <div className="file-hint">
                      <span className="hint-icon">📊</span>
                      <span>Formatos: .xlsx, .xls</span>
                    </div>
                  </div>
                </div>
              </div>

              {showAddSupermarket && (
                <div className="modal-overlay" onClick={() => setShowAddSupermarket(false)}>
                  <div className="modal-content add-supermarket-modal" onClick={(e) => e.stopPropagation()}>
                    <button className="close-btn" onClick={() => setShowAddSupermarket(false)}>✖</button>
                    <h2>➕ Agregar nuevo supermercado</h2>
                    <div className="form-group">
                      <label>Nombre del supermercado:</label>
                      <input
                        type="text"
                        value={newSupermarket}
                        onChange={(e) => setNewSupermarket(e.target.value)}
                        placeholder="Ej: Mi Tienda Local, Supermercado XYZ"
                        className="new-supermarket-input"
                        autoFocus
                      />
                    </div>
                    <div className="modal-buttons">
                      <button className="cancel-btn" onClick={() => setShowAddSupermarket(false)}>Cancelar</button>
                      <button className="confirm-add-btn" onClick={addNewSupermarket} disabled={isAddingSupermarket}>
                        {isAddingSupermarket ? 'Agregando...' : 'Agregar Supermercado'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="preview-buttons">
                <button 
                  type="button" 
                  onClick={handlePreview} 
                  disabled={previewLoading}
                  className="preview-btn"
                >
                  {previewLoading ? (
                    <>
                      <span className="spinner"></span>
                      Analizando...
                    </>
                  ) : (
                    '👁️ Previsualizar'
                  )}
                </button>
              </div>
            </form>

            {message && <div className="message">{message}</div>}
          </div>
        )}

        {activeTab === 'search' && (
          <div className="search-section">
            {showProductDetail && selectedProduct ? (
              <div className="product-detail-view">
                <div className="detail-header">
                  <button className="back-btn" onClick={handleBackToList}>← Volver a la lista</button>
                  <h2>📦 {selectedProduct.name}</h2>
                  <p className="default-info">Cantidad típica: {selectedProduct.defaultQuantity} {selectedProduct.defaultUnit}</p>
                </div>
                <div className="detail-body">
                  <div className="price-history-list">
                    <h3>📊 Historial de Precios</h3>
                    <div className="table-container">
                      <table>
                        <thead>
                          <tr>
                            <th>Fecha</th>
                            <th>Cantidad</th>
                            <th>Supermercado</th>
                            <th>Precio Total</th>
                            <th>Precio por Unidad</th>
                            <th>¿Qué significa?</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedProduct.priceHistory || selectedProduct.allPrices || [])
                            .sort((a, b) => new Date(b.date) - new Date(a.date))
                            .map((item, idx) => {
                              const hasEquivalencia = item.equivalentQuantity && item.equivalentUnit;
                              const hasPricePerUnit = item.pricePerUnit !== null && item.pricePerUnit !== undefined && !isNaN(item.pricePerUnit);
                              let precioUnidadTexto = '';
                              let significadoTexto = '';
                              if (hasEquivalencia) {
                                precioUnidadTexto = `$${item.pricePerUnit.toFixed(2)}/${item.equivalentUnit}`;
                                significadoTexto = `1 ${item.equivalentUnit} = $${item.pricePerUnit.toFixed(2)}`;
                              } else if (hasPricePerUnit && !item.isPackage) {
                                precioUnidadTexto = `$${item.pricePerUnit.toFixed(2)}/${item.unit}`;
                                significadoTexto = `1 ${item.unit} = $${item.pricePerUnit.toFixed(2)}`;
                              } else {
                                precioUnidadTexto = `$${item.price}/${item.unit}`;
                                significadoTexto = `1 ${item.unit} = $${item.price}`;
                              }
                              return (
                                <tr key={idx}>
                                  <td>{item.date}</td>
                                  <td>
                                    {item.quantity} {item.unit}
                                    {hasEquivalencia && <span className="equivalencia-note"> (equivale a {item.quantity * item.equivalentQuantity} {item.equivalentUnit})</span>}
                                   </td>
                                  <td className="supermarket-cell">🏪 {item.supermarket || 'No especificado'}</td>
                                  <td>${typeof item.price === 'number' ? item.price.toLocaleString() : item.price}</td>
                                  <td className="price-value">{precioUnidadTexto}</td>
                                  <td className="explanation">{significadoTexto}</td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="info-note">
                    <p>💡 <strong>Entendiendo los precios:</strong></p>
                    <ul>
                      <li><strong>Precio Total:</strong> Lo que pagaste por toda la compra</li>
                      <li><strong>Precio por Unidad:</strong> Lo que cuesta 1 unidad base (esto te ayuda a comparar ofertas reales)</li>
                      <li><strong>Para empaques:</strong> Se muestra el precio por unidad base cuando hay equivalencia</li>
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <h2>🔍 Buscar Productos</h2>
                <div className="search-box">
                  <input type="text" placeholder="🔎 Buscar por nombre de producto..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSearch()} />
                  <button onClick={handleSearch}>🔍 Buscar</button>
                </div>
                {searchResults.length > 0 && (
                  <div className="results-list">
                    <h3>🔎 Resultados de búsqueda ({searchResults.length})</h3>
                    {searchResults.map(product => (
                      <div key={product.id} className="product-card" onClick={() => handleSelectProduct(product)}>
                        <h4>{product.name}</h4>
                        <div className="product-info">
                          <span>📦 {product.defaultQuantity} {product.defaultUnit} (por defecto)</span>
                          <span>📊 {product.priceHistory.length} registros</span>
                          {product.priceHistory[0] && <span>💰 {product.priceHistory[0].displayText}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {searchTerm && searchResults.length === 0 && <div className="no-results"><p>❌ No se encontraron productos con "{searchTerm}"</p></div>}
                {searchTerm === '' && (
                  <>
                    <hr className="search-divider" />
                    <div className="filters-container">
                      <div className="filter-group">
                        <label>📅 Filtrar por mes:</label>
                        <select value={selectedMonth} onChange={(e) => { setSelectedMonth(e.target.value); fetchAllProducts(e.target.value, selectedLetter); }} className="filter-select">
                          <option value="todos">📆 Todos los meses</option>
                          {months.map(month => <option key={month} value={month}>{month}</option>)}
                        </select>
                      </div>
                      <div className="filter-group">
                        <label>🔤 Filtrar por letra:</label>
                        <div className="letter-filter">
                          <button className={`letter-btn ${selectedLetter === 'todos' ? 'active' : ''}`} onClick={() => { setSelectedLetter('todos'); fetchAllProducts(selectedMonth, 'todos'); }}>Todos</button>
                          {['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'].map(letter => (
                            <button key={letter} className={`letter-btn ${selectedLetter === letter ? 'active' : ''}`} onClick={() => { setSelectedLetter(letter); fetchAllProducts(selectedMonth, letter); }}>{letter}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                    {productsLoading && (<div className="loading-products"><div className="spinner"></div><p>Cargando productos...</p></div>)}
                    {!productsLoading && (
                      <div className="products-list">
                        <h3>📦 Todos los productos ({allProducts.length})</h3>
                        {allProducts.length === 0 ? (
                          <div className="empty-products"><p>📭 No hay productos para mostrar</p><p>Sube un Excel con productos para comenzar</p></div>
                        ) : (
                          allProducts.map(product => (
                            <div key={product.id} className="product-card" onClick={() => handleSelectProduct(product)}>
                              <div className="product-card-header">
                                <h4>{product.name}</h4>
                                {product.latestPrice && <span className="latest-price-badge">📅 {product.latestPrice.date} {product.latestPrice.supermarket ? `- ${product.latestPrice.supermarket}` : ''}</span>}
                              </div>
                              <div className="product-info">
                                <span>📦 {product.defaultQuantity} {product.defaultUnit} (por defecto)</span>
                                <span>📊 {product.allPrices.length} registros</span>
                                {product.latestPrice && <span className="latest-price">💰 Último: {product.latestPrice.displayText}</span>}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'compare' && (
          <div className="compare-section">
            <h2>📊 Comparar Precios (Normalizado por Unidad)</h2>
            <p className="info-text">✨ La comparación se hace automáticamente por unidad de medida (1 lb, 1 kg, 1 unidad) para que sea justa aunque compres diferentes cantidades</p>
            <div className="search-product">
              <input type="text" placeholder="Buscar producto..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              <button onClick={handleSearch}>Buscar Producto</button>
            </div>
            {searchResults.length > 0 && (
              <div className="product-select">
                <label>Selecciona un producto:</label>
                <select onChange={(e) => { const product = searchResults.find(p => p.id === parseInt(e.target.value)); setSelectedProduct(product); setComparison(null); }}>
                  <option value="">-- Selecciona --</option>
                  {searchResults.map(product => <option key={product.id} value={product.id}>{product.name} ({product.defaultQuantity} {product.defaultUnit})</option>)}
                </select>
              </div>
            )}
            {selectedProduct && (
              <>
                <div className="selected-product"><p><strong>Producto:</strong> {selectedProduct.name}</p><p><strong>Cantidad típica:</strong> {selectedProduct.defaultQuantity} {selectedProduct.defaultUnit}</p></div>
                <div className="month-selectors">
                  <div><label>Mes anterior:</label><select value={month1} onChange={(e) => setMonth1(e.target.value)}><option value="">Selecciona</option>{months.map(month => <option key={month} value={month}>{month}</option>)}</select></div>
                  <div><label>Mes actual:</label><select value={month2} onChange={(e) => setMonth2(e.target.value)}><option value="">Selecciona</option>{months.map(month => <option key={month} value={month}>{month}</option>)}</select></div>
                </div>
                <button onClick={handleCompare} className="compare-btn">Comparar Precios</button>
              </>
            )}
            {comparison && (
              <div className="comparison-results">
                <h3>Resultados: {comparison.productName}</h3>
                <div className="price-cards">
                  <div className="price-card">
                    <h4>📆 {comparison.month1.date || 'Mes 1'}</h4>
                    <div className="price-details">
                      <div className="total-price"><span className="label">🏪 Supermercado:</span><span className="value">{comparison.month1.supermarket || 'No especificado'}</span></div>
                      <div className="total-price"><span className="label">💰 Total pagado:</span><span className="value">{comparison.month1.displayText || 'No disponible'}</span></div>
                      {comparison.month1.basePrice && (<div className="unit-price highlight"><span className="label">✨ Precio por {comparison.baseUnit}:</span><span className="value-big">${comparison.month1.basePrice.toFixed(2)}</span><span className="unit-label">por {comparison.baseUnit}</span></div>)}
                      <div className="quantity-info"><span className="label">📦 Cantidad comprada:</span><span className="value">{comparison.month1.quantity} {comparison.month1.unit}</span></div>
                    </div>
                  </div>
                  <div className="price-card">
                    <h4>📆 {comparison.month2.date || 'Mes 2'}</h4>
                    <div className="price-details">
                      <div className="total-price"><span className="label">🏪 Supermercado:</span><span className="value">{comparison.month2.supermarket || 'No especificado'}</span></div>
                      <div className="total-price"><span className="label">💰 Total pagado:</span><span className="value">{comparison.month2.displayText || 'No disponible'}</span></div>
                      {comparison.month2.basePrice && (<div className="unit-price highlight"><span className="label">✨ Precio por {comparison.baseUnit}:</span><span className="value-big">${comparison.month2.basePrice.toFixed(2)}</span><span className="unit-label">por {comparison.baseUnit}</span></div>)}
                      <div className="quantity-info"><span className="label">📦 Cantidad comprada:</span><span className="value">{comparison.month2.quantity} {comparison.month2.unit}</span></div>
                    </div>
                  </div>
                </div>
                {comparison.difference !== null && (
                  <div className="difference-info">
                    <div className="comparison-summary">
                      <h4>📊 Comparativa de Precios (por {comparison.baseUnit})</h4>
                      <div className="comparison-row"><span>Mes anterior:</span><strong>${comparison.month1.basePrice.toFixed(2)}</strong><span>por {comparison.baseUnit} ({comparison.month1.supermarket || 'N/E'})</span></div>
                      <div className="comparison-row"><span>Mes actual:</span><strong>${comparison.month2.basePrice.toFixed(2)}</strong><span>por {comparison.baseUnit} ({comparison.month2.supermarket || 'N/E'})</span></div>
                      <div className="difference-amount">Diferencia por {comparison.baseUnit}:<strong className={comparison.difference > 0 ? 'negative' : 'positive'}>${Math.abs(comparison.difference).toFixed(2)} {comparison.difference > 0 ? '↑ más caro' : '↓ más barato'}</strong></div>
                      <div className="percentage-change">Variación porcentual:<strong className={comparison.percentageChange > 0 ? 'negative' : 'positive'}>{Math.abs(comparison.percentageChange).toFixed(2)}% {comparison.percentageChange > 0 ? '(Aumentó)' : '(Disminuyó)'}</strong></div>
                      <div className="practical-example"><p>💡 <strong>Ejemplo práctico:</strong></p><p>Si hoy quieres comprar 1 {comparison.baseUnit} de {comparison.productName}:</p><p className="example-price">Te costaría <strong>${comparison.month2.basePrice.toFixed(2)}</strong>{comparison.month1.basePrice && (<span> vs <strong>${comparison.month1.basePrice.toFixed(2)}</strong> el mes anterior</span>)}</p></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showClearModal && (
        <div className="modal-overlay" onClick={() => setShowClearModal(false)}>
          <div className="modal-content clear-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowClearModal(false)}>✖</button>
            <h2>🗑️ Limpiar Datos</h2>
            <div className="clear-options">
              <label><input type="radio" value="all" checked={clearType === 'all'} onChange={(e) => setClearType('all')} /> Eliminar TODOS los datos (productos y precios)</label>
              <label><input type="radio" value="month" checked={clearType === 'month'} onChange={(e) => setClearType('month')} /> Eliminar solo un mes específico</label>
            </div>
            {clearType === 'month' && (
              <div className="form-group">
                <label>Selecciona el mes a eliminar:</label>
                <select value={clearMonth} onChange={(e) => setClearMonth(e.target.value)}><option value="">Selecciona un mes</option>{months.map(month => <option key={month} value={month}>{month}</option>)}</select>
              </div>
            )}
            <div className="form-group">
              <label>Contraseña de administrador:</label>
              <input type="password" value={clearPassword} onChange={(e) => setClearPassword(e.target.value)} placeholder="Ingresa la contraseña" />
            </div>
            <div className="modal-buttons">
              <button className="cancel-btn" onClick={() => setShowClearModal(false)}>Cancelar</button>
              <button onClick={handleOpenConfirm} className="confirm-clear-btn">Continuar</button>
            </div>
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div className="modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowConfirmModal(false)}>✖</button>
            <div className="confirm-icon">⚠️</div>
            <h2>¿Estás completamente seguro?</h2>
            {clearType === 'all' ? (
              <p className="warning-text">Esta acción eliminará <strong>TODOS los productos y todos los precios</strong> de la base de datos.<br /><br /><strong>Esta acción no se puede deshacer.</strong></p>
            ) : (
              <p className="warning-text">Esta acción eliminará <strong>TODOS los precios del mes {clearMonth}</strong>.<br /><br /><strong>Esta acción no se puede deshacer.</strong></p>
            )}
            <div className="modal-buttons">
              <button className="cancel-btn" onClick={() => setShowConfirmModal(false)}>No, Cancelar</button>
              <button className="confirm-clear-btn" onClick={clearType === 'all' ? handleClearAllData : handleClearMonthData} disabled={clearing}>{clearing ? 'Eliminando...' : 'Sí, Eliminar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de previsualización con equivalencias editables */}
      {showPreview && (
        <div className="modal-overlay" onClick={() => setShowPreview(false)}>
          <div className="modal-content preview-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowPreview(false)}>✖</button>
            <h2>📋 Previsualizar Datos</h2>
            
            {previewErrors.length > 0 && (
              <div className="preview-errors">
                <p>⚠️ Se encontraron {previewErrors.length} errores:</p>
                <ul>
                  {previewErrors.slice(0, 5).map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="preview-table-container">
              <table className="preview-table">
                <thead>
                  <tr>
                    <th>Fila</th>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Unidad</th>
                    <th>Precio</th>
                    <th>Equivalencia Cantidad</th>
                    <th>Equivalencia Unidad</th>
                  </tr>
                </thead>
                <tbody>
                  {editableData.map((item, idx) => (
                    <tr key={idx} className={item.isValid === false ? 'invalid-row' : ''}>
  <td>{item.row}</td>
  <td>
    <input
      type="text"
      value={item.productName}
      onChange={(e) => handleEditRow(idx, 'productName', e.target.value)}
      className="preview-input"
    />
  </td>
  <td>
    <input
      type="number"
      step="0.001"
      value={item.quantity}
      onChange={(e) => handleEditRow(idx, 'quantity', parseFloat(e.target.value))}
      className="preview-input preview-input-small"
    />
  </td>
  <td>
    <select
      value={item.unit}
      onChange={(e) => handleEditRow(idx, 'unit', e.target.value)}
      className="preview-select preview-select-small"
    >
      <option value="kg">kg (kilogramos)</option>
      <option value="g">g (gramos)</option>
      <option value="lb">lb (libras)</option>
      <option value="litro">litro</option>
      <option value="unidad">unidad</option>
      <option value="bandeja">bandeja</option>
      <option value="panal">panal</option>
      <option value="caja">caja</option>
      <option value="bolsa">bolsa</option>
    </select>
  </td>
  <td>
    <input
      type="number"
      value={item.price}
      onChange={(e) => handleEditRow(idx, 'price', parseInt(e.target.value))}
      className="preview-input"
    />
  </td>
  <td>
    <input
      type="number"
      step="0.001"
      value={item.equivalentQty || ''}
      onChange={(e) => handleEditRow(idx, 'equivalentQty', e.target.value ? parseFloat(e.target.value) : null)}
      className="preview-input preview-input-small"
      placeholder="Opcional"
    />
  </td>
  <td>
    <select
      value={item.equivalentUnit || ''}
      onChange={(e) => handleEditRow(idx, 'equivalentUnit', e.target.value || null)}
      className="preview-select preview-select-small"
    >
      <option value="">-- Ninguna --</option>
      <option value="kg">kg (kilogramos)</option>
      <option value="g">g (gramos)</option>
      <option value="lb">lb (libras)</option>
      <option value="litro">litro</option>
      <option value="unidad">unidad</option>
      <option value="gramos">gramos</option>
      <option value="unidades">unidades</option>
    </select>
  </td>
</tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="preview-summary">
              <p>📊 Total productos: {editableData.length}</p>
              <p>🏪 Supermercado: {tempSupermarket}</p>
              <p>📅 Mes: {tempMonthDate}</p>
            </div>
            
            <div className="modal-buttons">
              <button className="cancel-btn" onClick={() => setShowPreview(false)}>
                Cancelar
              </button>
              <button 
                className="confirm-upload-btn" 
                onClick={handleConfirmUpload}
                disabled={uploading}
              >
                {uploading ? 'Guardando...' : '✅ Confirmar y Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App