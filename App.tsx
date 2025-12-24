
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  ShoppingCart, MessageSquare, Send, Package, 
  Search, RefreshCw, Edit3, Trash2, 
  X, Lock, Unlock, Image as ImageIcon, TrendingUp, 
  ChevronDown, MapPin, Clock, Navigation, Disc, ClipboardList, Timer,
  Menu, ChevronRight, Sparkles, LayoutDashboard, Database, Activity, ArrowRight, Layers,
  Info, Plus, Map as MapIcon, ExternalLink, Phone, Settings
} from 'lucide-react';
import { Product, ChatMessage } from './types';
import { fetchProductsFromScript, addProductToSheet, editProductInSheet, deleteProductFromSheet, recordSaleToSheet, logRequestToSheet } from './services/googleSheetService';
import { getGeminiResponse } from './services/geminiService';

const DEFAULT_SHEET_URL = "https://script.google.com/macros/s/AKfycbyAFLNLQ1TQPzFet_AX3POuw89jtt66QStx2uEKUYjw89KwQngGswS990dpJTeeE6eN/exec";
const ADMIN_PASSWORD = "admin123";
const SHOP_WA = "081272895108";
const SHOP_LAT = -5.420319813492731;
const SHOP_LNG = 105.80189172275784;
const SHOP_ADDR = "Karya Makmur, Kec. Labuhan Maringgai, Lampung Timur";

const INITIAL_GREETING: ChatMessage = { 
  role: 'assistant', 
  content: 'Halo! Saya asisten ban Karya Makmur Lampung. Butuh info ukuran ban atau stok hari ini?' 
};

