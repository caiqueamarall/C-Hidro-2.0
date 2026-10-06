import { useState } from 'react';
import { Activity, LayoutDashboard, Settings, BarChart2, Calendar } from 'lucide-react';
import { Menu, X } from 'lucide-react';
import './App.css';
import SerieHistoricaTab from './components/SerieHistoricaTab';
import SerieAnualTab from './components/SerieAnualTab';
import EstatisticasTab from './components/EstatisticasTab';
import ComparativosTab from './components/ComparativosTab';
import VisaoGeralTab from './components/VisaoGeralTab';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className={`app-container ${!isSidebarOpen ? 'sidebar-collapsed' : ''}`}>
      {/* Sidebar */}
      <aside className={`sidebar ${!isSidebarOpen ? 'collapsed' : ''}`}>
        <div className="sidebar-header relative flex items-center h-16 mt-4 mb-4">
          <div className={`sidebar-title flex items-center gap-2 ${!isSidebarOpen ? 'hidden' : ''}`}>
            <Activity color="#45A29E" size={28} />
            <span className="whitespace-nowrap text-xl tracking-tight">C-Hidro 2.0</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-1.5 hover:bg-slate-100 rounded-md text-slate-500 absolute ${isSidebarOpen ? 'right-4' : 'left-1/2 -translate-x-1/2'}`}
            title={isSidebarOpen ? "Recolher Menu" : "Expandir Menu"}
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        
        <nav className="sidebar-nav">
          <div 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={20} />
            {isSidebarOpen && <span>Visão Geral</span>}
          </div>
          <div 
            className={`nav-item ${activeTab === 'serie-historica' ? 'active' : ''}`}
            onClick={() => setActiveTab('serie-historica')}
          >
            <Activity size={20} />
            {isSidebarOpen && <span>Série Histórica</span>}
          </div>
          <div 
            className={`nav-item ${activeTab === 'serie-anual' ? 'active' : ''}`}
            onClick={() => setActiveTab('serie-anual')}
          >
            <Activity size={20} />
            {isSidebarOpen && <span>Série Anual</span>}
          </div>
          <div 
            className={`nav-item ${activeTab === 'estatisticas' ? 'active' : ''}`}
            onClick={() => setActiveTab('estatisticas')}
          >
            <BarChart2 size={20} />
            {isSidebarOpen && <span>Estatísticas</span>}
          </div>
          <div 
            className={`nav-item ${activeTab === 'comparativos' ? 'active' : ''}`}
            onClick={() => setActiveTab('comparativos')}
          >
            <Calendar size={20} />
            {isSidebarOpen && <span>Comparativos</span>}
          </div>
          <div 
            className={`nav-item ${activeTab === 'config' ? 'active' : ''}`}
            onClick={() => setActiveTab('config')}
          >
            <Settings size={20} />
            {isSidebarOpen && <span>Configurações</span>}
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
          <div className="tab-content" style={{ padding: 0, overflow: 'hidden' }}>
            <VisaoGeralTab />
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
