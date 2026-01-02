
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { OperatorType, AnnouncementConfig, GeneratedAudio } from './types';
import { OPERATOR_THEMES, SCRIPTS } from './constants';
import { generateAnnouncementAudio, decodeAudioData, createWavFile } from './services/geminiService';

// --- Sub-components ---

const Header: React.FC = () => (
  <header className="bg-white border-b border-gray-200 sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
    <div className="flex items-center gap-2">
      <div className="bg-green-600 text-white p-2 rounded-lg shadow-sm">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 15h10"/><path d="M9 9h6"/><rect width="18" height="16" x="3" y="4" rx="2"/><path d="M12 18v2"/><path d="M16 22l-1-2"/><path d="M8 22l1-2"/></svg>
      </div>
      <div>
        <h1 className="text-xl font-bold text-gray-900 leading-tight">Eki-Announce Maker</h1>
        <p className="text-xs text-gray-500 font-medium tracking-tight">Japanese Train Announcement Simulator</p>
      </div>
    </div>
    <div className="hidden sm:block text-[10px] font-bold text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-100 uppercase tracking-widest">
      Gemini 2.5 Audio Engine
    </div>
  </header>
);

const SectionTitle: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div className="mb-4">
    <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{title}</h2>
    {subtitle && <p className="text-xs text-gray-500 mt-1 font-medium">{subtitle}</p>}
  </div>
);

// --- Main App ---

