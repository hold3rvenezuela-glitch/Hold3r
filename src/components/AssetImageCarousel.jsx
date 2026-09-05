import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon, Maximize2, X } from 'lucide-react';

export default function AssetImageCarousel({ 
  images = [], 
  title = 'Activo RWA', 
  heightClass = 'h-52', 
  childrenOverlay = null,
  showCounter = true 
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Asegurar arreglo de imágenes válido
  const imagesList = Array.isArray(images) && images.length > 0
    ? images.filter(img => typeof img === 'string' && img.trim().length > 0)
    : ['https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1000&q=80'];

  const currentImage = imagesList[currentIndex] || imagesList[0];

  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev - 1 + imagesList.length) % imagesList.length);
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev + 1) % imagesList.length);
  };

  const openLightbox = (e) => {
    e.stopPropagation();
    setIsLightboxOpen(true);
  };

  const closeLightbox = (e) => {
    if (e) e.stopPropagation();
    setIsLightboxOpen(false);
  };

  return (
    <>
      <div 
        onClick={openLightbox}
        className={`relative ${heightClass} w-full overflow-hidden bg-neutral-950 group select-none cursor-pointer`}
      >
        {/* Imagen Activa */}
        <img
          src={currentImage}
          alt={`${title} - Foto ${currentIndex + 1}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1000&q=80';
          }}
        />

        {/* Sombra de Degradado */}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-black/20 opacity-90 pointer-events-none" />

        {/* Botón / Lupa Expandir */}
        <button
          type="button"
          onClick={openLightbox}
          className="absolute top-3 right-3 bg-black/60 hover:bg-black/90 text-white p-1.5 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity border border-white/20 z-20 shadow-lg"
          title="Ampliar foto"
        >
          <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
        </button>

        {/* Badges / Overlay Personalizados */}
        {childrenOverlay}

        {/* Navegación por Carrusel */}
        {imagesList.length > 1 && (
          <>
            {/* Botón Anterior */}
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/65 hover:bg-black/90 text-white p-1.5 rounded-full backdrop-blur-sm opacity-90 group-hover:opacity-100 transition-all border border-white/10 z-20"
              title="Foto Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Botón Siguiente */}
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/65 hover:bg-black/90 text-white p-1.5 rounded-full backdrop-blur-sm opacity-90 group-hover:opacity-100 transition-all border border-white/10 z-20"
              title="Foto Siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Indicador Contador */}
            {showCounter && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/75 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/15 text-[10px] font-mono text-neutral-200 z-10 flex items-center gap-1 shadow-lg">
                <ImageIcon className="w-3 h-3 text-emerald-400" />
                <span>{currentIndex + 1} / {imagesList.length}</span>
              </div>
            )}

            {/* Puntos de Posición (Dots) */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10 pointer-events-none">
              {imagesList.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentIndex ? 'w-4 bg-emerald-400' : 'w-1.5 bg-white/40'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Lightbox / Ampliación en Pantalla Completa Modal ── */}
      {isLightboxOpen && (
        <div 
          className="fixed inset-0 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-between p-4 sm:p-8"
          style={{ zIndex: 999999 }}
          onClick={closeLightbox}
        >
          {/* Header Lightbox */}
          <div className="w-full max-w-5xl flex items-center justify-between z-10" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white max-w-md truncate">{title}</span>
              <span className="text-xs font-mono bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/40">
                {currentIndex + 1} de {imagesList.length}
              </span>
            </div>
            <button
              onClick={closeLightbox}
              className="p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white transition-colors border border-white/10"
              title="Cerrar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Contenido Central / Imagen Ampliada */}
          <div 
            className="relative flex-1 w-full max-w-5xl my-4 flex items-center justify-center overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={currentImage}
              alt={`${title} - Ampliada ${currentIndex + 1}`}
              className="max-h-[82vh] max-w-full object-contain rounded-2xl shadow-2xl border border-white/10"
            />

            {/* Controles de Navegación en Lightbox */}
            {imagesList.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-black/75 hover:bg-emerald-500 hover:text-black text-white p-3 rounded-full backdrop-blur-md transition-all border border-white/20 shadow-2xl"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-black/75 hover:bg-emerald-500 hover:text-black text-white p-3 rounded-full backdrop-blur-md transition-all border border-white/20 shadow-2xl"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Miniaturas Inferiores en Lightbox */}
          {imagesList.length > 1 && (
            <div 
              className="w-full max-w-2xl flex items-center justify-center gap-2 overflow-x-auto py-2 px-4 no-scrollbar z-10"
              onClick={e => e.stopPropagation()}
            >
              {imagesList.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                    idx === currentIndex ? 'border-emerald-400 scale-110 shadow-lg shadow-emerald-500/20' : 'border-white/20 opacity-50 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="Thumb" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
