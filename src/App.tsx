import React, { useState, useRef } from 'react';
import { Upload, Sparkles, Image as ImageIcon, Download, Loader2, ArrowRight } from 'lucide-react';
import { generatePrompts, generateImagen3, GenerationSettings } from './lib/gemini';
import { removeBackground } from '@imgly/background-removal';
import * as htmlToImage from 'html-to-image';

const CATEGORIES = ['Bath Mat', 'Pillow / Cushion Cover', 'Throw Blanket', 'Rug / Area Rug', 'Bedding / Duvet Cover', 'Blanket'];
const STYLES = ['Modern Minimalist', 'Cozy & Warm', 'Luxury Premium', 'Scandinavian'];
const ROOMS = ['Bathroom', 'Bedroom', 'Living Room', 'Kids Room'];

// Define different perspective transforms for each angle
const ANGLE_STYLES = [
  { transform: 'scale(0.8) translateY(10%)', dropShadow: 'drop-shadow(0 20px 20px rgba(0,0,0,0.4))' }, // Top-down
  { transform: 'perspective(1000px) rotateX(45deg) scale(0.75) translateY(20%)', dropShadow: 'drop-shadow(0 40px 20px rgba(0,0,0,0.5))' }, // 45-degree
  { transform: 'perspective(800px) rotateX(60deg) scale(0.65) translateY(40%)', dropShadow: 'drop-shadow(0 50px 20px rgba(0,0,0,0.6))' }, // Low-angle
  { transform: 'perspective(1200px) rotateX(30deg) scale(0.6) translateY(30%)', dropShadow: 'drop-shadow(0 30px 15px rgba(0,0,0,0.4))' }, // Wide-angle
  { transform: 'perspective(800px) rotateX(20deg) scale(1.2) translateY(-10%)', dropShadow: 'drop-shadow(0 30px 30px rgba(0,0,0,0.4))' }, // Close-up
];

