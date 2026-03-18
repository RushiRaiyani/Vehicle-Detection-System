import React from 'react';
import { 
  Code2, 
  Database, 
  Cpu, 
  Layers, 
  CheckCircle2, 
  ArrowRight,
  Monitor,
  Server,
  BrainCircuit
} from 'lucide-react';

const TechSection = ({ title, items, icon: Icon }) => (
  <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
        <Icon size={20} />
      </div>
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
    </div>
    <div className="flex flex-wrap gap-2">
      {items.map((item, idx) => (
        <span key={idx} className="px-4 py-2 bg-gray-50 text-gray-700 rounded-xl text-sm font-semibold border border-gray-100">
          {item}
        </span>
      ))}
    </div>
  </div>
);

const About = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-16 pb-20">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-black text-gray-900">Technology Stack</h1>
        <p className="text-gray-500 max-w-2xl mx-auto text-lg leading-relaxed">
          AutoLog AI is built using cutting-edge technologies to ensure high performance, 
          scalability, and industry-leading detection accuracy.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <TechSection 
          title="Frontend" 
          icon={Monitor}
          items={['React.js', 'Tailwind CSS', 'React Router', 'Lucide Icons', 'Motion']} 
        />
        <TechSection 
          title="Backend" 
          icon={Server}
          items={['Node.js', 'Express.js', 'JWT Auth', 'REST API']} 
        />
        <TechSection 
          title="Database" 
          icon={Database}
          items={['MongoDB', 'Redis (Caching)', 'GridFS (Storage)']} 
        />
        <TechSection 
          title="AI & ML" 
          icon={BrainCircuit}
          items={['YOLOv8', 'EasyOCR', 'Python', 'PyTorch', 'OpenCV']} 
        />
      </div>

      <div className="bg-gray-900 text-white p-12 rounded-[40px] space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-6">
            <h2 className="text-3xl font-bold">AI Model & Dataset</h2>
            <p className="text-gray-400 leading-relaxed">
              Our core detection engine is based on the <strong>YOLO (You Only Look Once)</strong> architecture, 
              specifically optimized for license plate localization in complex environments.
            </p>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="text-blue-400 mt-1" size={20} />
                <p className="text-sm text-gray-300">Trained on <strong>1,500+ high-quality images</strong> of Indian number plates.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="text-blue-400 mt-1" size={20} />
                <p className="text-sm text-gray-300">Robust performance across various lighting conditions and weather.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="text-blue-400 mt-1" size={20} />
                <p className="text-sm text-gray-300">Supports cars, bikes, and commercial heavy vehicles.</p>
              </div>
            </div>
          </div>
          <div className="bg-white/5 p-8 rounded-3xl border border-white/10 space-y-8">
            <h3 className="text-xl font-bold">The AI Pipeline</h3>
            <div className="space-y-4">
              {[
                { step: '01', label: 'Image or Video Input', desc: 'Raw visual data from security cameras or uploads.' },
                { step: '02', label: 'YOLO Detection', desc: 'Localization of the license plate within the frame.' },
                { step: '03', label: 'License Plate Cropping', desc: 'Extracting the high-res region of interest.' },
                { step: '04', label: 'EasyOCR Text Extraction', desc: 'Converting visual characters into digital text.' },
                { step: '05', label: 'Vehicle Log Creation', desc: 'Storing data with timestamps in the database.' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <span className="text-blue-400 font-mono font-bold">{item.step}</span>
                  <div>
                    <p className="font-bold text-sm">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
