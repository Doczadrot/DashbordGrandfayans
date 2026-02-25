import React, { useState, useRef, useEffect } from 'react';
import { GlassCard } from '../UI/GlassCard';
import { IOSButton } from '../UI/IOSButton';
import { Send, ShieldCheck, Bot, User, GripVertical } from 'lucide-react';
import { DefectRecord } from '../../types/data.types';
import { calculateKPI, calculatePareto } from '../../utils/dataProcessor';

interface AIChatProps {
  data: DefectRecord[];
}

export const AIChat: React.FC<AIChatProps> = ({ data }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: 'Здравствуйте! Я ваш Защитник Качества. Я проанализировал загруженные данные. Спросите меня о поставщиках, дефектах или динамике.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Use API Key from environment variable
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const calculateNomenclatures = (data: DefectRecord[]) => {
      const counts: Record<string, number> = {};
      data.forEach(item => {
          counts[item.nomenclature] = (counts[item.nomenclature] || 0) + item.quantity;
      });
      return Object.entries(counts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    if (!apiKey) {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Ошибка: Ключ OpenAI API отсутствует в переменных окружения.' }]);
        return;
    }

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      // Calculate REAL stats to feed the AI
      const suppliers = calculateKPI(data);
      const topSuppliers = suppliers.slice(0, 15); // Increased context
      const pareto = calculatePareto(data);
      const topReasons = pareto.slice(0, 10);
      
      const summary = {
         totalDefects: data.length,
         totalSuppliersCount: suppliers.length,
         topSuppliersList: topSuppliers.map(s => `${s.supplier} (${s.totalDefects} шт., ${s.defectPercentage}%)`).join('; '),
         topReasonsList: topReasons.map(r => `${r.reason} (${r.count} шт., ${r.percentage}%)`).join('; '),
         topNomenclatures: calculateNomenclatures(data).slice(0, 10).map(n => `${n.name} (${n.count} шт.)`).join('; '),
      };

      const systemPrompt = `You are "Защитник Качества" (Quality Defender), an AI analyst.
      
      CRITICAL DATA CONTEXT:
      - Total Defects: ${summary.totalDefects}
      - Total Unique Suppliers: ${summary.totalSuppliersCount}
      - Top Suppliers (Name, Count, % of Total): ${summary.topSuppliersList}
      - Top Defect Reasons (Reason, Count, % of Total): ${summary.topReasonsList}
      - Top Nomenclatures (Products): ${summary.topNomenclatures}
      
      INSTRUCTIONS:
      1. Answer ONLY based on the provided data summary. 
      2. If asked "How many suppliers?", answer with "${summary.totalSuppliersCount}".
      3. If asked "Who has the most defects?", look strictly at the Top Suppliers list provided above.
      4. If asked about "Nomenclature" (Номенклатура), use the Top Nomenclatures list.
      5. Be concise, professional, and helpful. 
      6. ALWAYS answer in Russian.
      7. Do not hallucinate numbers. Use the exact counts and percentages provided.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMsg }
          ]
        })
      });
      
      const json = await response.json();
      
      if (json.error) {
         throw new Error(json.error.message);
      }
      
      const aiMsg = json.choices[0].message.content;
      setMessages(prev => [...prev, { role: 'assistant', content: aiMsg }]);
    } catch (error: unknown) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Ошибка: ${(error as Error).message}.` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassCard className="h-full min-h-[360px] flex flex-col relative overflow-hidden p-0">
        {/* Header */}
        <div className="p-4 border-b border-white/10 bg-white/10 backdrop-blur-md flex items-center gap-2">
            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                <ShieldCheck size={18} />
            </div>
            <h3 className="font-semibold text-white">Защитник Качества</h3>
            <div className="ml-auto tile-drag-handle p-2 rounded-lg bg-white/10 border border-white/10 text-gray-200 hover:bg-white/20 transition-colors">
                <GripVertical size={16} />
            </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
            {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'assistant' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-gray-600 text-gray-200'}`}>
                        {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
                    </div>
                    <div className={`p-3 rounded-2xl max-w-[80%] text-sm ${msg.role === 'assistant' ? 'bg-white/10 shadow-sm text-gray-100 rounded-tl-none border border-white/5' : 'bg-blue-600 text-white rounded-tr-none shadow-md'}`}>
                        {msg.content}
                    </div>
                </div>
            ))}
            {loading && (
                <div className="flex gap-3">
                     <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
                        <Bot size={16} />
                    </div>
                    <div className="p-3 rounded-2xl bg-white/10 shadow-sm rounded-tl-none border border-white/5">
                        <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-white/10 backdrop-blur-md border-t border-white/10">
            <div className="flex gap-2">
                <input 
                    type="text" 
                    className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    placeholder="Спросите о главных дефектах..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                    disabled={loading}
                />
                <IOSButton onClick={handleSend} disabled={loading || !input.trim()} className="!p-2.5 rounded-xl aspect-square flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white">
                    <Send size={20} />
                </IOSButton>
            </div>
        </div>
    </GlassCard>
  );
};