function App() {
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [selectedStyle, setSelectedStyle] = useState(STYLES[0]);
  const [selectedRoom, setSelectedRoom] = useState(ROOMS[0]);
  
  const [designFile, setDesignFile] = useState<File | null>(null);
  const [designPreview, setDesignPreview] = useState<string | null>(null);
  const [transparentPreview, setTransparentPreview] = useState<string | null>(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  
  const [generatedBackgrounds, setGeneratedBackgrounds] = useState<string[]>([]);
  const [generatedPrompts, setGeneratedPrompts] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const compositeRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setDesignFile(file);
      setDesignPreview(URL.createObjectURL(file));
      setTransparentPreview(null); // Reset transparent preview
    }
  };

  const handleGenerate = async () => {
    if (!designFile) {
      alert("Please upload a design image first.");
      return;
    }
    
    setIsGenerating(true);
    setGeneratedBackgrounds([]);
    setGeneratedPrompts([]);
    
    try {
      // Step 1: Remove Background
      if (!transparentPreview) {
        setLoadingStatus('Extracting product from background...');
        const blob = await removeBackground(designFile);
        setTransparentPreview(URL.createObjectURL(blob));
      }

      // Step 2: Generate Prompts for Empty Rooms
      setLoadingStatus('Designing perfect empty environments...');
      const settings: GenerationSettings = {
        category: selectedCategory,
        style: selectedStyle,
        room: selectedRoom
      };
      const prompts = await generatePrompts(designFile, settings);
      setGeneratedPrompts(prompts);
      
      // Step 3: Generate Backgrounds
      const newBackgrounds: string[] = [];
      for (let i = 0; i < prompts.length; i++) {
        setLoadingStatus(`Rendering environment ${i + 1} of 5...`);
        const imgData = await generateImagen3(prompts[i]);
        newBackgrounds.push(imgData);
        setGeneratedBackgrounds([...newBackgrounds]);
      }
      
      setLoadingStatus('Compositing complete!');
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'An error occurred during generation.');
    } finally {
      setIsGenerating(false);
      setLoadingStatus('');
    }
  };

  const handleDownload = async (index: number) => {
    const node = compositeRefs.current[index];
    if (!node) return;
    
    try {
      // Temporarily hide UI elements (like tooltip/buttons) during download
      node.classList.add('downloading');
      
      const dataUrl = await htmlToImage.toJpeg(node, { quality: 0.95 });
      
      node.classList.remove('downloading');

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `rkd-lifestyle-composited-${index + 1}.jpg`;
      a.click();
    } catch (error) {
      console.error("Failed to export image", error);
      node.classList.remove('downloading');
    }
  };

  const handleDownloadAll = () => {
    generatedBackgrounds.forEach((_, idx) => handleDownload(idx));
  };

  return (
    <div className="min-h-screen bg-[#0d0d12] relative overflow-hidden flex font-sans text-gray-100">
      {/* Background ambient light */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="flex w-full max-w-[1600px] mx-auto p-4 lg:p-8 gap-8 relative z-10 h-screen overflow-hidden">
        
        {/* Left Control Panel */}
        <div className="w-full lg:w-[450px] flex-shrink-0 flex flex-col gap-6 h-full overflow-y-auto pr-4 custom-scrollbar pb-10">
          
          <div className="glass-panel p-6 rounded-2xl flex items-center justify-between border-t border-white/10">
            <div>
              <h1 className="text-xl font-semibold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                RKD AI Studio
              </h1>
              <p className="text-xs text-gray-400 mt-1">100% Accurate Lifestyle Compositor</p>
            </div>
            <Sparkles className="w-6 h-6 text-indigo-400" />
          </div>

          <div className="glass-panel p-6 rounded-2xl flex flex-col gap-6 border-t border-white/10">
            {/* Category Selection */}
            <div>
              <label className="text-sm font-medium text-gray-300 mb-3 block flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                Product Category
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(c => (
                  <button
                    key={c}
                    onClick={() => setSelectedCategory(c)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 border ${
                      selectedCategory === c 
                        ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]' 
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {/* Image Upload */}
            <div>
              <label className="text-sm font-medium text-gray-300 mb-3 block flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                Design Image (Upload Original)
              </label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl overflow-hidden cursor-pointer transition-all duration-300 group ${
                  designPreview ? 'border-purple-500/50 bg-purple-500/5' : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                }`}
              >
                {designPreview ? (
                  <div className="relative w-full aspect-square">
                    <img src={transparentPreview || designPreview} alt="Design" className="w-full h-full object-contain p-4" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <p className="text-sm font-medium text-white flex items-center gap-2">
                        <Upload className="w-4 h-4" /> Change Image
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <ImageIcon className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-300">Click to upload design</p>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 10MB</p>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
            </div>

            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {/* Style Preference */}
            <div>
              <label className="text-sm font-medium text-gray-300 mb-3 block flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Style Preference
              </label>
              <div className="flex flex-wrap gap-2">
                {STYLES.map(s => (
                  <button
                    key={s}
                    onClick={() => setSelectedStyle(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 border ${
                      selectedStyle === s 
                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.2)]' 
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {/* Room Setting */}
            <div>
              <label className="text-sm font-medium text-gray-300 mb-3 block flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Room Setting
              </label>
              <div className="flex flex-wrap gap-2">
                {ROOMS.map(r => (
                  <button
                    key={r}
                    onClick={() => setSelectedRoom(r)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 border ${
                      selectedRoom === r 
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Action Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !designFile}
            className={`glass-panel p-4 rounded-xl flex items-center justify-center gap-2 font-medium text-sm transition-all duration-300 ${
              isGenerating || !designFile
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-indigo-500/20 border-indigo-500/30 text-indigo-300 hover:shadow-[0_0_20px_rgba(99,102,241,0.3)]'
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {loadingStatus || 'Generating...'}
              </>
            ) : (
              <>
                Generate 100% Accurate Images
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

        </div>

        {/* Right Gallery Panel */}
        <div className="flex-1 glass-panel rounded-2xl border-t border-white/10 overflow-hidden flex flex-col h-full">
          
          {/* Header */}
          <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-white/[0.02]">
            <div>
              <h2 className="text-sm font-medium text-gray-200">Composited Product Photography</h2>
              <p className="text-xs text-gray-500">Exact product placed in AI-generated environments</p>
            </div>
            
            {generatedBackgrounds.length > 0 && (
              <button 
                onClick={handleDownloadAll}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-xs font-medium text-white border border-white/10"
              >
                <Download className="w-3.5 h-3.5" />
                Download All
              </button>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {!isGenerating && generatedBackgrounds.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-300">No images yet</h3>
                <p className="text-sm text-gray-500 mt-2 max-w-md">
                  Upload a design and click "Generate" to extract your product and perfectly composite it into 5 distinct, hyper-realistic lifestyle photos.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                
                {/* Render already generated composited images */}
                {generatedBackgrounds.map((bgUrl, i) => (
                  <div 
                    key={i} 
                    ref={el => compositeRefs.current[i] = el}
                    className="group relative rounded-xl overflow-hidden border border-white/10 bg-white/5 aspect-[4/3] composite-container"
                  >
                    {/* The Background Layer */}
                    <img src={bgUrl} alt={`Environment ${i+1}`} className="absolute inset-0 w-full h-full object-cover z-0" />
                    
                    {/* The Product Layer (Overlay) */}
                    {transparentPreview && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none p-8">
                        <img 
                          src={transparentPreview} 
                          alt="Extracted Product" 
                          className="w-full h-full object-contain"
                          style={{
                            transform: ANGLE_STYLES[i % ANGLE_STYLES.length].transform,
                            filter: ANGLE_STYLES[i % ANGLE_STYLES.length].dropShadow,
                            transition: 'all 0.5s ease-in-out'
                          }}
                          crossOrigin="anonymous"
                        />
                      </div>
                    )}
                    
                    {/* UI Overlay Elements (Hidden during download via .downloading CSS) */}
                    <div className="ui-overlay">
                      {/* Overlay gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 pointer-events-none" />
                      
                      {/* Prompt tooltip */}
                      <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-30 pointer-events-none">
                        <p className="text-[10px] text-gray-300 line-clamp-3 leading-relaxed">
                          {generatedPrompts[i]}
                        </p>
                      </div>

                      <button 
                        onClick={() => handleDownload(i)}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/20 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80 hover:scale-110 z-30"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      
                      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/50 backdrop-blur-md border border-white/10 z-30">
                        <span className="text-[10px] font-medium text-gray-300">Angle {i+1}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Render loading placeholders if currently generating */}
                {isGenerating && Array.from({ length: 5 - generatedBackgrounds.length }).map((_, i) => (
                  <div key={`loading-${i}`} className="rounded-xl overflow-hidden border border-white/5 bg-white/5 aspect-[4/3] flex flex-col items-center justify-center relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-20 animate-pulse-slow" />
                    <Loader2 className="w-8 h-8 text-indigo-500/50 animate-spin mb-4" />
                    <p className="text-xs font-medium text-gray-500">
                      {i === 0 ? loadingStatus : 'Waiting in queue...'}
                    </p>
                  </div>
                ))}

              </div>
            )}
          </div>

        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        /* Hide UI overlays when capturing the image for download */
        .composite-container.downloading .ui-overlay {
          display: none !important;
        }
      `}} />
    </div>
  );
}

export default App;
