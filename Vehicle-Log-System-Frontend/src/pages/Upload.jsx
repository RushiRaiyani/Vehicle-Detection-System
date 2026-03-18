import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Upload, Image as ImageIcon, Video, X, CheckCircle2, Loader2, Scan, Download, Database, AlertCircle, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { detectAPI, logsAPI, collectionsAPI } from '../api/api';

const UploadPage = () => {
  const [searchParams] = useSearchParams();
  const preselectedCollectionId = searchParams.get('collectionId') || '';

  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState(preselectedCollectionId);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ─── SSE streaming state ─────────────────────────────────────────
  const [streamingPlates, setStreamingPlates] = useState([]);
  const [progress, setProgress] = useState(null);  // { frame, totalFrames, percent }
  const [isStreaming, setIsStreaming] = useState(false);
  const streamControllerRef = useRef(null);
  const platesEndRef = useRef(null);

  // Fetch user's collections for the selector
  useEffect(() => {
    collectionsAPI.list()
      .then((data) => {
        setCollections(data.collections || []);
        if (preselectedCollectionId) setSelectedCollection(preselectedCollectionId);
        else if (data.collections?.length > 0) setSelectedCollection(data.collections[0]._id);
      })
      .catch(() => { });
  }, []);

  // Auto-scroll plates list when new plate arrives
  useEffect(() => {
    platesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [streamingPlates]);

  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  };

  const handleFile = (f) => {
    // Cancel any running stream
    if (streamControllerRef.current) {
      streamControllerRef.current.abort();
      streamControllerRef.current = null;
    }
    setFile(f);
    setResult(null);
    setError('');
    setSaved(false);
    setStreamingPlates([]);
    setProgress(null);
    setIsStreaming(false);
    processFile(f);
  };

  const processFile = async (f) => {
    setIsProcessing(true);
    setError('');

    if (f.type.startsWith('image/')) {
      // Image: use regular POST (no streaming needed)
      try {
        const data = await detectAPI.image(f);
        data.sourceType = 'image';
        setResult(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsProcessing(false);
      }
    } else {
      // Video: use SSE streaming
      setIsStreaming(true);
      const controller = detectAPI.videoStream(f, {
        onPlate: (plate) => {
          setStreamingPlates((prev) => {
            // De-duplicate by trackId
            if (prev.some((p) => p.trackId === plate.trackId)) return prev;
            return [...prev, plate];
          });
        },
        onProgress: (data) => {
          setProgress(data);
        },
        onDone: (data) => {
          setResult({
            plates: data.plates,
            outputFileName: data.outputFileName,
            sourceType: 'video',
          });
          setIsStreaming(false);
          setIsProcessing(false);
        },
        onError: (msg) => {
          setError(msg);
          setIsStreaming(false);
          setIsProcessing(false);
        },
      });
      streamControllerRef.current = controller;
    }
  };

  const clearFile = () => {
    if (streamControllerRef.current) {
      streamControllerRef.current.abort();
      streamControllerRef.current = null;
    }
    setFile(null);
    setResult(null);
    setError('');
    setSaved(false);
    setStreamingPlates([]);
    setProgress(null);
    setIsStreaming(false);
    setIsProcessing(false);
  };

  const handleAddToLogs = async () => {
    const plates = result?.plates || streamingPlates;
    if (!selectedCollection) {
      setError('Please select a collection first');
      return;
    }
    setSaving(true);
    try {
      await logsAPI.create({
        plates,
        collectionId: selectedCollection,
        sourceType: result?.sourceType || 'video',
      });
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    if (!result?.outputFileName) return;
    const url = detectAPI.getOutputUrl(result.outputFileName);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.outputFileName;
    a.click();
  };

  // Plates to show in the results panel
  const displayPlates = result?.plates || streamingPlates;
  const readablePlates = displayPlates.filter((p) => p.text && p.text !== 'NOT_READABLE');
  const isVideoFile = file && !file.type.startsWith('image/');
  const hasFinished = !!result && !isStreaming;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black text-gray-900">AI Plate Detection</h1>
        <p className="text-gray-500">Upload an image or video to extract license plate information instantly.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Upload Area */}
        <div className="space-y-4">
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`relative border-2 border-dashed rounded-3xl p-12 transition-all flex flex-col items-center justify-center min-h-[400px] text-center ${isDragging
              ? 'border-blue-500 bg-blue-50/50'
              : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
          >
            <AnimatePresence mode="wait">
              {!file ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="space-y-6"
                >
                  <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
                    <Upload size={40} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Drag & Drop Image or Video Here</h3>
                    <p className="text-gray-400 text-sm mt-2">Supports JPG, PNG, MP4 up to 200MB</p>
                  </div>
                  <div className="flex items-center justify-center gap-4">
                    <label className="px-6 py-2.5 bg-gray-900 text-white rounded-xl font-bold text-sm cursor-pointer hover:bg-gray-800 transition-all">
                      Browse Files
                      <input type="file" className="hidden" onChange={(e) => handleFile(e.target.files[0])} accept="image/*,video/*" />
                    </label>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full space-y-6"
                >
                  <div className="relative aspect-video bg-gray-100 rounded-2xl overflow-hidden border border-gray-200">
                    {file.type.startsWith('image/') ? (
                      <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                        <Video size={48} />
                        <span className="text-sm mt-2 font-medium">Video uploaded</span>
                      </div>
                    )}
                    <button
                      onClick={clearFile}
                      className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur shadow-lg rounded-full text-gray-500 hover:text-red-600 transition-colors"
                    >
                      <X size={20} />
                    </button>
                    {isProcessing && !isStreaming && (
                      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px] flex flex-col items-center justify-center text-white space-y-4">
                        <Loader2 size={40} className="animate-spin" />
                        <p className="font-bold tracking-wide uppercase text-xs">AI is analyzing...</p>
                      </div>
                    )}
                    {isStreaming && (
                      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px] flex flex-col items-center justify-center text-white space-y-3">
                        <div className="flex items-center gap-2">
                          <Radio size={20} className="text-emerald-400 animate-pulse" />
                          <span className="font-bold text-sm uppercase tracking-wider">Live Detection</span>
                        </div>
                        {progress && (
                          <div className="w-3/4 space-y-2">
                            <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-emerald-400 h-full rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(progress.percent, 100)}%` }}
                              />
                            </div>
                            <p className="text-xs text-white/70 text-center">
                              {progress.percent}% • Frame {progress.frame}/{progress.totalFrames}
                            </p>
                          </div>
                        )}
                        <p className="text-xs text-white/60">
                          {streamingPlates.length} plate{streamingPlates.length !== 1 ? 's' : ''} detected so far
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-gray-500">
                      {file.type.startsWith('image/') ? <ImageIcon size={16} /> : <Video size={16} />}
                      <span className="font-medium truncate max-w-[200px]">{file.name}</span>
                    </div>
                    <span className="text-gray-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Results Area */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm h-full flex flex-col">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Scan size={24} className="text-blue-600" />
              Detection Results
              {isStreaming && (
                <span className="ml-auto flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  LIVE
                </span>
              )}
            </h2>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium mb-4">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Empty state */}
            {!result && !isProcessing && !isStreaming && !error && streamingPlates.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-2xl flex items-center justify-center text-gray-400">
                  <Scan size={32} />
                </div>
                <p className="text-sm font-medium text-gray-500">Upload a file to see <br /> detection results</p>
              </div>
            )}

            {/* Image processing skeleton */}
            {isProcessing && !isStreaming && !isVideoFile && (
              <div className="flex-1 space-y-8">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2 animate-pulse">
                    <div className="h-3 w-24 bg-gray-100 rounded"></div>
                    <div className="h-8 w-full bg-gray-50 rounded-xl"></div>
                  </div>
                ))}
              </div>
            )}

            {/* Live streaming plates + final results */}
            {(streamingPlates.length > 0 || result) && (
              <div className="flex-1 space-y-6">
                {/* Plates list */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {isStreaming
                      ? `Detected Plates (${readablePlates.length} so far...)`
                      : `Detected Number Plates (${readablePlates.length})`}
                  </p>
                  {readablePlates.length === 0 && !isStreaming ? (
                    <div className="bg-gray-50 p-6 rounded-2xl text-center text-gray-400 text-sm">
                      No readable plates detected
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      <AnimatePresence>
                        {readablePlates.map((plate, idx) => (
                          <motion.div
                            key={plate.trackId ?? idx}
                            initial={{ opacity: 0, x: 20, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            className="bg-gray-900 text-white p-4 rounded-2xl flex items-center justify-between"
                          >
                            <span className="text-xl font-mono font-black tracking-wider">{plate.text}</span>
                            <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      {isStreaming && (
                        <div className="flex items-center justify-center gap-2 py-3 text-blue-500">
                          <Loader2 size={16} className="animate-spin" />
                          <span className="text-xs font-medium">Scanning for more plates...</span>
                        </div>
                      )}
                      <div ref={platesEndRef} />
                    </div>
                  )}
                </div>

                {/* Collection selector + actions (only after processing OR with streaming plates) */}
                {(hasFinished || (!isStreaming && streamingPlates.length > 0)) && (
                  <>
                    {/* Collection Selector */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Save to Collection</p>
                      <select
                        value={selectedCollection}
                        onChange={(e) => setSelectedCollection(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      >
                        <option value="">Select a collection</option>
                        {collections.map((col) => (
                          <option key={col._id} value={col._id}>{col.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-4 border-t border-gray-50 space-y-3 mt-auto">
                      {saved ? (
                        <div className="w-full py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-bold text-center flex items-center justify-center gap-2">
                          <CheckCircle2 size={20} />
                          Saved to logs!
                        </div>
                      ) : (
                        <button
                          onClick={handleAddToLogs}
                          disabled={saving || readablePlates.length === 0}
                          className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {saving ? <Loader2 size={20} className="animate-spin" /> : <Database size={20} />}
                          Add to Logs
                        </button>
                      )}
                      <button
                        onClick={handleDownload}
                        disabled={!result?.outputFileName}
                        className="w-full py-4 bg-gray-100 text-gray-900 rounded-2xl font-bold hover:bg-gray-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <Download size={20} />
                        Download Output
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;
