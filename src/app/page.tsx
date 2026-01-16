'use client';

import { useState, useEffect } from 'react';
import { auth, googleProvider } from '@/lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import Image from 'next/image';
import { FcGoogle } from 'react-icons/fc';
import { FiPlus, FiRefreshCw, FiTrash2, FiLogOut, FiCopy, FiKey, FiCheck, FiEye, FiEyeOff } from 'react-icons/fi';
import { BsWhatsapp, BsQrCode } from 'react-icons/bs';

interface Instance {
  instanceId: string;
  connected: boolean;
  state: string;
  user: {
    id?: string;
    name?: string;
    phone?: string;
  } | null;
  reconnectAttempts: number;
  webhooksCount: number;
}

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed?: string;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [newInstanceName, setNewInstanceName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'instances' | 'apikeys'>('instances');
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [showApiKey, setShowApiKey] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://kesher-production.up.railway.app';
  const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'kesher-api-2026-d4f8a7b3e9c1';

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      if (user) {
        loadApiKeys();
      }
    });
    return () => unsubscribe();
  }, []);

  // Load instances
  useEffect(() => {
    if (user) {
      loadInstances();
      const interval = setInterval(loadInstances, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadInstances = async () => {
    try {
      const response = await fetch(`${API_URL}/api/instances`, {
        headers: { 'X-API-Key': API_KEY },
      });
      const data = await response.json();
      if (data.success) {
        setInstances(data.instances || []);
      }
    } catch (error) {
      console.error('Erro ao carregar instâncias:', error);
    }
  };

  const loadApiKeys = () => {
    // Carregar do localStorage (em produção seria do Firestore)
    const saved = localStorage.getItem('kesher-api-keys');
    if (saved) {
      setApiKeys(JSON.parse(saved));
    } else {
      // Chave padrão
      const defaultKeys: ApiKey[] = [
        {
          id: 'default',
          name: 'Chave Principal',
          key: API_KEY,
          createdAt: new Date().toISOString(),
        }
      ];
      setApiKeys(defaultKeys);
      localStorage.setItem('kesher-api-keys', JSON.stringify(defaultKeys));
    }
  };

  const generateApiKey = () => {
    if (!newKeyName.trim()) return;
    
    const newKey: ApiKey = {
      id: `key-${Date.now()}`,
      name: newKeyName,
      key: `kesher-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`,
      createdAt: new Date().toISOString(),
    };
    
    const updated = [...apiKeys, newKey];
    setApiKeys(updated);
    localStorage.setItem('kesher-api-keys', JSON.stringify(updated));
    setNewKeyName('');
  };

  const deleteApiKey = (id: string) => {
    if (id === 'default') {
      alert('Não é possível remover a chave principal');
      return;
    }
    if (!confirm('Tem certeza que deseja remover esta chave?')) return;
    
    const updated = apiKeys.filter(k => k.id !== id);
    setApiKeys(updated);
    localStorage.setItem('kesher-api-keys', JSON.stringify(updated));
  };

  const copyToClipboard = async (text: string, keyId: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Erro no login:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setInstances([]);
    } catch (error) {
      console.error('Erro no logout:', error);
    }
  };

  const createInstance = async () => {
    if (!newInstanceName.trim()) return;
    setIsCreating(true);
    try {
      const response = await fetch(`${API_URL}/api/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify({ instanceName: newInstanceName }),
      });
      const data = await response.json();
      if (data.success) {
        setNewInstanceName('');
        loadInstances();
        setSelectedInstance(data.instanceId);
        setTimeout(() => getQRCode(data.instanceId), 2000);
      }
    } catch (error) {
      console.error('Erro ao criar instância:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const getQRCode = async (instanceId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/instance/${instanceId}/qrcode`, {
        headers: { 'X-API-Key': API_KEY },
      });
      const data = await response.json();
      if (data.success && data.qrBase64) {
        setQrCode(data.qrBase64);
      } else {
        setQrCode(null);
      }
    } catch (error) {
      console.error('Erro ao obter QR Code:', error);
      setQrCode(null);
    }
  };

  const deleteInstance = async (instanceId: string) => {
    if (!confirm(`Tem certeza que deseja remover "${instanceId}"?`)) return;
    try {
      await fetch(`${API_URL}/api/instance/${instanceId}?clearSession=true`, {
        method: 'DELETE',
        headers: { 'X-API-Key': API_KEY },
      });
      loadInstances();
      if (selectedInstance === instanceId) {
        setSelectedInstance(null);
        setQrCode(null);
      }
    } catch (error) {
      console.error('Erro ao deletar instância:', error);
    }
  };

  const resetInstance = async (instanceId: string) => {
    try {
      await fetch(`${API_URL}/api/instance/${instanceId}/reset`, {
        method: 'POST',
        headers: { 'X-API-Key': API_KEY },
      });
      setTimeout(() => getQRCode(instanceId), 3000);
    } catch (error) {
      console.error('Erro ao resetar instância:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="glass-card p-8 max-w-md w-full text-center animate-fadeIn">
          <Image src="/logo.png" alt="Kesher" width={200} height={200} className="mx-auto mb-8" />
          <h1 className="text-3xl font-bold mb-2">קֶשֶׁר</h1>
          <p className="text-gray-400 mb-8">Sua conexão WhatsApp poderosa</p>
          <button onClick={handleGoogleLogin} className="btn-secondary w-full flex items-center justify-center gap-3">
            <FcGoogle className="text-2xl" />
            Entrar com Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Image src="/logo.png" alt="Kesher" width={50} height={50} />
          <div>
            <h1 className="text-xl font-bold">Kesher Dashboard</h1>
            <p className="text-sm text-gray-400">קֶשֶׁר - Conexão</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400 hidden md:block">{user.email}</span>
          <button onClick={handleLogout} className="btn-secondary py-2 px-4">
            <FiLogOut />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('instances')}
          className={`px-4 py-2 rounded-xl transition ${
            activeTab === 'instances' ? 'bg-violet-600 text-white' : 'bg-white/10 hover:bg-white/20'
          }`}
        >
          <BsWhatsapp className="inline mr-2" /> Instâncias
        </button>
        <button
          onClick={() => setActiveTab('apikeys')}
          className={`px-4 py-2 rounded-xl transition ${
            activeTab === 'apikeys' ? 'bg-violet-600 text-white' : 'bg-white/10 hover:bg-white/20'
          }`}
        >
          <FiKey className="inline mr-2" /> Chaves de API
        </button>
      </div>

      {activeTab === 'instances' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Instances list */}
          <div className="lg:col-span-2 space-y-4">
            <div className="glass-card p-4">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FiPlus /> Nova Instância
              </h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newInstanceName}
                  onChange={(e) => setNewInstanceName(e.target.value)}
                  placeholder="Nome da instância..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-violet-500"
                />
                <button
                  onClick={createInstance}
                  disabled={isCreating || !newInstanceName.trim()}
                  className="btn-primary disabled:opacity-50"
                >
                  {isCreating ? 'Criando...' : 'Criar'}
                </button>
              </div>
            </div>

            <div className="glass-card p-4">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BsWhatsapp className="text-green-500" /> Instâncias ({instances.length})
              </h2>
              {instances.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Nenhuma instância criada ainda</p>
              ) : (
                <div className="space-y-3">
                  {instances.map((instance) => (
                    <div
                      key={instance.instanceId}
                      onClick={() => {
                        setSelectedInstance(instance.instanceId);
                        if (!instance.connected) getQRCode(instance.instanceId);
                        else setQrCode(null);
                      }}
                      className={`p-4 rounded-xl cursor-pointer transition-all ${
                        selectedInstance === instance.instanceId
                          ? 'bg-violet-600/20 border border-violet-500'
                          : 'bg-white/5 hover:bg-white/10 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${instance.connected ? 'bg-green-500' : 'bg-yellow-500'}`} />
                          <div>
                            <p className="font-medium">{instance.instanceId}</p>
                            <p className="text-sm text-gray-400">
                              {instance.connected ? instance.user?.phone || 'Conectado' : instance.state === 'qr_ready' ? 'Aguardando scan' : 'Desconectado'}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={(e) => { e.stopPropagation(); resetInstance(instance.instanceId); }} className="p-2 hover:bg-white/10 rounded-lg" title="Resetar">
                            <FiRefreshCw />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); deleteInstance(instance.instanceId); }} className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg" title="Remover">
                            <FiTrash2 />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* QR Code */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BsQrCode /> QR Code
            </h2>
            {selectedInstance ? (
              <div className="text-center">
                <p className="text-sm text-gray-400 mb-4">
                  Instância: <span className="text-white font-medium">{selectedInstance}</span>
                </p>
                {qrCode ? (
                  <div className="animate-fadeIn">
                    <div className="qr-container inline-block animate-pulse-glow">
                      <img src={qrCode} alt="QR Code" className="w-64 h-64" />
                    </div>
                    <p className="text-sm text-gray-400 mt-4">Escaneie com seu WhatsApp</p>
                  </div>
                ) : (
                  <div className="py-12">
                    <BsWhatsapp className="text-6xl text-green-500 mx-auto mb-4" />
                    <p className="text-gray-400">
                      {instances.find((i) => i.instanceId === selectedInstance)?.connected ? 'Conectado!' : 'Aguardando QR...'}
                    </p>
                    <button onClick={() => getQRCode(selectedInstance)} className="btn-secondary mt-4">
                      <FiRefreshCw /> Atualizar
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <BsQrCode className="text-6xl mx-auto mb-4 opacity-50" />
                <p>Selecione uma instância</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* API Keys Tab */
        <div className="max-w-4xl">
          <div className="glass-card p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FiPlus /> Criar Nova Chave
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Nome da chave (ex: NutriBuddy, Meu App...)"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-violet-500"
              />
              <button onClick={generateApiKey} disabled={!newKeyName.trim()} className="btn-primary disabled:opacity-50">
                Gerar Chave
              </button>
            </div>
          </div>

          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FiKey /> Suas Chaves de API ({apiKeys.length})
            </h2>
            
            {/* Info box */}
            <div className="bg-violet-600/20 border border-violet-500/30 rounded-xl p-4 mb-6">
              <p className="text-sm">
                <strong>Como usar:</strong> Adicione o header <code className="bg-black/30 px-2 py-1 rounded">X-API-Key: SUA_CHAVE</code> em todas as requisições para a API.
              </p>
              <p className="text-sm mt-2">
                <strong>URL da API:</strong> <code className="bg-black/30 px-2 py-1 rounded">{API_URL}</code>
              </p>
            </div>

            <div className="space-y-4">
              {apiKeys.map((apiKey) => (
                <div key={apiKey.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium">{apiKey.name}</p>
                      <p className="text-xs text-gray-400">
                        Criada em {new Date(apiKey.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowApiKey(showApiKey === apiKey.id ? null : apiKey.id)}
                        className="p-2 hover:bg-white/10 rounded-lg transition"
                        title={showApiKey === apiKey.id ? 'Ocultar' : 'Mostrar'}
                      >
                        {showApiKey === apiKey.id ? <FiEyeOff /> : <FiEye />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(apiKey.key, apiKey.id)}
                        className="p-2 hover:bg-white/10 rounded-lg transition"
                        title="Copiar"
                      >
                        {copiedKey === apiKey.id ? <FiCheck className="text-green-500" /> : <FiCopy />}
                      </button>
                      {apiKey.id !== 'default' && (
                        <button
                          onClick={() => deleteApiKey(apiKey.id)}
                          className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition"
                          title="Remover"
                        >
                          <FiTrash2 />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="bg-black/30 rounded-lg p-3 font-mono text-sm break-all">
                    {showApiKey === apiKey.id ? apiKey.key : '•'.repeat(40)}
                  </div>
                </div>
              ))}
            </div>

            {/* Usage examples */}
            <div className="mt-8">
              <h3 className="font-semibold mb-4">Exemplos de Uso</h3>
              
              <div className="bg-black/30 rounded-xl p-4 mb-4">
                <p className="text-xs text-gray-400 mb-2">JavaScript / Node.js</p>
                <pre className="text-sm overflow-x-auto">
{`const response = await fetch('${API_URL}/api/message/send/text', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'SUA_CHAVE_AQUI'
  },
  body: JSON.stringify({
    instanceId: 'sua-instancia',
    phone: '5511999999999',
    message: 'Olá do Kesher!'
  })
});`}
                </pre>
              </div>

              <div className="bg-black/30 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-2">cURL</p>
                <pre className="text-sm overflow-x-auto">
{`curl -X POST ${API_URL}/api/message/send/text \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: SUA_CHAVE_AQUI" \\
  -d '{"instanceId":"sua-instancia","phone":"5511999999999","message":"Olá!"}'`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
