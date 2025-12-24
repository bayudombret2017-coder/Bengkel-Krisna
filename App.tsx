
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ShoppingCart, MessageSquare, Send, Package, 
  Search, RefreshCw, Edit3, Trash2, 
  X, Lock, Unlock, Image as ImageIcon, TrendingUp, 
  ChevronDown, MapPin, Clock, Navigation, Disc, ClipboardList, Timer,
  Menu, ChevronRight, Sparkles, LayoutDashboard, Database, Activity, ArrowRight, Layers,
  Info, Plus, Map as MapIcon, ExternalLink, Phone, Settings
} from 'lucide-react';
import { Product, ChatMessage } from './types.ts';
import { fetchProductsFromScript, addProductToSheet, editProductInSheet, deleteProductFromSheet, recordSaleToSheet, logRequestToSheet } from './services/googleSheetService.ts';
import { getGeminiResponse } from './services/geminiService.ts';

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
  
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);

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
        </div>
        <h1 className="text-3xl font-black text-white tracking-[0.3em] uppercase mb-4">
          KARYA <span className="text-sky-500">MAKMUR</span>
        </h1>
        <div className="w-48 h-1 bg-slate-900 rounded-full overflow-hidden relative">
          <div className="h-full bg-sky-500 animate-[loading_2s_ease-in-out_infinite]"></div>
        </div>
        <style>{`@keyframes loading { 0% { width: 0%; transform: translateX(-100%); } 50% { width: 70%; } 100% { width: 0%; transform: translateX(250%); } }`}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200">
      <header className="bg-[#020617]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-[60] px-4 md:px-8 h-16 md:h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center border border-white/10 tire-3d">
            <Disc className="text-sky-400 animate-spin-slow" size={20} />
          </div>
          <div>
            <h1 className="text-xs font-black uppercase tracking-widest text-white leading-none">Karya <span className="text-sky-400">Makmur</span></h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isAdminMode && (
            <button onClick={openAddModal} className="px-3 py-2 bg-white text-slate-950 rounded-xl font-black uppercase text-[9px] tracking-widest shadow-xl active:scale-95">
              <Plus size={14} />
            </button>
          )}
          <button 
            onClick={() => isAuthenticated ? setIsAdminMode(!isAdminMode) : setShowLoginModal(true)} 
            className={`px-3 py-2 rounded-xl border transition-all ${isAdminMode ? 'bg-sky-500 border-sky-400 text-white' : 'bg-slate-900/40 border-white/5 text-slate-400'}`}
          >
            {isAdminMode ? <Unlock size={14} /> : <Lock size={14} />}
          </button>
          <button onClick={loadData} disabled={loading} className="p-2 bg-slate-900/50 border border-white/5 rounded-xl text-slate-400">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
             {/* Catalog & Products Logic remains same */}
             <section className="glass-card rounded-[2.5rem] p-6 border border-white/10 flex flex-col md:flex-row gap-6 items-center">
                <div className="w-full md:w-48 aspect-square bg-slate-900 rounded-3xl overflow-hidden map-container">
                  <iframe src={`https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3971.258848419619!2d${SHOP_LNG}!3d${SHOP_LAT}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNcKwMjUnMTMuMSJTIDEwNcKwNDgnMDYuOCJF!5e0!3m2!1sen!2sid!4v1711234567890!5m2!1sen!2sid`} width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy"></iframe>
                </div>
                <div className="flex-1 text-center md:text-left space-y-4">
                  <h2 className="text-xl font-black uppercase tracking-widest text-white">Workshop Karya Makmur</h2>
                  <p className="text-slate-500 text-xs uppercase leading-relaxed">{SHOP_ADDR}</p>
                  <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${SHOP_LAT},${SHOP_LNG}`, '_blank')} className="px-6 py-2.5 bg-sky-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest">Petunjuk Jalan</button>
                </div>
             </section>

             <section className="space-y-6">
                <div className="relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-700" size={18} />
                  <input type="text" placeholder="Cari merk atau ukuran..." className="w-full pl-14 pr-6 py-5 bg-slate-900/40 border border-white/5 rounded-2xl font-bold text-xs text-white outline-none focus:border-sky-500/50" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                
                {Object.entries(groupedByBrand).map(([name, items]) => (
                  <div key={name} className="glass-card rounded-[2rem] border border-white/5 overflow-hidden">
                    <button onClick={() => { const next = new Set(expandedBrands); next.has(name) ? next.delete(name) : next.add(name); setExpandedBrands(next); }} className="w-full p-6 flex items-center justify-between">
                      <h3 className="font-black uppercase text-sm tracking-widest text-white">{name}</h3>
                      <ChevronDown size={20} className={`text-slate-700 transition-transform ${expandedBrands.has(name) ? 'rotate-180 text-sky-400' : ''}`} />
                    </button>
                    {expandedBrands.has(name) && (
                      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/5">
                        {items.map(p => (
                          <div key={p.id} className="bg-slate-900/60 p-4 rounded-2xl border border-white/5 space-y-4 group">
                            <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-black">
                               <img src={p.image} className="w-full h-full object-cover" />
                               {isAdminMode && (
                                 <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                    <button onClick={() => openEditModal(p)} className="p-2 bg-sky-500 text-white rounded-lg"><Edit3 size={16}/></button>
                                    <button onClick={() => handleDelete(p.nomor)} className="p-2 bg-rose-500 text-white rounded-lg"><Trash2 size={16}/></button>
                                 </div>
                               )}
                            </div>
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-black text-xs uppercase text-white">{p.code}</h4>
                                <p className="text-[10px] text-slate-500 mt-1">{p.size} • R{p.ring}</p>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] font-black text-sky-400 bg-sky-500/10 px-2 py-1 rounded-lg">Stok: {p.stock}</span>
                              </div>
                            </div>
                            <button onClick={() => { setSelectedProductForSale(p); setShowSaleModal(true); }} className="w-full py-2.5 bg-white text-slate-950 rounded-xl font-black uppercase text-[9px] tracking-widest active:scale-95 transition-all">Detail</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
             </section>
          </div>

          <div className="lg:col-span-4 lg:sticky lg:top-24 h-[500px]">
            <div className="glass-card rounded-[2.5rem] h-full flex flex-col overflow-hidden border border-white/10">
              <div className="p-6 bg-slate-950/80 border-b border-white/5 flex items-center gap-3">
                <Sparkles className="text-sky-400" size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest text-white">Asisten AI</span>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar text-[11px]">
                {chatMessages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-4 rounded-2xl border ${m.role === 'user' ? 'bg-sky-600 border-sky-500 text-white' : 'bg-slate-900 text-slate-300 border-white/5'}`}>
                      {m.content}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-6 bg-slate-950/80 border-t border-white/5 flex gap-2">
                <input type="text" placeholder="Tanya stok..." className="flex-1 bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none" value={userInput} onChange={e => setUserInput(e.target.value)} onKeyPress={e => e.key==='Enter'&&handleSendMessage()} />
                <button onClick={handleSendMessage} className="p-3 bg-sky-500 text-white rounded-xl active:scale-95"><Send size={16}/></button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modals are unchanged but included for completeness in functionality */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="glass-card w-full max-w-sm rounded-[2.5rem] p-8 text-center space-y-6">
            <h3 className="font-black uppercase text-xs tracking-widest text-white">Login Admin</h3>
            <input type="password" placeholder="Password" className="w-full p-4 bg-slate-950 rounded-xl border border-white/10 text-center text-white outline-none focus:border-sky-500" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} />
            <div className="flex flex-col gap-2">
              <button onClick={handleAdminAuth} className="w-full py-4 bg-sky-500 text-white rounded-xl font-black uppercase text-[10px]">Masuk</button>
              <button onClick={()=>setShowLoginModal(false)} className="text-[10px] text-slate-600 uppercase font-black">Batal</button>
            </div>
          </div>
        </div>
      )}

      {showSaleModal && selectedProductForSale && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md rounded-[2.5rem] p-8 space-y-8 relative">
            <button onClick={()=>setShowSaleModal(false)} className="absolute top-6 right-6 text-slate-600"><X size={20}/></button>
            <div className="text-center">
              <h3 className="font-black text-lg uppercase text-white">{selectedProductForSale.brand}</h3>
              <p className="text-[10px] text-slate-500 mt-1">{selectedProductForSale.code} • {selectedProductForSale.size}</p>
            </div>
            <div className="bg-slate-950 p-6 rounded-2xl flex items-center justify-around border border-white/5">
              <button onClick={()=>setSaleQty(Math.max(1, saleQty-1))} className="text-2xl font-black text-sky-500">-</button>
              <span className="text-4xl font-black text-white">{saleQty}</span>
              <button onClick={()=>setSaleQty(Math.min(selectedProductForSale.stock, saleQty+1))} className="text-2xl font-black text-sky-500">+</button>
            </div>
            <button onClick={() => window.open(`https://wa.me/62${SHOP_WA.substring(1)}?text=${encodeURIComponent(`Halo, saya ingin pesan ${selectedProductForSale.brand} ${selectedProductForSale.code} sebanyak ${saleQty} unit.`)}`, '_blank')} className="w-full py-4 bg-emerald-500 text-white rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-2">Pesan via WA <Phone size={16}/></button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
