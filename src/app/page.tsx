'use client';

import { useState, useEffect } from 'react';
import { auth, googleProvider } from '@/lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import Image from 'next/image';
import { FcGoogle } from 'react-icons/fc';
import { FiPlus, FiRefreshCw, FiTrash2, FiLogOut, FiCopy, FiKey, FiCheck, FiEye, FiEyeOff, FiLink, FiActivity, FiPhone, FiMessageSquare, FiSend } from 'react-icons/fi';
import { BsWhatsapp, BsQrCode } from 'react-icons/bs';
import { TubesBackground } from '@/components/ui/neon-flow';

interface Instance {
  instanceId: string;
  zapiInstanceId?: string;
  connected: boolean;
  smartphoneConnected?: boolean;
  state: string;
  createdAt?: string;
  phone?: string;
}

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed?: string;
}

interface WebhookDestination {
  id: string;
  name: string;
  url: string;
  active: boolean;
}

interface MessageLog {
  id: string;
  type: 'sent' | 'received';
  phone: string;
  message: string;
  timestamp: string;
  status: string;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [newInstanceName, setNewInstanceName] = useState('');
  const [zapiInstanceId, setZapiInstanceId] = useState('');
  const [zapiToken, setZapiToken] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'instances' | 'apikeys' | 'webhooks' | 'logs'>('instances');
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [showApiKey, setShowApiKey] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Webhooks state
  const [webhooks, setWebhooks] = useState<WebhookDestination[]>([]);
  const [newWebhookName, setNewWebhookName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  
  // Message logs state
  const [messageLogs, setMessageLogs] = useState<MessageLog[]>([]);
  
  // Test message state
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://kesher-production.up.railway.app';
  const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'kesher-api-2026-d4f8a7b3e9c1';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      if (user) {
        loadApiKeys();
        loadWebhooks();
        loadMessageLogs();
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      loadInstances();
      loadMessageLogs();
      const interval = setInterval(() => {
        loadInstances();
        if (activeTab === 'logs') loadMessageLogs();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [user, activeTab]);

  // Carregar instâncias Z-API
  const loadInstances = async () => {
    try {
      const response = await fetch(`${API_URL}/api/zapi/instances`, {
        headers: { 'X-API-Key': API_KEY },
      });
      const data = await response.json();
      if (data.success) setInstances(data.instances || []);
    } catch (error) {
      console.error('Erro ao carregar instâncias:', error);
    }
  };

  const loadApiKeys = () => {
    const saved = localStorage.getItem('kesher-api-keys');
    if (saved) {
      setApiKeys(JSON.parse(saved));
    } else {
      const defaultKeys: ApiKey[] = [{
        id: 'default',
        name: 'Chave Principal',
        key: API_KEY,
        createdAt: new Date().toISOString(),
      }];
      setApiKeys(defaultKeys);
      localStorage.setItem('kesher-api-keys', JSON.stringify(defaultKeys));
    }
  };

  const loadWebhooks = () => {
    const saved = localStorage.getItem('kesher-webhooks');
    if (saved) {
      setWebhooks(JSON.parse(saved));
    } else {
      const defaultWebhooks: WebhookDestination[] = [{
        id: 'nutribuddy',
        name: 'NutriBuddy',
        url: 'https://web-production-c9eaf.up.railway.app/api/whatsapp-kesher/webhook',
        active: true,
      }];
      setWebhooks(defaultWebhooks);
      localStorage.setItem('kesher-webhooks', JSON.stringify(defaultWebhooks));
    }
  };

  const loadMessageLogs = async () => {
    try {
      const response = await fetch(`${API_URL}/api/zapi/logs`, {
        headers: { 'X-API-Key': API_KEY },
      });
      const data = await response.json();
      if (data.success) {
        setMessageLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
      // Fallback para localStorage
      const saved = localStorage.getItem('kesher-message-logs');
      if (saved) {
        setMessageLogs(JSON.parse(saved).slice(0, 50));
      }
    }
  };

  const addMessageLog = (log: Omit<MessageLog, 'id' | 'timestamp'>) => {
    const newLog: MessageLog = {
      ...log,
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    const updated = [newLog, ...messageLogs].slice(0, 50);
    setMessageLogs(updated);
    localStorage.setItem('kesher-message-logs', JSON.stringify(updated));
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

  const addWebhook = () => {
    if (!newWebhookName.trim() || !newWebhookUrl.trim()) return;
    const newWebhook: WebhookDestination = {
      id: `webhook-${Date.now()}`,
      name: newWebhookName,
      url: newWebhookUrl,
      active: true,
    };
    const updated = [...webhooks, newWebhook];
    setWebhooks(updated);
    localStorage.setItem('kesher-webhooks', JSON.stringify(updated));
    setNewWebhookName('');
    setNewWebhookUrl('');
  };

  const toggleWebhook = (id: string) => {
    const updated = webhooks.map(w => w.id === id ? { ...w, active: !w.active } : w);
    setWebhooks(updated);
    localStorage.setItem('kesher-webhooks', JSON.stringify(updated));
  };

  const deleteWebhook = (id: string) => {
    if (!confirm('Remover este webhook?')) return;
    const updated = webhooks.filter(w => w.id !== id);
    setWebhooks(updated);
    localStorage.setItem('kesher-webhooks', JSON.stringify(updated));
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

  // Adicionar instância Z-API existente
  const addZapiInstance = async () => {
    if (!newInstanceName.trim() || !zapiInstanceId.trim() || !zapiToken.trim()) {
      alert('Preencha todos os campos');
      return;
    }
    setIsCreating(true);
    try {
      const response = await fetch(`${API_URL}/api/zapi/instance/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
        body: JSON.stringify({ 
          name: newInstanceName,
          zapiInstanceId: zapiInstanceId,
          zapiToken: zapiToken
        }),
      });
      const data = await response.json();
      if (data.success) {
        setNewInstanceName('');
        setZapiInstanceId('');
        setZapiToken('');
        setShowAddForm(false);
        loadInstances();
        setSelectedInstance(data.instanceId);
      } else {
        alert(data.error || 'Erro ao adicionar instância');
      }
    } catch (error) {
      console.error('Erro ao adicionar instância:', error);
      alert('Erro ao adicionar instância');
    } finally {
      setIsCreating(false);
    }
  };

  // Enviar mensagem de teste
  const sendTestMessage = async () => {
    if (!selectedInstance || !testPhone.trim() || !testMessage.trim()) {
      alert('Selecione uma instância e preencha telefone e mensagem');
      return;
    }
    setSendingTest(true);
    try {
      const response = await fetch(`${API_URL}/api/zapi/message/send/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
        body: JSON.stringify({
          instanceId: selectedInstance,
          phone: testPhone,
          message: testMessage
        }),
      });
      const data = await response.json();
      if (data.success) {
        addMessageLog({
          type: 'sent',
          phone: testPhone,
          message: testMessage,
          status: 'delivered'
        });
        alert('✅ Mensagem enviada com sucesso!');
        setTestMessage('');
      } else {
        alert('❌ Erro: ' + (data.error || 'Falha ao enviar'));
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      alert('Erro ao enviar mensagem');
    } finally {
      setSendingTest(false);
    }
  };

  // Obter QR Code via Z-API
  const getQRCode = async (instanceId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/zapi/instance/${instanceId}/qrcode`, {
        headers: { 'X-API-Key': API_KEY },
      });
      const data = await response.json();
      if (data.success && data.qrBase64) setQrCode(data.qrBase64);
      else setQrCode(null);
    } catch (error) {
      console.error('Erro ao obter QR Code:', error);
      setQrCode(null);
    }
  };

  // Remover instância
  const deleteInstance = async (instanceId: string) => {
    if (!confirm(`Remover "${instanceId}"?`)) return;
    try {
      await fetch(`${API_URL}/api/zapi/instance/${instanceId}`, {
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

  // Reiniciar instância
  const restartInstance = async (instanceId: string) => {
    try {
      await fetch(`${API_URL}/api/zapi/instance/${instanceId}/restart`, {
        method: 'POST',
        headers: { 'X-API-Key': API_KEY },
      });
      setTimeout(() => getQRCode(instanceId), 3000);
    } catch (error) {
      console.error('Erro ao reiniciar instância:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // LOGIN SCREEN
  if (!user) {
    return (
      <TubesBackground>
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <div className="glass-card p-8 max-w-md w-full text-center animate-fadeIn bg-black/50 backdrop-blur-xl border border-white/10 pointer-events-auto">
            <Image src="/logo.png" alt="Kesher" width={180} height={180} className="mx-auto mb-6" />
            <h1 className="text-4xl font-bold mb-2 text-white drop-shadow-lg">קֶשֶׁר</h1>
            <p className="text-white/70 mb-8">Sua conexão WhatsApp poderosa</p>
            <button 
              onClick={handleGoogleLogin} 
              className="w-full flex items-center justify-center gap-3 bg-white text-black font-medium py-3 px-6 rounded-xl hover:bg-gray-100 transition-all"
            >
              <FcGoogle className="text-2xl" />
              Entrar com Google
            </button>
            <p className="text-white/40 text-xs mt-6">Powered by Z-API</p>
          </div>
        </div>
      </TubesBackground>
    );
  }

  // DASHBOARD
  return (
    <div className="min-h-screen p-4 md:p-8 text-foreground">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Image src="/logo.png" alt="Kesher" width={50} height={50} />
          <div>
            <h1 className="text-xl font-bold">Kesher Dashboard</h1>
            <p className="text-sm text-muted-foreground">קֶשֶׁר - Powered by Z-API</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground hidden md:block">{user.email}</span>
          <button onClick={handleLogout} className="btn-secondary py-2 px-4">
            <FiLogOut />
          </button>
        </div>
      </header>

      {/* TABS */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveTab('instances')}
          className={`px-4 py-2 rounded-xl transition font-medium ${
            activeTab === 'instances' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-accent'
          }`}
        >
          <BsWhatsapp className="inline mr-2" /> Instâncias
        </button>
        <button
          onClick={() => setActiveTab('webhooks')}
          className={`px-4 py-2 rounded-xl transition font-medium ${
            activeTab === 'webhooks' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-accent'
          }`}
        >
          <FiLink className="inline mr-2" /> Webhooks
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 rounded-xl transition font-medium ${
            activeTab === 'logs' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-accent'
          }`}
        >
          <FiActivity className="inline mr-2" /> Logs
        </button>
        <button
          onClick={() => setActiveTab('apikeys')}
          className={`px-4 py-2 rounded-xl transition font-medium ${
            activeTab === 'apikeys' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-accent'
          }`}
        >
          <FiKey className="inline mr-2" /> Chaves de API
        </button>
      </div>

      {/* INSTANCES TAB */}
      {activeTab === 'instances' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Add Instance Form */}
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FiPlus /> Adicionar Instância Z-API
                </h2>
                <button 
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="btn-secondary py-2 px-4"
                >
                  {showAddForm ? 'Cancelar' : 'Nova Instância'}
                </button>
              </div>
              
              {showAddForm && (
                <div className="space-y-3 animate-fadeIn">
                  <p className="text-sm text-muted-foreground mb-2">
                    Cole os dados da sua instância Z-API (disponível em app.z-api.io)
                  </p>
                  <input
                    type="text"
                    value={newInstanceName}
                    onChange={(e) => setNewInstanceName(e.target.value)}
                    placeholder="Nome amigável (ex: WhatsApp Principal)"
                    className="w-full bg-card border border-input rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <input
                    type="text"
                    value={zapiInstanceId}
                    onChange={(e) => setZapiInstanceId(e.target.value)}
                    placeholder="Instance ID (ex: 3EA240373A126172229A82761BB89DF3)"
                    className="w-full bg-card border border-input rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm"
                  />
                  <input
                    type="text"
                    value={zapiToken}
                    onChange={(e) => setZapiToken(e.target.value)}
                    placeholder="Token (ex: 8F4DA3C4CA0EFA2069E84E7D)"
                    className="w-full bg-card border border-input rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm"
                  />
                  <button 
                    onClick={addZapiInstance} 
                    disabled={isCreating || !newInstanceName.trim() || !zapiInstanceId.trim() || !zapiToken.trim()} 
                    className="btn-primary w-full disabled:opacity-50"
                  >
                    {isCreating ? 'Adicionando...' : 'Adicionar Instância'}
                  </button>
                </div>
              )}
            </div>

            {/* Instances List */}
            <div className="glass-card p-4">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BsWhatsapp className="text-green-500" /> Instâncias ({instances.length})
              </h2>
              {instances.length === 0 ? (
                <div className="text-center py-8">
                  <BsWhatsapp className="text-4xl text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">Nenhuma instância adicionada ainda</p>
                </div>
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
                          ? 'bg-primary/10 border-2 border-primary'
                          : 'bg-card hover:bg-accent border border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${instance.connected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                          <div>
                            <p className="font-medium">{instance.instanceId}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              {instance.connected ? (
                                <>
                                  <span className="text-green-500">✅ Conectado</span>
                                  {instance.smartphoneConnected && <span>📱 Online</span>}
                                </>
                              ) : (
                                <span className="text-yellow-500">⏳ Aguardando conexão</span>
                              )}
                            </div>
                            {instance.zapiInstanceId && (
                              <p className="text-xs text-muted-foreground font-mono mt-1">
                                ID: {instance.zapiInstanceId.substring(0, 12)}...
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={(e) => { e.stopPropagation(); restartInstance(instance.instanceId); }} className="p-2 hover:bg-secondary rounded-lg" title="Reiniciar">
                            <FiRefreshCw />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); deleteInstance(instance.instanceId); }} className="p-2 hover:bg-destructive/20 text-destructive rounded-lg" title="Remover">
                            <FiTrash2 />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Test Message */}
            {selectedInstance && instances.find(i => i.instanceId === selectedInstance)?.connected && (
              <div className="glass-card p-4">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FiSend /> Enviar Mensagem de Teste
                </h2>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="Telefone (ex: 5547999999999)"
                    className="w-full bg-card border border-input rounded-xl px-4 py-3"
                  />
                  <textarea
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="Mensagem..."
                    rows={3}
                    className="w-full bg-card border border-input rounded-xl px-4 py-3 resize-none"
                  />
                  <button 
                    onClick={sendTestMessage}
                    disabled={sendingTest || !testPhone || !testMessage}
                    className="btn-primary w-full disabled:opacity-50"
                  >
                    {sendingTest ? 'Enviando...' : 'Enviar Mensagem'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* QR Code Panel */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BsQrCode /> QR Code
            </h2>
            {selectedInstance ? (
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Instância: <span className="font-medium text-foreground">{selectedInstance}</span>
                </p>
                {qrCode ? (
                  <div className="animate-fadeIn">
                    <div className="qr-container inline-block animate-pulse-glow">
                      <img src={qrCode} alt="QR Code" className="w-64 h-64" />
                    </div>
                    <p className="text-sm text-muted-foreground mt-4">Escaneie com seu WhatsApp</p>
                  </div>
                ) : (
                  <div className="py-12">
                    <BsWhatsapp className="text-6xl text-green-500 mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {instances.find((i) => i.instanceId === selectedInstance)?.connected ? '✅ Conectado!' : 'Carregando QR...'}
                    </p>
                    <button onClick={() => getQRCode(selectedInstance)} className="btn-secondary mt-4">
                      <FiRefreshCw className="mr-2" /> Atualizar
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <BsQrCode className="text-6xl mx-auto mb-4 opacity-50" />
                <p>Selecione uma instância</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* WEBHOOKS TAB */}
      {activeTab === 'webhooks' && (
        <div className="max-w-4xl space-y-6">
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FiPlus /> Adicionar Destino de Webhook
            </h2>
            <div className="space-y-3">
              <input
                type="text"
                value={newWebhookName}
                onChange={(e) => setNewWebhookName(e.target.value)}
                placeholder="Nome do app (ex: NutriBuddy)"
                className="w-full bg-card border border-input rounded-xl px-4 py-3"
              />
              <input
                type="url"
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
                placeholder="URL do webhook (ex: https://meuapp.com/webhook)"
                className="w-full bg-card border border-input rounded-xl px-4 py-3 font-mono text-sm"
              />
              <button 
                onClick={addWebhook}
                disabled={!newWebhookName.trim() || !newWebhookUrl.trim()}
                className="btn-primary disabled:opacity-50"
              >
                Adicionar Webhook
              </button>
            </div>
          </div>

          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FiLink /> Destinos Configurados ({webhooks.length})
            </h2>
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-6">
              <p className="text-sm">
                <strong>URL do Webhook Kesher:</strong>
              </p>
              <code className="block bg-secondary px-3 py-2 rounded mt-2 text-sm break-all">
                https://kesher-production.up.railway.app/api/zapi/webhook
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                Configure esta URL no Z-API para receber eventos
              </p>
            </div>
            
            {webhooks.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nenhum destino configurado</p>
            ) : (
              <div className="space-y-3">
                {webhooks.map((webhook) => (
                  <div key={webhook.id} className={`p-4 rounded-xl border ${webhook.active ? 'bg-card border-green-500/30' : 'bg-muted/50 border-border opacity-60'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${webhook.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                          <p className="font-medium">{webhook.name}</p>
                        </div>
                        <p className="text-sm text-muted-foreground font-mono truncate mt-1">{webhook.url}</p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button 
                          onClick={() => toggleWebhook(webhook.id)}
                          className={`px-3 py-1 rounded-lg text-sm ${webhook.active ? 'bg-green-500/20 text-green-500' : 'bg-secondary'}`}
                        >
                          {webhook.active ? 'Ativo' : 'Inativo'}
                        </button>
                        <button 
                          onClick={() => deleteWebhook(webhook.id)}
                          className="p-2 hover:bg-destructive/20 text-destructive rounded-lg"
                        >
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
      )}

      {/* LOGS TAB */}
      {activeTab === 'logs' && (
        <div className="max-w-4xl">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FiActivity /> Logs de Mensagens ({messageLogs.length})
              </h2>
              <div className="flex gap-2">
                <button 
                  onClick={loadMessageLogs}
                  className="btn-secondary py-1 px-3 text-sm"
                >
                  <FiRefreshCw className="inline mr-1" /> Atualizar
                </button>
                <button 
                  onClick={async () => { 
                    try {
                      await fetch(`${API_URL}/api/zapi/logs`, {
                        method: 'DELETE',
                        headers: { 'X-API-Key': API_KEY },
                      });
                      setMessageLogs([]);
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  className="btn-secondary py-1 px-3 text-sm text-destructive"
                >
                  Limpar Logs
                </button>
              </div>
            </div>
            
            {messageLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FiMessageSquare className="text-4xl mx-auto mb-4 opacity-50" />
                <p>Nenhuma mensagem registrada ainda</p>
                <p className="text-sm mt-2">Os logs aparecerão quando mensagens forem recebidas via WhatsApp</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {messageLogs.map((log: any) => (
                  <div key={log.id} className={`p-4 rounded-xl border ${log.direction === 'sent' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {log.direction === 'sent' ? (
                          <span className="text-blue-500">📤 Enviada</span>
                        ) : (
                          <span className="text-green-500">📥 Recebida</span>
                        )}
                        <span className="text-sm font-medium">{log.senderName || 'Desconhecido'}</span>
                        <span className="text-sm text-muted-foreground">
                          <FiPhone className="inline mr-1" />{log.phone}
                        </span>
                        {log.type !== 'text' && (
                          <span className="text-xs bg-primary/20 px-2 py-0.5 rounded">
                            {log.type === 'image' && '🖼️ Imagem'}
                            {log.type === 'audio' && '🎵 Áudio'}
                            {log.type === 'video' && '🎬 Vídeo'}
                            {log.type === 'document' && '📄 Documento'}
                            {log.type === 'sticker' && '🎨 Sticker'}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    
                    {/* Preview de mídia */}
                    {log.mediaUrl && log.type === 'image' && (
                      <div className="mb-2">
                        <img src={log.mediaUrl} alt="Imagem" className="max-w-[200px] max-h-[200px] rounded-lg object-cover" />
                      </div>
                    )}
                    
                    {log.message && (
                      <p className="text-sm">{log.message}</p>
                    )}
                    
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs ${log.status === 'delivered' ? 'text-green-500' : log.status === 'failed' ? 'text-red-500' : 'text-yellow-500'}`}>
                        {log.status === 'delivered' && '✓ Encaminhado'}
                        {log.status === 'failed' && '✗ Falhou'}
                        {log.status !== 'delivered' && log.status !== 'failed' && '⏳ Pendente'}
                      </span>
                      {log.messageId && (
                        <span className="text-xs text-muted-foreground font-mono">ID: {log.messageId.substring(0, 12)}...</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* API KEYS TAB */}
      {activeTab === 'apikeys' && (
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
                className="flex-1 bg-card border border-input rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring"
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
            
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-6">
              <p className="text-sm">
                <strong>Como usar:</strong> Adicione o header <code className="bg-secondary px-2 py-1 rounded">X-API-Key: SUA_CHAVE</code>
              </p>
              <p className="text-sm mt-2">
                <strong>URL da API:</strong> <code className="bg-secondary px-2 py-1 rounded">{API_URL}</code>
              </p>
            </div>

            <div className="space-y-4">
              {apiKeys.map((apiKey) => (
                <div key={apiKey.id} className="bg-card rounded-xl p-4 border border-border">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium">{apiKey.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Criada em {new Date(apiKey.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setShowApiKey(showApiKey === apiKey.id ? null : apiKey.id)} className="p-2 hover:bg-secondary rounded-lg transition">
                        {showApiKey === apiKey.id ? <FiEyeOff /> : <FiEye />}
                      </button>
                      <button onClick={() => copyToClipboard(apiKey.key, apiKey.id)} className="p-2 hover:bg-secondary rounded-lg transition">
                        {copiedKey === apiKey.id ? <FiCheck className="text-green-500" /> : <FiCopy />}
                      </button>
                      {apiKey.id !== 'default' && (
                        <button onClick={() => deleteApiKey(apiKey.id)} className="p-2 hover:bg-destructive/20 text-destructive rounded-lg transition">
                          <FiTrash2 />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="bg-secondary rounded-lg p-3 font-mono text-sm break-all">
                    {showApiKey === apiKey.id ? apiKey.key : '•'.repeat(40)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
