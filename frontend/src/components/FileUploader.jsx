import React, { useState } from 'react';
import axios from 'axios';

function FileUploader({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [monthDate, setMonthDate] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      alert('📁 Por favor selecciona un archivo Excel');
      return;
    }
    
    if (!monthDate) {
      alert('📅 Por favor selecciona el mes de los precios');
      return;
    }
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('monthDate', monthDate);
    
    try {
      const response = await axios.post('/api/upload-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      console.log('Respuesta:', response.data);
      alert(`✅ ${response.data.message}\n📊 Procesados: ${response.data.success} productos\n⚠️ Errores: ${response.data.errors}`);
      
      setFile(null);
      setMonthDate('');
      onUploadSuccess();
      
      // Resetear el input file
      const fileInput = document.getElementById('excel-file');
      if (fileInput) fileInput.value = '';
      
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error al subir el archivo: ' + (error.response?.data?.error || error.message));
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div className="file-uploader">
      <h2>📤 Subir Excel de Precios</h2>
      
      <div className="info-box">
        <p>📋 El Excel debe tener columnas:</p>
        <ul>
          <li><strong>Producto</strong> - Nombre del producto</li>
          <li><strong>Precio</strong> - Precio en números (ej: 2.50)</li>
        </ul>
        <p>💡 Ejemplo de formato:</p>
        <table className="example-table">
          <thead>
            <tr><th>Producto</th><th>Precio</th></tr>
          </thead>
          <tbody>
            <tr><td>Leche</td><td>2.50</td></tr>
            <tr><td>Pan</td><td>1.20</td></tr>
            <tr><td>Huevos (12)</td><td>3.00</td></tr>
          </tbody>
        </table>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>📅 Mes de los precios:</label>
          <input
            type="month"
            value={monthDate}
            onChange={(e) => setMonthDate(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label>📁 Archivo Excel:</label>
          <input
            id="excel-file"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => setFile(e.target.files[0])}
            required
          />
        </div>
        
        <button type="submit" disabled={uploading} className="upload-btn">
          {uploading ? '⏳ Subiendo...' : '🚀 Subir Excel'}
        </button>
      </form>
    </div>
  );
}

export default FileUploader;