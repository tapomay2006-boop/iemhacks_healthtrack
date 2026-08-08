import React, { useRef, useEffect, useState } from 'react';
import { Camera, X, RefreshCw, Check } from 'lucide-react';

interface LiveCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageBlobUrl: string) => void;
}

export const LiveCameraModal: React.FC<LiveCameraModalProps> = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setErrorMsg(null);
    setCapturedUrl(null);
    let mediaStream: MediaStream | null = null;

    // 1. Try back/environment camera first (mobile devices)
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
    } catch (e1) {
      console.warn('Environment camera unavailable, trying user camera:', e1);
      // 2. Try front/user camera (laptop / desktop PC webcams)
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        });
      } catch (e2) {
        console.warn('User camera unavailable, trying basic video:', e2);
        // 3. Fallback to any available video device
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } catch (e3: any) {
          console.error('All camera constraint attempts failed:', e3);
          setErrorMsg('Could not access live camera. Please check browser camera permissions or select Photo Upload.');
          return;
        }
      }
    }

    if (mediaStream) {
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    }
  };


  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleTakeSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const url = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedUrl(url);
    }
  };

  const handleConfirmImage = () => {
    if (capturedUrl) {
      onCapture(capturedUrl);
      stopCamera();
      onClose();
    }
  };

  const handleRetake = () => {
    setCapturedUrl(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-400" /> Live Clinical Camera Capture
          </h2>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder / Captured Preview Area */}
        <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video border border-slate-800 flex items-center justify-center">
          {errorMsg ? (
            <div className="p-4 text-center text-xs text-rose-400">
              <p className="font-semibold mb-2">{errorMsg}</p>
            </div>
          ) : capturedUrl ? (
            <img src={capturedUrl} alt="Captured clinical sign" className="w-full h-full object-cover" />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-center gap-3 pt-2">
          {capturedUrl ? (
            <>
              <button
                onClick={handleRetake}
                className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-all"
              >
                <RefreshCw className="w-4 h-4" /> Retake Photo
              </button>
              <button
                onClick={handleConfirmImage}
                className="px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
              >
                <Check className="w-4 h-4" /> Confirm & Analyze
              </button>
            </>
          ) : (
            <button
              onClick={handleTakeSnapshot}
              disabled={!!errorMsg}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-xl shadow-emerald-500/20 transition-all"
            >
              <Camera className="w-4 h-4" /> Capture Photo Snapshot
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
