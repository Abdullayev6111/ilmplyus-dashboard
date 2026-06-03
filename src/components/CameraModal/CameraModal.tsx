import { useEffect, useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import "./cameraModal.css";

interface CameraModalProps {
  onClose: () => void;
  onCapture: (file: File, preview: string) => void;
}

const CameraModal = ({ onClose, onCapture }: CameraModalProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    let activeStream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
        activeStream = s;
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      } catch (err) {
        console.error("Kamera xatosi:", err);
      }
    };

    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleCapture = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Preview bilan bir xil (mirror) chiqishi uchun:
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const blob: Blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b as Blob), "image/jpeg", 0.9),
    );

    const file = new File([blob], "camera.jpg", { type: "image/jpeg" });
    const compressed = await imageCompression(file, {
      maxSizeMB: 0.2,
      maxWidthOrHeight: 800,
      useWebWorker: true,
    });

    onCapture(compressed, URL.createObjectURL(compressed));
    onClose();
  };

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }
    onClose();
  };

  return (
    <div className="camera-overlay">
      <div className="camera-modal">
        <div className="camera-preview">
          <video ref={videoRef} autoPlay playsInline muted />
          <div className="camera-circle" />
        </div>

        <canvas ref={canvasRef} style={{ display: "none" }} />

        <div className="camera-actions">
          <button 
            type="button" 
            className="btn btn-save" 
            onClick={handleCapture}
            disabled={!stream}
          >
            Rasmga olish
          </button>
          <button type="button" className="btn btn-cancel" onClick={handleClose}>
            Bekor qilish
          </button>
        </div>
      </div>
    </div>
  );
};

export default CameraModal;