const App: React.FC = () => {
  const [scriptUrl] = useState(DEFAULT_SHEET_URL);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  
  // Admin State
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);

  // UI State
  const [activeCategory, setActiveCategory] = useState<string>('Semua');
  const [showFormModal, setShowFormModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProductForSale, setSelectedProductForSale] = useState<Product | null>(null);
  const [saleQty, setSaleQty] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState<Partial<Product>>({
    brand: '', category: 'Ban', code: '', size: '', ring: '', stock: 0, description: 'Baru', expiryCode: '', image: ''
  });

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([INITIAL_GREETING]);
  const [userInput, setUserInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchProductsFromScript(scriptUrl);
      setProducts(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setTimeout(() => setLoading(false), 1200);
    }
  }, [scriptUrl]);

  useEffect(() => { 
    const timer = setTimeout(() => setShowSplash(false), 3000);
    loadData(); 
    return () => clearTimeout(timer);
  }, [loadData]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = activeCategory === 'Semua' || p.category === activeCategory;
      const matchSearch = p.brand.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.size.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, activeCategory, searchQuery]);

  const groupedByBrand = useMemo(() => {
    const groups: { [key: string]: Product[] } = {};
    filteredProducts.forEach(p => {
      const b = p.brand.toUpperCase();
      if (!groups[b]) groups[b] = [];
      groups[b].push(p);
    });
    return Object.fromEntries(Object.entries(groups).sort());
  }, [filteredProducts]);

  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setIsAdminMode(true);
      setShowLoginModal(false);
      setPasswordInput('');
    } else {
      setLoginError(true);
      setTimeout(() => setLoginError(false), 2000);
    }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;
    const input = userInput;
    const newMsgs: ChatMessage[] = [...chatMessages, { role: 'user', content: input }];
    setChatMessages(newMsgs);
    setUserInput('');
    setIsChatting(true);
    try {
      const res = await getGeminiResponse(input, products);
      setChatMessages([...newMsgs, { role: 'assistant', content: res }]);
    } catch {
      setChatMessages([...newMsgs, { role: 'assistant', content: 'Database sedang sinkronisasi...' }]);
    } finally {
      setIsChatting(false);
    }
  };

  const handleDelete = async (nomor: number) => {
    if (!window.confirm('Hapus data ban ini secara permanen dari Cloud?')) return;
    setActionLoading(true);
    try {
      const success = await deleteProductFromSheet(scriptUrl, nomor);
      if (success) {
        alert('Data berhasil dihapus.');
        loadData();
      }
    } catch (err) {
      alert('Gagal menghapus data.');
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormData({ ...p });
    setShowFormModal(true);
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({brand: '', category: 'Ban', code: '', size: '', ring: '', stock: 0, description: 'Baru', expiryCode: '', image: ''});
    setShowFormModal(true);
  };

  if (showSplash) {
    return (
      <div className="fixed inset-0 bg-[#020617] flex flex-col items-center justify-center z-[100] px-6">
        <div className="relative mb-8 splash-logo">
          <div className="animate-grind w-32 h-32 md:w-40 md:h-40 rounded-full tire-3d flex items-center justify-center border-2 border-slate-700">
             <Disc size={60} className="text-sky-400 opacity-80" strokeWidth={1} />
          </div>
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
             <div className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-ping"></div>
             <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping delay-150"></div>
          </div>
        </div>
        <div className="text-center">
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-[0.3em] uppercase mb-4">
            KARYA <span className="text-sky-500">MAKMUR</span>
          </h1>
          <p className="text-[10px] md:text-[11px] text-slate-500 font-bold uppercase tracking-[0.5em] mb-12">Automotive Cloud Expert</p>
        </div>
        <div className="w-48 md:w-72 h-1 bg-slate-900 rounded-full overflow-hidden border border-white/5 relative">
          <div className="h-full bg-gradient-to-r from-sky-500 to-indigo-600 animate-[loading_2s_ease-in-out_infinite]"></div>
        </div>
        <style>{`@keyframes loading { 0% { width: 0%; transform: translateX(-100%); } 50% { width: 70%; } 100% { width: 0%; transform: translateX(250%); } }`}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200">
      {/* BACKGROUND DECO */}
      <div className="fixed -top-24 -left-24 w-64 h-64 md:w-[600px] md:h-[600px] bg-sky-500/5 blur-[120px] -z-10 rounded-full"></div>
      <div className="fixed -bottom-24 -right-24 w-80 h-80 md:w-[700px] md:h-[700px] bg-indigo-500/5 blur-[150px] -z-10 rounded-full"></div>

      {/* HEADER */}
      <header className="bg-[#020617]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-[60] px-4 md:px-8 h-16 md:h-20 flex items-center justify-between">
        <div className="flex items-center gap-3 md:gap-5">
          <div className="w-10 h-10 md:w-14 md:h-14 bg-slate-900 rounded-xl flex items-center justify-center border border-white/10 tire-3d shadow-lg">
            <Disc className="text-sky-400 animate-spin-slow" size={20} />
          </div>
          <div>
            <h1 className="text-xs md:text-sm font-black uppercase tracking-widest text-white leading-none">Karya <span className="text-sky-400">Makmur</span></h1>
            <p className="text-[8px] md:text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Lampung Timur</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          {isAdminMode && (
            <button 
              onClick={openAddModal}
              className="flex items-center gap-2 px-3 md:px-5 py-2 md:py-3 bg-white text-slate-950 rounded-xl font-black uppercase text-[9px] md:text-[10px] tracking-widest hover:bg-sky-500 hover:text-white transition-all shadow-xl active:scale-95"
            >
              <Plus size={14} /> <span className="hidden xs:block">Tambah</span>
            </button>
          )}
          
          <button 
            onClick={() => isAuthenticated ? setIsAdminMode(!isAdminMode) : setShowLoginModal(true)} 
            className={`flex items-center gap-2 px-3 md:px-5 py-2 md:py-3 rounded-xl transition-all border ${isAdminMode ? 'bg-sky-500 border-sky-400 text-white' : 'bg-slate-900/40 border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/20'}`}
          >
            {isAdminMode ? <Unlock size={14} /> : <Lock size={14} />}
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest hidden sm:block">{isAdminMode ? 'Mode Admin' : 'Login Admin'}</span>
          </button>
          
          <button onClick={loadData} disabled={loading} className="p-2 md:p-3.5 bg-slate-900/50 border border-white/5 rounded-xl text-slate-400 hover:text-sky-400 transition-all active:scale-95">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* FLOATING ACTION BUTTON FOR ADMIN ON MOBILE */}
      {isAdminMode && (
        <button 
          onClick={openAddModal}
          className="md:hidden fixed bottom-6 right-6 z-[70] w-14 h-14 bg-sky-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-sky-500/40 active:scale-90 transition-transform"
        >
          <Plus size={28} />
        </button>
      )}

      <main className="max-w-[1400px] mx-auto px-4 md:px-8 py-8 md:py-12 pb-32">
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 md:gap-12">
          
          <div className="lg:col-span-8 space-y-8 md:space-y-12">
            
            {/* WORKSHOP CARD */}
            <section className="glass-card rounded-[2.5rem] p-6 md:p-10 flex flex-col md:grid md:grid-cols-10 gap-8 items-center border border-white/10 relative overflow-hidden">
              <div className="w-full md:col-span-4 aspect-video md:aspect-square bg-slate-900 rounded-[2rem] overflow-hidden border border-white/10 shadow-xl map-container">
                <iframe 
                  src={`https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3971.258848419619!2d${SHOP_LNG}!3d${SHOP_LAT}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNcKwMjUnMTMuMSJTIDEwNcKwNDgnMDYuOCJF!5e0!3m2!1sen!2sid!4v1711234567890!5m2!1sen!2sid`}
                  width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy"
                ></iframe>
              </div>
              <div className="md:col-span-6 space-y-6 w-full text-center md:text-left">
                 <div>
                   <h2 className="text-xl md:text-2xl font-black uppercase tracking-widest text-white">Bengkel Utama</h2>
                   <p className="text-slate-500 text-[11px] md:text-xs mt-3 leading-relaxed font-medium uppercase tracking-wider">{SHOP_ADDR}</p>
                 </div>
                 <div className="flex flex-wrap justify-center md:justify-start gap-3">
                   <div className="flex items-center gap-2 bg-slate-900/50 px-4 py-2.5 rounded-xl border border-white/5">
                     <Clock className="text-sky-500" size={14} />
                     <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">08:00 - 18:00</span>
                   </div>
                   <button 
                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${SHOP_LAT},${SHOP_LNG}`, '_blank')}
                    className="flex items-center gap-2 bg-sky-500 text-white px-5 py-2.5 rounded-xl font-black uppercase text-[9px] tracking-widest shadow-lg shadow-sky-500/20 active:scale-95 transition-all"
                   >
                     Navigasi <Navigation size={14} />
                   </button>
                 </div>
              </div>
            </section>

            {/* CATALOG ACTIONS */}
            <section className="space-y-6">
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 px-1">
                {['Semua', 'Ban', 'Velg'].map(cat => (
                  <button 
                    key={cat} onClick={() => setActiveCategory(cat)}
                    className={`px-6 md:px-10 py-3.5 md:py-4 rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border-2 ${activeCategory === cat ? 'bg-sky-500 text-white border-sky-400 shadow-xl shadow-sky-500/20' : 'bg-slate-900/60 border-white/5 text-slate-500 hover:text-slate-300'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-sky-500 transition-all" size={20} />
                <input 
                  type="text" placeholder="Cari merk, ukuran, atau ring ban..."
                  className="w-full pl-16 pr-6 py-5 md:py-6 bg-slate-900/40 border-2 border-white/5 rounded-[2rem] font-bold text-xs md:text-sm text-white focus:border-sky-500/50 transition-all outline-none placeholder:text-slate-800"
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </section>

            {/* PRODUCT GROUPS */}
            <section className="space-y-6 md:space-y-8">
              {Object.entries(groupedByBrand).map(([name, items]) => (
                <div key={name} className="glass-card rounded-[2.5rem] border border-white/5 overflow-hidden transition-all duration-500 group">
                  <button 
                    onClick={() => {
                      const next = new Set(expandedBrands);
                      next.has(name) ? next.delete(name) : next.add(name);
                      setExpandedBrands(next);
                    }}
                    className="w-full p-6 md:p-8 flex items-center justify-between hover:bg-white/[0.02] transition-all"
                  >
                    <div className="flex items-center gap-4 md:gap-6">
                      <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-900 rounded-2xl flex items-center justify-center p-2.5 border border-white/5 tire-3d">
                        <img 
                          src={`https://www.google.com/s2/favicons?domain=${name.toLowerCase()}.com&sz=128`} 
                          className="w-full h-full object-contain grayscale invert opacity-30 group-hover:opacity-100 transition-all"
                          onError={(e)=>(e.target as any).src="https://ui-avatars.com/api/?background=0f172a&color=38bdf8&bold=true&name="+name}
                        />
                      </div>
                      <div className="text-left">
                        <h3 className="font-black uppercase text-sm md:text-lg tracking-widest text-white">{name}</h3>
                        <p className="text-[8px] md:text-[9px] font-bold text-sky-500 uppercase tracking-[0.2em] mt-1">{items.length} Variasi Tersedia</p>
                      </div>
                    </div>
                    <ChevronDown size={24} className={`text-slate-700 transition-transform duration-500 ${expandedBrands.has(name) ? 'rotate-180 text-sky-400' : ''}`} />
                  </button>
                  
                  {expandedBrands.has(name) && (
                    <div className="p-4 md:p-8 grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 bg-slate-950/30 border-t border-white/5 animate-in slide-in-from-top-4">
                      {items.map(p => (
                        <div key={p.id} className="bg-slate-900/60 p-5 md:p-6 rounded-[2rem] border border-white/5 flex flex-col gap-5 hover:border-sky-500/30 transition-all group/card relative overflow-hidden">
                          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950">
                             <img src={p.image} className="w-full h-full object-cover group-hover/card:scale-105 transition-all duration-700" />
                             
                             {/* STATUS BADGE */}
                             <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 z-10 flex items-center gap-1.5">
                               <span className={`w-1.5 h-1.5 rounded-full ${p.stock > 0 ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-rose-500'}`}></span>
                               <span className="text-[8px] md:text-[9px] font-black uppercase text-white">{p.stock} Unit</span>
                             </div>

                             {/* ADMIN CONTROLS OVERLAY */}
                             {isAdminMode && (
                               <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover/card:opacity-100 transition-all flex items-center justify-center gap-3 z-20">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); openEditModal(p); }} 
                                    className="p-4 bg-sky-500 text-white rounded-2xl shadow-xl active:scale-90 hover:bg-sky-400 transition-colors"
                                    title="Edit Produk"
                                  >
                                    <Edit3 size={20}/>
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleDelete(p.nomor); }} 
                                    className="p-4 bg-rose-500 text-white rounded-2xl shadow-xl active:scale-90 hover:bg-rose-400 transition-colors"
                                    title="Hapus Produk"
                                  >
                                    <Trash2 size={20}/>
                                  </button>
                               </div>
                             )}

                             {/* MOBILE ADMIN QUICK ACTION TRIGGER */}
                             {isAdminMode && (
                               <div className="md:hidden absolute bottom-3 left-3 z-30">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); openEditModal(p); }}
                                    className="p-2 bg-white/20 backdrop-blur-xl border border-white/20 text-white rounded-lg active:scale-90"
                                  >
                                    <Settings size={16}/>
                                  </button>
                               </div>
                             )}
                          </div>
                          <div className="px-2">
                             <div className="flex justify-between items-start">
                                <h4 className="font-black text-xs md:text-sm uppercase text-white truncate tracking-wider">{p.code}</h4>
                                <span className="text-[8px] font-black text-sky-400 bg-sky-500/10 px-2 py-1 rounded-md border border-sky-500/20">RING {p.ring}</span>
                             </div>
                             <p className="text-[9px] font-bold text-slate-500 uppercase mt-2">UKURAN: {p.size}</p>
                          </div>
                          <button 
                            onClick={() => { setSelectedProductForSale(p); setShowSaleModal(true); }} 
                            className="w-full py-3.5 bg-white text-slate-950 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-sky-500 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2"
                           >
                             Detail & Pesan <ArrowRight size={14}/>
                           </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </section>
          </div>

          {/* AI SIDEBAR */}
          <div className="lg:col-span-4 h-[500px] lg:h-[calc(100vh-160px)] lg:sticky lg:top-24">
            <div className="glass-card rounded-[2.5rem] h-full flex flex-col overflow-hidden border border-white/10 shadow-2xl">
              <div className="p-6 md:p-8 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 flex items-center gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-sky-500/10 rounded-xl flex items-center justify-center border border-sky-500/20">
                  <Sparkles className="text-sky-400" size={20} />
                </div>
                <div>
                  <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest block text-white">AI Specialist</span>
                  <span className="text-[8px] md:text-[9px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Cloud Inventory Sync
                  </span>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-900/10 custom-scrollbar">
                {chatMessages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[90%] p-4 md:p-5 rounded-2xl text-[11px] md:text-[12px] font-medium leading-relaxed border ${m.role === 'user' ? 'bg-sky-600 text-white border-sky-500 shadow-lg' : 'bg-slate-900 text-slate-300 border-white/5'}`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {isChatting && (
                  <div className="flex gap-2 p-4 items-center animate-pulse">
                    <div className="w-1.5 h-1.5 bg-sky-500 rounded-full"></div>
                    <div className="w-1.5 h-1.5 bg-sky-500 rounded-full delay-75"></div>
                    <div className="w-1.5 h-1.5 bg-sky-500 rounded-full delay-150"></div>
                  </div>
                )}
              </div>

              <div className="p-6 md:p-8 bg-slate-950/80 border-t border-white/5">
                <div className="relative">
                  <input 
                    type="text" placeholder="Tanya stok ban..." 
                    className="w-full pl-6 pr-14 py-4 md:py-5 bg-slate-900/50 border-2 border-white/5 rounded-2xl font-bold text-xs text-white outline-none focus:border-sky-500/30 transition-all placeholder:text-slate-800"
                    value={userInput} onChange={e => setUserInput(e.target.value)} onKeyPress={e => e.key==='Enter'&&handleSendMessage()}
                  />
                  <button onClick={handleSendMessage} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-3 bg-sky-500 text-white rounded-xl hover:bg-sky-600 transition-all active:scale-90 shadow-lg">
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* LOGIN MODAL */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="glass-card w-full max-w-sm rounded-[2.5rem] p-8 md:p-10 text-center space-y-8 border border-white/10 shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-sky-500/10 text-sky-500 rounded-2xl mx-auto flex items-center justify-center tire-3d shadow-xl border border-sky-500/20">
              <Lock size={30} />
            </div>
            <div className="space-y-2">
              <h3 className="font-black uppercase text-xs md:text-sm tracking-[0.3em] text-white">Otorisasi Admin</h3>
              <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Akses Database Karya Makmur</p>
            </div>
            <form onSubmit={handleAdminAuth} className="space-y-5">
              <input 
                type="password" autoFocus placeholder="Password"
                className={`w-full p-4 md:p-5 bg-slate-950 rounded-2xl border-2 text-center font-black text-white outline-none transition-all placeholder:text-slate-900 ${loginError ? 'border-rose-500' : 'border-white/5 focus:border-sky-500'}`}
                value={passwordInput} onChange={e => setPasswordInput(e.target.value)}
              />
              <button type="submit" className="w-full py-4 bg-sky-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl active:scale-95 hover:bg-sky-400 transition-colors">Buka Database</button>
              <button type="button" onClick={()=>setShowLoginModal(false)} className="w-full py-1 text-[9px] font-black uppercase text-slate-700 hover:text-slate-500 transition-colors">Batal</button>
            </form>
          </div>
        </div>
      )}

      {/* ADD/EDIT MODAL */}
      {showFormModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md overflow-y-auto">
          <div className="glass-card w-full max-w-2xl rounded-[3rem] my-auto border border-white/10 overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10">
            <div className="p-8 bg-slate-950/80 border-b border-white/5 flex justify-between items-center">
              <div>
                <h3 className="font-black text-sm md:text-base uppercase tracking-widest text-white">{editingProduct ? 'Edit Data Ban' : 'Tambah Ban Baru'}</h3>
                <p className="text-[10px] font-bold text-sky-500 uppercase mt-1 tracking-widest">Update Cloud Inventory</p>
              </div>
              <button onClick={()=>setShowFormModal(false)} className="w-10 h-10 bg-slate-900 text-slate-500 hover:text-white rounded-xl border border-white/5 flex items-center justify-center transition-all"><X size={20}/></button>
            </div>
            <form onSubmit={async (e) => { e.preventDefault(); setActionLoading(true); const s = editingProduct ? await editProductInSheet(scriptUrl, {...formData, nomor: editingProduct.nomor}) : await addProductToSheet(scriptUrl, formData); if(s) { alert('Sinkronisasi Cloud Berhasil!'); setShowFormModal(false); loadData(); } setActionLoading(false); }} className="p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Merk</label>
                  <input required placeholder="GT Radial, Bridgestone..." className="w-full p-4 bg-slate-950 border border-white/5 rounded-xl font-bold text-xs text-white focus:border-sky-500 outline-none transition-all shadow-inner" value={formData.brand} onChange={e=>setFormData({...formData, brand: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Kode/Model</label>
                  <input required placeholder="Eco, Sport, Chambers..." className="w-full p-4 bg-slate-950 border border-white/5 rounded-xl font-bold text-xs text-white focus:border-sky-500 outline-none transition-all shadow-inner" value={formData.code} onChange={e=>setFormData({...formData, code: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Ukuran Ban</label>
                  <input placeholder="185/65 R15..." className="w-full p-4 bg-slate-950 border border-white/5 rounded-xl font-bold text-xs text-white focus:border-sky-500 outline-none transition-all shadow-inner" value={formData.size} onChange={e=>setFormData({...formData, size: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Ring</label>
                  <input placeholder="15, 16, 17..." className="w-full p-4 bg-slate-950 border border-white/5 rounded-xl font-bold text-xs text-white focus:border-sky-500 outline-none transition-all shadow-inner" value={formData.ring} onChange={e=>setFormData({...formData, ring: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Stok Ready</label>
                  <input type="number" className="w-full p-4 bg-slate-950 border border-white/5 rounded-xl font-bold text-xs text-white focus:border-sky-500 outline-none transition-all shadow-inner" value={formData.stock} onChange={e=>setFormData({...formData, stock: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest">URL Gambar (Opsional)</label>
                  <input placeholder="https://..." className="w-full p-4 bg-slate-950 border border-white/5 rounded-xl font-bold text-xs text-white focus:border-sky-500 outline-none transition-all shadow-inner" value={formData.image} onChange={e=>setFormData({...formData, image: e.target.value})} />
                </div>
              </div>
              <button disabled={actionLoading} type="submit" className="w-full py-5 bg-sky-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-sky-500/10 hover:bg-sky-400 active:scale-95 transition-all flex items-center justify-center gap-3">
                {actionLoading ? <RefreshCw className="animate-spin" size={18}/> : <Database size={18}/>}
                {actionLoading ? 'Menyimpan...' : 'Simpan Perubahan Cloud'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showSaleModal && selectedProductForSale && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in zoom-in-95">
          <div className="glass-card w-full max-w-md rounded-[3rem] p-8 md:p-10 space-y-8 md:space-y-10 border border-white/10 shadow-2xl relative">
            <button onClick={()=>setShowSaleModal(false)} className="absolute top-6 right-6 text-slate-700 hover:text-white transition-colors"><X size={24}/></button>
            
            <div className="text-center space-y-4">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-sky-500/5 text-sky-400 rounded-3xl flex items-center justify-center mx-auto border border-white/5 shadow-inner tire-3d">
                <Disc size={40} className="animate-spin-slow" />
              </div>
              <div>
                <h3 className="font-black text-lg md:text-xl uppercase text-white tracking-widest">{selectedProductForSale.brand}</h3>
                <p className="text-[10px] md:text-[11px] text-slate-500 font-bold uppercase mt-1">{selectedProductForSale.code} • {selectedProductForSale.size}</p>
              </div>
            </div>
            
            <div className="bg-slate-950/50 border border-white/5 p-6 md:p-8 rounded-[2rem] text-center shadow-inner">
              <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest block mb-6">Pilih Jumlah</label>
              <div className="flex items-center justify-center gap-8">
                <button onClick={()=>setSaleQty(Math.max(1, saleQty-1))} className="text-white text-2xl md:text-3xl font-black w-12 h-12 flex items-center justify-center active:scale-90 hover:text-sky-400">-</button>
                <span className="text-4xl md:text-5xl font-black text-white w-20">{saleQty}</span>
                <button onClick={()=>setSaleQty(Math.min(selectedProductForSale.stock, saleQty+1))} className="text-white text-2xl md:text-3xl font-black w-12 h-12 flex items-center justify-center active:scale-90 hover:text-sky-400">+</button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  const text = `Halo Karya Makmur, saya ingin pesan ban ${selectedProductForSale.brand} ${selectedProductForSale.code} ukuran ${selectedProductForSale.size} sebanyak ${saleQty} unit. Mohon info ketersediaan & harganya. Terima kasih!`;
                  window.open(`https://wa.me/62${SHOP_WA.substring(1)}?text=${encodeURIComponent(text)}`, '_blank');
                }}
                className="w-full py-4 md:py-5 bg-emerald-500 text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest hover:bg-emerald-600 shadow-xl shadow-emerald-500/10 flex items-center justify-center gap-3 active:scale-95 transition-all"
              >
                Pesan via WhatsApp <Phone size={18}/>
              </button>
              <button 
                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${SHOP_LAT},${SHOP_LNG}`, '_blank')}
                className="w-full py-4 bg-sky-500 text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest hover:bg-sky-600 flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg"
              >
                Petunjuk Arah <MapIcon size={18}/>
              </button>
              
              {/* ADMIN ONLY SALE RECORDING */}
              {isAdminMode && (
                <button 
                  onClick={async () => {
                    setActionLoading(true);
                    const success = await recordSaleToSheet(scriptUrl, selectedProductForSale, saleQty);
                    if (success) {
                      alert('Penjualan dicatat.');
                      setShowSaleModal(false);
                      loadData();
                    }
                    setActionLoading(false);
                  }}
                  disabled={actionLoading}
                  className="w-full py-4 bg-slate-800 text-slate-300 rounded-[1.5rem] text-[9px] font-black uppercase tracking-widest border border-white/5 active:scale-95 transition-all mt-2"
                >
                  {actionLoading ? 'Mencatat...' : 'Catat Penjualan Toko (Admin)'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="py-20 opacity-30 flex flex-col items-center gap-6">
        <div className="flex items-center gap-4">
          <Disc size={20} className="text-sky-500 animate-spin-slow" />
          <p className="text-[10px] md:text-[12px] font-black uppercase tracking-[1em] text-white">Karya Makmur</p>
        </div>
        <div className="flex gap-6 text-[8px] font-black uppercase tracking-widest text-slate-600">
           <span>Premium Tire Solution</span>
           <span>•</span>
           <span>Lampung Timur</span>
           <span>•</span>
           <span>Managed Cloud</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
