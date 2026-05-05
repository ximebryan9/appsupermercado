import React, { useState } from 'react';
import axios from 'axios';

function PriceComparison({ months }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [month1, setMonth1] = useState('');
  const [month2, setMonth2] = useState('');
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearchProduct = async () => {
    if (!searchTerm.trim()) {
      alert('Ingresa un producto para buscar');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.get('/api/search', {
        params: { query: searchTerm }
      });
      setSearchResults(response.data);
      
      if (response.data.length === 0) {
        alert('No se encontraron productos');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error en la búsqueda');
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = async () => {
    if (!selectedProduct) {
      alert('Selecciona un producto');
      return;
    }
    
    if (!month1 || !month2) {
      alert('Selecciona dos meses para comparar');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.get(`/api/compare/${selectedProduct.id}`, {
        params: { month1, month2 }
      });
      setComparison(response.data);
    } catch (error) {
      console.error('Error:', error);
      alert('Error en la comparación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="price-comparison">
      <h2>📊 Comparar Precios entre Meses</h2>
      
      <div className="comparison-container">
        <div className="search-section">
          <input
            type="text"
            placeholder="Buscar producto para comparar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button onClick={handleSearchProduct} disabled={loading}>
            Buscar Producto
          </button>
        </div>
        
        {searchResults.length > 0 && (
          <div className="product-select">
            <label>📦 Selecciona un producto:</label>
            <select onChange={(e) => {
              const product = searchResults.find(p => p.id === parseInt(e.target.value));
              setSelectedProduct(product);
              setComparison(null);
            }}>
              <option value="">-- Selecciona --</option>
              {searchResults.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.priceHistory.length} registros)
                </option>
              ))}
            </select>
          </div>
        )}
        
        {selectedProduct && (
          <>
            <div className="product-info-card">
              <h3>Producto seleccionado:</h3>
              <p><strong>{selectedProduct.name}</strong></p>
              <p>📈 {selectedProduct.priceHistory.length} precios registrados</p>
            </div>
            
            <div className="month-selectors">
              <div className="month-select">
                <label>📅 Mes anterior:</label>
                <select value={month1} onChange={(e) => setMonth1(e.target.value)}>
                  <option value="">Selecciona mes</option>
                  {months.map(month => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              </div>
              
              <div className="month-select">
                <label>📅 Mes actual:</label>
                <select value={month2} onChange={(e) => setMonth2(e.target.value)}>
                  <option value="">Selecciona mes</option>
                  {months.map(month => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <button onClick={handleCompare} disabled={loading} className="compare-btn">
              Comparar Precios
            </button>
          </>
        )}
        
        {comparison && (
          <div className="comparison-results">
            <h3>Resultados de Comparación</h3>
            
            <div className="price-cards">
              <div className="price-card">
                <h4>📆 {comparison.month1.date || 'Mes 1'}</h4>
                <p className="price">
                  {comparison.month1.price ? `$${comparison.month1.price}` : '❌ No disponible'}
                </p>
              </div>
              
              <div className="arrow">→</div>
              
              <div className="price-card">
                <h4>📆 {comparison.month2.date || 'Mes 2'}</h4>
                <p className="price">
                  {comparison.month2.price ? `$${comparison.month2.price}` : '❌ No disponible'}
                </p>
              </div>
            </div>
            
            {comparison.difference !== null && (
              <div className="difference-info">
                <div className="difference-amount">
                  <strong>Diferencia absoluta:</strong> 
                  <span className={comparison.difference > 0 ? 'negative' : 'positive'}>
                    ${Math.abs(comparison.difference).toFixed(2)}
                    {comparison.difference > 0 ? ' ↑' : ' ↓'}
                  </span>
                </div>
                
                <div className="percentage-change">
                  <strong>Variación porcentual:</strong>
                  <span className={comparison.percentageChange > 0 ? 'negative' : 'positive'}>
                    {Math.abs(comparison.percentageChange).toFixed(2)}%
                    {comparison.percentageChange > 0 ? ' (Aumentó)' : ' (Disminuyó)'}
                  </span>
                </div>
              </div>
            )}
            
            {comparison.difference === null && (
              <div className="no-data">
                ⚠️ No hay datos disponibles para uno de los meses seleccionados
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default PriceComparison;