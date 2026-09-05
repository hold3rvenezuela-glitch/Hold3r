import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';

export default function AssetImageCarousel({ 
  images = [], 
  title = 'Activo RWA', 
  heightClass = 'h-52', 
  childrenOverlay = null,
  showCounter = true 
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

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

  return (
    <div className={`relative ${heightClass} w-full overflow-hidden bg-neutral-950 group select-none`}>
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

      {/* Badges / Overlay Personalizados (Ej. Categoria o Estatus) */}
      {childrenOverlay}

      {/* Navegación por Carrusel (Si hay más de 1 imagen) */}
      {imagesList.length > 1 && (
        <>
          {/* Botón Anterior */}
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/65 hover:bg-black/90 text-white p-1.5 rounded-full backdrop-blur-sm opacity-90 group-hover:opacity-100 transition-all border border-white/10 z-10"
            title="Foto Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Botón Siguiente */}
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/65 hover:bg-black/90 text-white p-1.5 rounded-full backdrop-blur-sm opacity-90 group-hover:opacity-100 transition-all border border-white/10 z-10"
            title="Foto Siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Indicador Contador (Ej. 1 de 5) */}
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
  );
}
