import React, { useState, useEffect, useRef } from 'react';
import {
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Sun,
  Contrast,
  Sliders,
  Check,
  X,
  Undo2,
  Sparkles,
  Crop,
  Palette,
  Image as ImageIcon
} from 'lucide-react';

interface ImageEditorModalProps {
  isOpen: boolean;
  file: File | null;
  onClose: () => void;
  onSave: (editedFile: File) => void;
}

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({
  isOpen,
  file,
  onClose,
  onSave,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);

  // Edit states
  const [rotation, setRotation] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);
  const [brightness, setBrightness] = useState<number>(100); // 100% is normal
  const [contrast, setContrast] = useState<number>(100);     // 100% is normal
  const [isGrayscale, setIsGrayscale] = useState<boolean>(false);
  const [bgColor, setBgColor] = useState<string>('#FFFFFF'); // White by default for Xerox
  const [aspectRatio, setAspectRatio] = useState<'ORIGINAL' | '1:1' | '4:3' | 'PASSPORT'>('ORIGINAL');

  // Load image when file changes
  useEffect(() => {
    if (!file || !isOpen) return;

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;

    img.onload = () => {
      setImageObj(img);
      handleReset();
    };

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file, isOpen]);

  // Redraw canvas whenever adjustments change
  useEffect(() => {
    if (!imageObj || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isRotated90or270 = rotation % 180 !== 0;
    const sourceW = isRotated90or270 ? imageObj.height : imageObj.width;
    const sourceH = isRotated90or270 ? imageObj.width : imageObj.height;

    // Calculate crop dimensions if aspect ratio applied
    let targetW = sourceW;
    let targetH = sourceH;

    if (aspectRatio === '1:1') {
      const minDim = Math.min(sourceW, sourceH);
      targetW = minDim;
      targetH = minDim;
    } else if (aspectRatio === '4:3') {
      targetW = sourceW;
      targetH = Math.round((sourceW * 3) / 4);
      if (targetH > sourceH) {
        targetH = sourceH;
        targetW = Math.round((sourceH * 4) / 3);
      }
    } else if (aspectRatio === 'PASSPORT') {
      // 3.5 x 4.5 ratio (approx 7:9)
      targetW = sourceW;
      targetH = Math.round((sourceW * 9) / 7);
      if (targetH > sourceH) {
        targetH = sourceH;
        targetW = Math.round((sourceH * 7) / 9);
      }
    }

    canvas.width = targetW;
    canvas.height = targetH;

    // 1. Fill solid background
    if (bgColor !== 'TRANSPARENT') {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, targetW, targetH);
    } else {
      ctx.clearRect(0, 0, targetW, targetH);
    }

    // 2. Set filters: brightness, contrast, grayscale
    let filterString = `brightness(${brightness}%) contrast(${contrast}%)`;
    if (isGrayscale) {
      filterString += ' grayscale(100%)';
    }
    ctx.filter = filterString;

    // 3. Coordinate transform for rotation and flips
    ctx.save();
    ctx.translate(targetW / 2, targetH / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

    // Draw centered
    ctx.drawImage(
      imageObj,
      -imageObj.width / 2,
      -imageObj.height / 2,
      imageObj.width,
      imageObj.height
    );
    ctx.restore();
  }, [imageObj, rotation, flipH, flipV, brightness, contrast, isGrayscale, bgColor, aspectRatio]);

  const handleReset = () => {
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setBrightness(100);
    setContrast(100);
    setIsGrayscale(false);
    setBgColor('#FFFFFF');
    setAspectRatio('ORIGINAL');
  };

  const handleSave = () => {
    if (!canvasRef.current || !file) return;

    canvasRef.current.toBlob(
      (blob) => {
        if (!blob) return;
        const newFileName = `edited_${file.name.replace(/\.[^/.]+$/, '')}.jpg`;
        const editedFile = new File([blob], newFileName, { type: 'image/jpeg' });
        onSave(editedFile);
        onClose();
      },
      'image/jpeg',
      0.95
    );
  };

  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="bg-gradient-to-b from-[#142217] via-[#0f1a11] to-[#0a120c] rounded-3xl max-w-2xl w-full border border-[#273d2c] shadow-[0_25px_60px_rgba(0,0,0,0.9)] flex flex-col max-h-[92vh] overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#233827] bg-[#0c140e] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#bbf451]/15 border border-[#bbf451]/30 text-[#bbf451] flex items-center justify-center">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-syne">Photo Print Adjustments</h3>
              <p className="text-[11px] text-slate-400 truncate max-w-xs">{file.name}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Canvas Preview Area */}
        <div className="flex-1 bg-[#080d09] p-4 flex items-center justify-center min-h-[260px] max-h-[380px] overflow-hidden relative">
          <canvas
            ref={canvasRef}
            className="max-h-[340px] max-w-full object-contain rounded-lg shadow-2xl border border-[#273d2c]"
          />

          {isGrayscale && (
            <span className="absolute top-3 left-3 bg-[#0c140e]/90 backdrop-blur-xs text-[#bbf451] text-[10px] font-bold px-2 py-0.5 rounded-md border border-[#bbf451]/30">
              B&amp;W Mode
            </span>
          )}
        </div>

        {/* Editing Tool Controls */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Quick Actions Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
              className="px-3 py-1.5 rounded-xl border border-[#273d2c] bg-[#162519] hover:bg-[#203323] text-slate-200 font-bold text-xs flex items-center gap-1.5 shrink-0 transition"
              title="Rotate Left"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>-90°</span>
            </button>

            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="px-3 py-1.5 rounded-xl border border-[#273d2c] bg-[#162519] hover:bg-[#203323] text-slate-200 font-bold text-xs flex items-center gap-1.5 shrink-0 transition"
              title="Rotate Right"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>+90°</span>
            </button>

            <button
              type="button"
              onClick={() => setFlipH((f) => !f)}
              className={`px-3 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 shrink-0 transition ${
                flipH ? 'bg-[#bbf451] border-[#bbf451] text-[#080d09]' : 'border-[#273d2c] bg-[#162519] text-slate-200 hover:bg-[#203323]'
              }`}
              title="Flip Horizontal"
            >
              <FlipHorizontal className="w-3.5 h-3.5" />
              <span>Flip H</span>
            </button>

            <button
              type="button"
              onClick={() => setFlipV((f) => !f)}
              className={`px-3 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 shrink-0 transition ${
                flipV ? 'bg-[#bbf451] border-[#bbf451] text-[#080d09]' : 'border-[#273d2c] bg-[#162519] text-slate-200 hover:bg-[#203323]'
              }`}
              title="Flip Vertical"
            >
              <FlipVertical className="w-3.5 h-3.5" />
              <span>Flip V</span>
            </button>

            <button
              type="button"
              onClick={() => setIsGrayscale((g) => !g)}
              className={`px-3 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 shrink-0 transition ${
                isGrayscale ? 'bg-[#bbf451] text-[#080d09] border-[#bbf451]' : 'border-[#273d2c] bg-[#162519] text-slate-200 hover:bg-[#203323]'
              }`}
              title="Convert to pure Photocopy Grayscale"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>B&amp;W Grayscale</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-1.5 rounded-xl border border-rose-500/30 hover:bg-rose-500/10 text-rose-400 font-bold text-xs flex items-center gap-1.5 shrink-0 ml-auto transition"
              title="Reset all adjustments"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>

          {/* Sliders: Brightness & Contrast */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  Brightness
                </span>
                <span className="font-mono text-[11px] text-slate-400">{brightness}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="180"
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="w-full accent-[#bbf451] cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1">
                  <Contrast className="w-3.5 h-3.5 text-blue-400" />
                  Contrast
                </span>
                <span className="font-mono text-[11px] text-slate-400">{contrast}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="180"
                value={contrast}
                onChange={(e) => setContrast(Number(e.target.value))}
                className="w-full accent-[#bbf451] cursor-pointer"
              />
            </div>
          </div>

          {/* Background Solid Color & Aspect Ratio Crop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#233827]">
            {/* Background Color */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                <Palette className="w-3.5 h-3.5 text-purple-400" />
                Background Color Fill
              </span>
              <div className="flex items-center gap-2">
                {[
                  { name: 'White', color: '#FFFFFF', border: 'border-slate-300' },
                  { name: 'Off-White', color: '#F8FAFC', border: 'border-slate-400' },
                  { name: 'Black', color: '#000000', border: 'border-slate-700' },
                  { name: 'Passport Blue', color: '#1E40AF', border: 'border-blue-600' },
                ].map((bg) => (
                  <button
                    key={bg.name}
                    type="button"
                    onClick={() => setBgColor(bg.color)}
                    style={{ backgroundColor: bg.color }}
                    className={`w-7 h-7 rounded-full border-2 transition ${bg.border} ${
                      bgColor === bg.color ? 'ring-2 ring-[#bbf451] ring-offset-2 ring-offset-[#0c140e] scale-110' : 'opacity-80 hover:opacity-100'
                    }`}
                    title={bg.name}
                  />
                ))}
              </div>
            </div>

            {/* Print Crop / Ratio Presets */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                <Crop className="w-3.5 h-3.5 text-emerald-400" />
                Aspect Ratio / Crop
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {(['ORIGINAL', '1:1', '4:3', 'PASSPORT'] as const).map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setAspectRatio(ratio)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                      aspectRatio === ratio
                        ? 'bg-[#bbf451] text-[#080d09] border-[#bbf451]'
                        : 'border-[#273d2c] bg-[#162519] text-slate-300 hover:bg-[#203323]'
                    }`}
                  >
                    {ratio === 'ORIGINAL' ? 'Original' : ratio === 'PASSPORT' ? 'Passport (3.5x4.5)' : ratio}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="p-4 border-t border-[#233827] flex items-center justify-between gap-3 bg-[#0c140e]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-[#273d2c] text-slate-300 font-bold text-xs hover:bg-[#162519] transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-[#bbf451] hover:bg-[#cbff5e] text-[#080d09] font-black text-xs flex items-center gap-1.5 shadow-[0_0_20px_rgba(187,244,81,0.25)] transition active:scale-98"
          >
            <Check className="w-4 h-4" />
            Apply &amp; Use in Print Order
          </button>
        </div>
      </div>
    </div>
  );
};
