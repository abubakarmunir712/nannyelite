import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  Video, Mic, Upload, X, Play, Square, Loader2, Trash2,
} from "lucide-react";

interface Props {
  videoUrl: string | null;
  voiceUrl: string | null;
  onVideoChange: (url: string | null) => void;
  onVoiceChange: (url: string | null) => void;
}

const MAX_VIDEO_SECONDS = 30;
const MAX_AUDIO_SECONDS = 20;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const MediaIntroRecorder = ({ videoUrl, voiceUrl, onVideoChange, onVoiceChange }: Props) => {
  const { user } = useAuth();

  // Video recording
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [videoTimer, setVideoTimer] = useState(0);
  const [videoPreview, setVideoPreview] = useState<string | null>(videoUrl);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const videoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Audio recording
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioTimer, setAudioTimer] = useState(0);
  const [audioPreview, setAudioPreview] = useState<string | null>(voiceUrl);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    setVideoPreview(videoUrl);
  }, [videoUrl]);

  useEffect(() => {
    setAudioPreview(voiceUrl);
  }, [voiceUrl]);

  // ── Upload helper ──
  const uploadMedia = useCallback(async (blob: Blob, type: "video" | "voice", ext: string) => {
    if (!user) return null;
    const path = `${user.id}/${type}-intro-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("nanny-media").upload(path, blob, {
      cacheControl: "3600",
      upsert: true,
    });
    if (error) throw error;
    const { data } = supabase.storage.from("nanny-media").getPublicUrl(path);
    return data.publicUrl;
  }, [user]);

  // ── Video Recording ──
  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      videoStreamRef.current = stream;
      videoChunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      recorder.ondataavailable = (e) => { if (e.data.size > 0) videoChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const blob = new Blob(videoChunksRef.current, { type: "video/webm" });
        stream.getTracks().forEach(t => t.stop());
        if (videoRef.current) videoRef.current.srcObject = null;
        if (blob.size > MAX_FILE_SIZE) {
          toast({ title: "File too large", description: "Video must be under 10MB.", variant: "destructive" });
          return;
        }
        setUploadingVideo(true);
        try {
          const url = await uploadMedia(blob, "video", "webm");
          setVideoPreview(url);
          onVideoChange(url);
          toast({ title: "Video saved!" });
        } catch (e: any) {
          toast({ title: "Upload failed", description: e.message, variant: "destructive" });
        }
        setUploadingVideo(false);
      };
      videoRecorderRef.current = recorder;
      recorder.start();
      setIsRecordingVideo(true);
      setVideoTimer(0);
      // Assign stream to video element after state update triggers render
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          videoRef.current.play();
        }
      });
      videoTimerRef.current = setInterval(() => {
        setVideoTimer(prev => {
          if (prev >= MAX_VIDEO_SECONDS - 1) {
            stopVideoRecording();
            return MAX_VIDEO_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      toast({ title: "Camera access denied", description: "Please allow camera and microphone access.", variant: "destructive" });
    }
  };

  const stopVideoRecording = useCallback(() => {
    videoRecorderRef.current?.stop();
    setIsRecordingVideo(false);
    if (videoTimerRef.current) clearInterval(videoTimerRef.current);
  }, []);

  // ── Audio Recording ──
  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach(t => t.stop());
        if (blob.size > MAX_FILE_SIZE) {
          toast({ title: "File too large", description: "Audio must be under 10MB.", variant: "destructive" });
          return;
        }
        setUploadingAudio(true);
        try {
          const url = await uploadMedia(blob, "voice", "webm");
          setAudioPreview(url);
          onVoiceChange(url);
          toast({ title: "Voice intro saved!" });
        } catch (e: any) {
          toast({ title: "Upload failed", description: e.message, variant: "destructive" });
        }
        setUploadingAudio(false);
      };
      audioRecorderRef.current = recorder;
      recorder.start();
      setIsRecordingAudio(true);
      setAudioTimer(0);
      audioTimerRef.current = setInterval(() => {
        setAudioTimer(prev => {
          if (prev >= MAX_AUDIO_SECONDS - 1) {
            stopAudioRecording();
            return MAX_AUDIO_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      toast({ title: "Microphone access denied", description: "Please allow microphone access.", variant: "destructive" });
    }
  };

  const stopAudioRecording = useCallback(() => {
    audioRecorderRef.current?.stop();
    setIsRecordingAudio(false);
    if (audioTimerRef.current) clearInterval(audioTimerRef.current);
  }, []);

  // ── File uploads ──
  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "File too large", description: "Video must be under 10MB.", variant: "destructive" });
      return;
    }
    if (!file.type.startsWith("video/")) {
      toast({ title: "Invalid file", description: "Please upload a video file (MP4, MOV, WebM).", variant: "destructive" });
      return;
    }
    setUploadingVideo(true);
    try {
      const ext = file.name.split(".").pop() || "mp4";
      const url = await uploadMedia(file, "video", ext);
      setVideoPreview(url);
      onVideoChange(url);
      toast({ title: "Video uploaded!" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setUploadingVideo(false);
    e.target.value = "";
  };

  const handleAudioFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "File too large", description: "Audio must be under 10MB.", variant: "destructive" });
      return;
    }
    if (!file.type.startsWith("audio/")) {
      toast({ title: "Invalid file", description: "Please upload an audio file (MP3, WAV, M4A).", variant: "destructive" });
      return;
    }
    setUploadingAudio(true);
    try {
      const ext = file.name.split(".").pop() || "mp3";
      const url = await uploadMedia(file, "voice", ext);
      setAudioPreview(url);
      onVoiceChange(url);
      toast({ title: "Voice intro uploaded!" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setUploadingAudio(false);
    e.target.value = "";
  };

  const removeVideo = () => { setVideoPreview(null); onVideoChange(null); };
  const removeAudio = () => { setAudioPreview(null); onVoiceChange(null); };

  return (
    <div className="space-y-6">
      {/* ── Video Introduction ── */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Video className="h-5 w-5 text-primary" />
          <h3 className="font-medium text-foreground">Video Introduction</h3>
          <span className="text-xs text-muted-foreground ml-auto">Max {MAX_VIDEO_SECONDS}s · 10MB</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Record a short video introducing yourself to families. This dramatically increases trust and booking rates!
        </p>

        {videoPreview && !isRecordingVideo ? (
          <div className="relative">
            <video src={videoPreview} controls className="w-full rounded-lg max-h-64 bg-foreground/5" />
            <Button variant="destructive" size="sm" className="absolute top-2 right-2 rounded-full h-8 w-8 p-0" onClick={removeVideo}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : isRecordingVideo ? (
          <div className="relative">
            <video ref={videoRef} className="w-full rounded-lg max-h-64 bg-foreground/5 mirror" style={{ transform: "scaleX(-1)" }} />
            <div className="absolute top-3 left-3 bg-destructive text-destructive-foreground text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-destructive-foreground" />
              REC {videoTimer}s / {MAX_VIDEO_SECONDS}s
            </div>
          </div>
        ) : uploadingVideo ? (
          <div className="flex items-center justify-center h-32 bg-muted rounded-lg">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : null}

        <div className="flex gap-2">
          {isRecordingVideo ? (
            <Button variant="destructive" onClick={stopVideoRecording} className="rounded-full gap-2">
              <Square className="h-4 w-4" /> Stop Recording
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={startVideoRecording} disabled={uploadingVideo} className="rounded-full gap-2 flex-1">
                <Video className="h-4 w-4" /> Record Video
              </Button>
              <label>
                <Button variant="outline" asChild disabled={uploadingVideo} className="rounded-full gap-2 flex-1 cursor-pointer">
                  <span><Upload className="h-4 w-4" /> Upload Video</span>
                </Button>
                <input type="file" accept="video/*" onChange={handleVideoFileUpload} className="hidden" />
              </label>
            </>
          )}
        </div>
      </div>

      {/* ── Voice Introduction ── */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Mic className="h-5 w-5 text-primary" />
          <h3 className="font-medium text-foreground">Voice Introduction</h3>
          <span className="text-xs text-muted-foreground ml-auto">Max {MAX_AUDIO_SECONDS}s · 10MB</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Record a short voice message. Great if you prefer audio over video — families love hearing your voice!
        </p>

        {audioPreview && !isRecordingAudio ? (
          <div className="flex items-center gap-3">
            <audio src={audioPreview} controls className="flex-1 h-10" />
            <Button variant="destructive" size="sm" className="rounded-full h-8 w-8 p-0" onClick={removeAudio}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : isRecordingAudio ? (
          <div className="flex items-center justify-center h-16 bg-muted rounded-lg gap-3">
            <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
            <span className="text-sm font-medium text-foreground">Recording... {audioTimer}s / {MAX_AUDIO_SECONDS}s</span>
          </div>
        ) : uploadingAudio ? (
          <div className="flex items-center justify-center h-16 bg-muted rounded-lg">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : null}

        <div className="flex gap-2">
          {isRecordingAudio ? (
            <Button variant="destructive" onClick={stopAudioRecording} className="rounded-full gap-2">
              <Square className="h-4 w-4" /> Stop Recording
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={startAudioRecording} disabled={uploadingAudio} className="rounded-full gap-2 flex-1">
                <Mic className="h-4 w-4" /> Record Voice
              </Button>
              <label>
                <Button variant="outline" asChild disabled={uploadingAudio} className="rounded-full gap-2 flex-1 cursor-pointer">
                  <span><Upload className="h-4 w-4" /> Upload Audio</span>
                </Button>
                <input type="file" accept="audio/*" onChange={handleAudioFileUpload} className="hidden" />
              </label>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaIntroRecorder;
