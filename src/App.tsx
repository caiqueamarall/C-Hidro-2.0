import React, { useState } from 'react';
import { Activity, LayoutDashboard, Settings, BarChart2, Calendar } from 'lucide-react';
import './App.css';
import SerieHistoricaTab from './components/SerieHistoricaTab';
import SerieAnualTab from './components/SerieAnualTab';
import EstatisticasTab from './components/EstatisticasTab';
import ComparativosTab from './components/ComparativosTab';

function App() {
  const [activeTab, setActiveTab] = useState('serie-historica');

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-title">
            <Activity color="#45A29E" size={28} />
            C-Hidro 2.0
          </div>
        </div>
        
        <nav className="sidebar-nav">
          <div 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={20} />
            Visão Geral
          </div>
          <div 
            className={`nav-item ${activeTab === 'serie-historica' ? 'active' : ''}`}
            onClick={() => setActiveTab('serie-historica')}
          >
            <Activity size={20} />
            Série Histórica
          </div>
          <div 
            className={`nav-item ${activeTab === 'serie-anual' ? 'active' : ''}`}
            onClick={() => setActiveTab('serie-anual')}
          >
            <Activity size={20} />
            Série Anual
          </div>
          <div 
            className={`nav-item ${activeTab === 'estatisticas' ? 'active' : ''}`}
            onClick={() => setActiveTab('estatisticas')}
          >
            <BarChart2 size={20} />
            Estatísticas
          </div>
          <div 
            className={`nav-item ${activeTab === 'comparativos' ? 'active' : ''}`}
            onClick={() => setActiveTab('comparativos')}
          >
            <Calendar size={20} />
            Comparativos
          </div>
          <div 
            className={`nav-item ${activeTab === 'config' ? 'active' : ''}`}
            onClick={() => setActiveTab('config')}
          >
            <Settings size={20} />
            Configurações
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {activeTab === 'serie-historica' && <SerieHistoricaTab />}
        {activeTab === 'serie-anual' && <SerieAnualTab />}
        {activeTab === 'estatisticas' && <EstatisticasTab />}
        {activeTab === 'comparativos' && <ComparativosTab />}
        {activeTab === 'dashboard' && (
          <div className="tab-content">
            <h1 className="page-title">Visão Geral</h1>
            <p className="page-subtitle">Em construção...</p>
          </div>
        )}
        {activeTab === 'config' && (
          <div className="tab-content">
            <h1 className="page-title">Configurações</h1>
            <p className="page-subtitle">Em construção...</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