export default function App() {
  const [config, setConfig] = useState<AnnouncementConfig>({
    stationNameJp: '東京',
    stationNameEn: 'Tokyo',
    stationNumber: 'JY01',
    doorDirection: 'left',
    transfers: ['山手線', '中央線'],
    operator: OperatorType.JR_EAST,
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [audioResult, setAudioResult] = useState<GeneratedAudio | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const scriptJp = config.customScriptJp || SCRIPTS[config.operator].jp(
    config.stationNameJp,
    config.stationNumber,
    config.doorDirection === 'left' ? '左' : '右',
    config.transfers.join('と、')
  );

  const scriptEn = config.customScriptEn || SCRIPTS[config.operator].en(
    config.stationNameEn,
    config.stationNumber,
    config.doorDirection,
    config.transfers.length > 0 ? (config.stationNameEn === 'Tokyo' ? 'Yamanote Line and the Chuo Line' : config.transfers.join(' Line, ') + ' Line') : ''
  );

  // Combine scripts for the TTS engine
  const fullScriptForTTS = `${scriptJp}\n\n${scriptEn}`;

  const handleGenerate = async () => {
    try {
      setError(null);
      setIsGenerating(true);
      const pcmData = await generateAnnouncementAudio(fullScriptForTTS);
      const wavBlob = createWavFile(pcmData);
      const url = URL.createObjectURL(wavBlob);
      
      setAudioResult({
        blob: wavBlob,
        url: url,
        script: fullScriptForTTS
      });
    } catch (err: any) {
      setError(err.message || "Failed to generate audio");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlay = async () => {
    if (!audioResult) return;
    
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') await ctx.resume();

    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
      } catch (e) {}
    }

    const arrayBuffer = await audioResult.blob.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.start(0);
    currentSourceRef.current = source;
  };

  const addTransfer = () => {
    setConfig(prev => ({ ...prev, transfers: [...prev.transfers, ''] }));
  };

  const updateTransfer = (index: number, val: string) => {
    const newTransfers = [...config.transfers];
    newTransfers[index] = val;
    setConfig(prev => ({ ...prev, transfers: newTransfers }));
  };

  const removeTransfer = (index: number) => {
    setConfig(prev => ({ ...prev, transfers: prev.transfers.filter((_, i) => i !== index) }));
  };

  return (
    <div className="min-h-screen pb-12 bg-[#fcfdfe]">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Configuration */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Operator Selection */}
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <SectionTitle title="1. Select Railway Operator" subtitle="Presets exclude station numbers from audio" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(Object.keys(OperatorType) as Array<keyof typeof OperatorType>).map((key) => {
                const type = OperatorType[key];
                const theme = OPERATOR_THEMES[type];
                const isActive = config.operator === type;
                return (
                  <button
                    key={type}
                    onClick={() => setConfig(prev => ({ ...prev, operator: type }))}
                    className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all group ${
                      isActive 
                        ? 'border-blue-500 bg-blue-50/50' 
                        : 'border-gray-50 hover:border-gray-200 bg-white'
                    }`}
                  >
                    <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}>
                      {theme.icon}
                    </div>
                    <span className={`text-[11px] font-bold ${isActive ? 'text-blue-700' : 'text-gray-400'}`}>{type}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Station Details */}
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <SectionTitle title="2. Station Information" subtitle="Numbers are for display only" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase">Station (Jp)</label>
                <input
                  type="text"
                  value={config.stationNameJp}
                  onChange={(e) => setConfig(prev => ({ ...prev, stationNameJp: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
                  placeholder="e.g. 渋谷"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase">Station (En)</label>
                <input
                  type="text"
                  value={config.stationNameEn}
                  onChange={(e) => setConfig(prev => ({ ...prev, stationNameEn: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
                  placeholder="e.g. Shibuya"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase">Station Number</label>
                <input
                  type="text"
                  value={config.stationNumber}
                  onChange={(e) => setConfig(prev => ({ ...prev, stationNumber: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold tracking-widest text-blue-600"
                  placeholder="e.g. JY01"
                />
              </div>
            </div>

            <div className="mt-5">
              <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase">Doors open on</label>
              <div className="flex gap-3">
                {(['left', 'right'] as const).map(dir => (
                  <button
                    key={dir}
                    onClick={() => setConfig(prev => ({ ...prev, doorDirection: dir }))}
                    className={`flex-1 py-2.5 rounded-xl border font-bold capitalize transition-all active:scale-95 ${
                      config.doorDirection === dir 
                        ? 'bg-gray-900 text-white border-gray-900 shadow-md' 
                        : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    {dir} side
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Transfers */}
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <SectionTitle title="3. Transfers" subtitle="List connecting lines" />
              <button 
                onClick={addTransfer}
                className="text-[10px] font-black text-blue-600 hover:text-blue-700 flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-full transition-colors uppercase tracking-widest"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                Add Line
              </button>
            </div>
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {config.transfers.map((line, idx) => (
                <div key={idx} className="flex gap-2 group animate-in slide-in-from-left-2 duration-200">
                  <input
                    type="text"
                    value={line}
                    onChange={(e) => updateTransfer(idx, e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-gray-50/50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-medium text-sm"
                    placeholder="e.g. 銀座線"
                  />
                  <button 
                    onClick={() => removeTransfer(idx)}
                    className="p-2.5 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
                </div>
              ))}
              {config.transfers.length === 0 && (
                <div className="text-center py-6 text-gray-300 text-xs font-bold border-2 border-dashed border-gray-50 rounded-2xl">
                  No Transfers Defined
                </div>
              )}
            </div>
          </section>

          {/* Manual Script Override */}
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <SectionTitle title="4. Voice Script Console" subtitle="Customize the voiced content manually" />
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase">Japanese Text-to-Speech</label>
                <textarea
                  value={scriptJp}
                  onChange={(e) => setConfig(prev => ({ ...prev, customScriptJp: e.target.value }))}
                  className="w-full h-24 px-4 py-3 bg-gray-50/30 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none text-sm font-noto-jp leading-relaxed"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase">English Text-to-Speech</label>
                <textarea
                  value={scriptEn}
                  onChange={(e) => setConfig(prev => ({ ...prev, customScriptEn: e.target.value }))}
                  className="w-full h-24 px-4 py-3 bg-gray-50/30 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none text-sm leading-relaxed"
                />
              </div>
              <button 
                onClick={() => setConfig(prev => ({ ...prev, customScriptJp: undefined, customScriptEn: undefined }))}
                className="text-[10px] font-bold text-gray-400 hover:text-blue-500 underline transition-colors"
              >
                Reset to standard template (no voiced numbers)
              </button>
            </div>
          </section>
        </div>

        {/* Right Column: Preview & Output */}
        <div className="lg:col-span-5 space-y-6">
          <div className="sticky top-24 space-y-6">
            
            {/* Display Simulator */}
            <div className="bg-[#121212] rounded-[2rem] p-6 shadow-2xl relative overflow-hidden aspect-video flex flex-col items-center justify-center text-center border-[12px] border-gray-800/80 ring-1 ring-white/10">
              <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none"></div>
              
              <div className={`absolute top-5 left-8 px-2.5 py-1 rounded text-[10px] font-black tracking-tighter text-white ${OPERATOR_THEMES[config.operator].color}`}>
                {config.operator}
              </div>
              
              {config.stationNumber && (
                <div className="absolute top-5 right-8 bg-white text-black px-2.5 py-1 rounded-sm font-black text-sm border-2 border-gray-600 shadow-sm font-mono tracking-tighter">
                  {config.stationNumber}
                </div>
              )}

              <div className="space-y-1 relative z-10">
                <p className="text-blue-400/80 text-[10px] font-black tracking-[0.4em] mb-4 uppercase">Next Station</p>
                <h3 className="text-5xl sm:text-6xl font-bold text-white font-noto-jp tracking-tighter drop-shadow-lg">
                  {config.stationNameJp}
                </h3>
                <p className="text-2xl sm:text-3xl text-gray-400 font-medium tracking-tight mt-2 italic">
                  {config.stationNameEn}
                </p>
              </div>

              <div className="mt-10 flex items-center gap-6 text-gray-500/50">
                <div className="flex flex-col items-center gap-1.5">
                   <div className={`w-3.5 h-3.5 rounded-full ${config.doorDirection === 'left' ? 'bg-green-500 animate-pulse shadow-[0_0_12px_rgba(34,197,94,1)]' : 'bg-gray-800'}`}></div>
                   <span className="text-[8px] font-black uppercase">Left</span>
                </div>
                <div className="h-px w-12 bg-gray-800/50"></div>
                <div className="flex flex-col items-center gap-1.5">
                   <div className={`w-3.5 h-3.5 rounded-full ${config.doorDirection === 'right' ? 'bg-green-500 animate-pulse shadow-[0_0_12px_rgba(34,197,94,1)]' : 'bg-gray-800'}`}></div>
                   <span className="text-[8px] font-black uppercase">Right</span>
                </div>
              </div>
            </div>

            {/* Audio Controls */}
            <div className="bg-white rounded-3xl p-6 shadow-xl shadow-blue-500/5 border border-gray-100 flex flex-col gap-4">
              <button
                disabled={isGenerating}
                onClick={handleGenerate}
                className={`w-full py-4.5 rounded-2xl font-black text-sm uppercase tracking-widest text-white flex items-center justify-center gap-3 transition-all shadow-lg active:scale-[0.98] ${
                  isGenerating ? 'bg-gray-300 cursor-not-allowed shadow-none' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                }`}
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Synthesizing...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                    Synthesize Announcement
                  </>
                )}
              </button>

              {audioResult && (
                <div className="animate-in zoom-in-95 duration-300">
                  <div className="flex gap-2">
                    <button
                      onClick={handlePlay}
                      className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                      Broadcast Audio
                    </button>
                    <a
                      href={audioResult.url}
                      download={`announce_${config.stationNameEn.toLowerCase()}.wav`}
                      className="px-5 py-4 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-2xl flex items-center justify-center transition-all border border-gray-100 active:scale-[0.98]"
                      title="Download Master WAV"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </a>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-[10px] font-bold flex items-center gap-2 animate-shake">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {error}
                </div>
              )}
            </div>

            {/* Guidelines */}
            <div className="bg-blue-50/30 rounded-2xl p-4 border border-blue-50/50 space-y-3">
              <h4 className="text-[10px] font-black text-blue-600/50 uppercase tracking-[0.2em]">Operational Guidelines</h4>
              <ul className="text-[11px] text-gray-400 space-y-2 font-medium">
                <li className="flex gap-2">
                  <span className="text-blue-500">•</span>
                  <span>Station numbers (e.g. JY01) are displayed on the simulator but **omitted** from standard audio templates.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-500">•</span>
                  <span>Both Japanese and English script sections are sent to the AI engine for a full bilingual broadcast.</span>
                </li>
              </ul>
            </div>

          </div>
        </div>

      </main>

      <footer className="max-w-6xl mx-auto px-4 mt-12 border-t border-gray-50 py-10 text-center">
        <p className="text-gray-300 text-[10px] font-black uppercase tracking-[0.3em]">&copy; 2024 Eki-Announce Maker &bull; AI Broadcast Engine</p>
      </footer>
    </div>
  );
}
