import React, { useState } from 'react';
import axios from 'axios';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

function ProductSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      alert('🔍 Ingresa un nombre de producto para buscar');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.get('/api/search', {
        params: { query: searchTerm }
      });
      setResults(response.data);
      
      if (response.data.length === 0) {
        alert('No se encontraron productos con ese nombre');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error en la búsqueda');
    } finally {
      setLoading(false);
    }
  };

  const showProductDetails = (product) => {
    const chartData = product.priceHistory
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(item => ({
        date: item.date,
        price: item.price
      }));
    
    setSelectedProduct({ ...product, chartData });
  };

  return (
    <div className="product-search">
      <h2>🔍 Buscar Productos</h2>
      
      <div className="search-box">
        <input
          type="text"
          placeholder="Ej: Leche, Pan, Huevos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button onClick={handleSearch} disabled={loading}>
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </div>
      
      {results.length > 0 && (
        <div className="results-list">
          <h3>Resultados encontrados ({results.length})</h3>
          {results.map(product => (
            <div 
              key={product.id} 
              className="product-card"
              onClick={() => showProductDetails(product)}
            >
              <h4>{product.name}</h4>
              <div className="product-info">
                <span>📊 {product.priceHistory.length} registros</span>
                {product.priceHistory[0] && (
                  <span>💰 Último precio: ${product.priceHistory[0].price}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {selectedProduct && (
        <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedProduct(null)}>
              ✖ Cerrar
            </button>
            <h2>{selectedProduct.name}</h2>
            
            {selectedProduct.chartData.length > 0 && (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={selectedProduct.chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="price" 
                      stroke="#667eea" 
                      strokeWidth={2}
                      dot={{ fill: '#667eea' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                
                <div className="price-history-list">
                  <h3>Historial de Precios</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Precio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedProduct.priceHistory
                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                        .map((item, idx) => (
                          <tr key={idx}>
                            <td>{item.date}</td>
                            <td className="price-value">${item.price}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductSearch;