import React, { useState } from 'react';
import { Upload, FileText, AlertCircle, Loader } from 'lucide-react';

interface DiagnosisResult {
  primaryDiagnosis: string;
  confidenceLevel: number;
  additionalFindings: string[];
  recommendedActions: string;
  aiAnalysis: string;
}

const Alert: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
    <span className="block sm:inline">{children}</span>
  </div>
);

const ImageAnalysisPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const mockResults: DiagnosisResult[] = [
    {
      primaryDiagnosis: 'No acute cardiopulmonary abnormality',
      confidenceLevel: 93,
      additionalFindings: ['Clear lung fields', 'Normal heart size'],
      recommendedActions: 'Routine follow-up as needed.',
      aiAnalysis: 'The image suggests a stable chest condition with no acute findings.'
    },
    {
      primaryDiagnosis: 'Mild bronchitis pattern',
      confidenceLevel: 81,
      additionalFindings: ['Peribronchial thickening', 'No focal consolidation'],
      recommendedActions: 'Clinical correlation and symptomatic treatment.',
      aiAnalysis: 'There is mild airway inflammation without severe complication.'
    },
    {
      primaryDiagnosis: 'Possible early pneumonia',
      confidenceLevel: 76,
      additionalFindings: ['Patchy right lower lobe opacity', 'No pleural effusion'],
      recommendedActions: 'Recommend physician review and repeat imaging if symptoms persist.',
      aiAnalysis: 'Subtle opacity may represent early infectious change.'
    },
    {
      primaryDiagnosis: 'Hyperinflation suggestive of COPD changes',
      confidenceLevel: 79,
      additionalFindings: ['Flattened diaphragms', 'Increased lucency'],
      recommendedActions: 'Pulmonary function testing and specialist consultation.',
      aiAnalysis: 'Chronic obstructive pattern is likely and should be clinically confirmed.'
    },
    {
      primaryDiagnosis: 'Mild pleural effusion (left)',
      confidenceLevel: 74,
      additionalFindings: ['Blunted left costophrenic angle', 'No tension features'],
      recommendedActions: 'Monitor symptoms and evaluate fluid etiology.',
      aiAnalysis: 'Small pleural fluid collection is visible on the left side.'
    },
    {
      primaryDiagnosis: 'Cardiomegaly',
      confidenceLevel: 84,
      additionalFindings: ['Enlarged cardiac silhouette', 'No frank edema'],
      recommendedActions: 'Cardiac evaluation and echocardiogram consideration.',
      aiAnalysis: 'Heart size appears increased relative to thoracic dimensions.'
    },
    {
      primaryDiagnosis: 'Healed rib fracture changes',
      confidenceLevel: 88,
      additionalFindings: ['Callus formation on lateral rib', 'No acute fracture line'],
      recommendedActions: 'No emergency intervention needed; pain management if required.',
      aiAnalysis: 'Findings are consistent with prior trauma healing.'
    },
    {
      primaryDiagnosis: 'Mild scoliosis of thoracic spine',
      confidenceLevel: 86,
      additionalFindings: ['Rightward thoracic curvature', 'No acute osseous lesion'],
      recommendedActions: 'Orthopedic follow-up if symptomatic.',
      aiAnalysis: 'Spinal alignment shows mild curvature without acute bony injury.'
    },
    {
      primaryDiagnosis: 'Pulmonary nodule (indeterminate)',
      confidenceLevel: 72,
      additionalFindings: ['Small round opacity in upper zone', 'No cavitation'],
      recommendedActions: 'CT chest recommended for further characterization.',
      aiAnalysis: 'A small indeterminate opacity is present and needs follow-up imaging.'
    },
    {
      primaryDiagnosis: 'Normal postoperative chest appearance',
      confidenceLevel: 82,
      additionalFindings: ['Expected post-surgical clips', 'No acute complication seen'],
      recommendedActions: 'Continue planned postoperative follow-up.',
      aiAnalysis: 'Postoperative findings appear expected with no urgent issue.'
    }
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (uploadedFile) setFile(uploadedFile);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    if (!file) {
      setError('Please select a file first.');
      setLoading(false);
      return;
    }

    const indexSeed = file.name
      .split('')
      .reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const selected = mockResults[indexSeed % mockResults.length];

    setTimeout(() => {
      setResult(selected);
      setLoading(false);
    }, 700);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-blue-800 mb-8 text-center">Image and PDF Analysis</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold text-blue-700 mb-4">Upload an Image or PDF for Analysis</h2>
          
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-blue-300 rounded-lg p-6 hover:border-blue-500 transition duration-300 mb-6">
            <Upload className="w-12 h-12 text-blue-500 mb-2" />
            <p className="text-blue-700 font-semibold mb-2">Upload Image or PDF</p>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="bg-blue-500 text-white py-2 px-4 rounded-full hover:bg-blue-600 transition duration-300 cursor-pointer"
            >
              Select File
            </label>
            {file && <p className="mt-2 text-sm text-gray-600">{file.name}</p>}
          </div>
          
          <button
            onClick={handleSubmit}
            disabled={!file || loading}
            className={`w-full py-3 rounded-full text-white font-semibold ${
              !file || loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600'
            } transition duration-300`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <Loader className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                Analyzing...
              </span>
            ) : 'Analyze File'}
          </button>
        </div>

        {error && (
          <Alert>
            <AlertCircle className="h-4 w-4 inline mr-2" />
            {error}
          </Alert>
        )}

        {result && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-blue-700 mb-4">Analysis Results</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-blue-600">Primary Diagnosis:</h3>
                <p className="text-gray-800">{result.primaryDiagnosis}</p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-blue-600">Confidence Level:</h3>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4 dark:bg-gray-700">
                  <div className="bg-blue-600 h-2.5 rounded-full" style={{width: `${result.confidenceLevel}%`}}></div>
                </div>
                <p className="text-gray-800">{result.confidenceLevel}% confidence</p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-blue-600">Additional Findings:</h3>
                <ul className="list-disc list-inside text-gray-800">
                  {result.additionalFindings.map((finding, index) => (
                    <li key={index}>{finding}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-medium text-blue-600">Recommended Actions:</h3>
                <p className="text-gray-800">{result.recommendedActions}</p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-blue-600">Detailed AI Analysis:</h3>
                <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                  {result.aiAnalysis}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageAnalysisPage;