import { useState } from 'react';

export function FileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [stagingData, setStagingData] = useState<any[]>([]);
  const [approveStatus, setApproveStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [approveMessage, setApproveMessage] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setStatus('idle');
      setMessage('');
      setStagingData([]);
    }
  };

  const fetchStagingData = async () => {
    try {
      const res = await fetch('http://localhost:8080/api/upload/staging');
      const data = await res.json();
      setStagingData(data);
    } catch (error) {
      console.error("Failed to fetch staging data");
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setStatus('uploading');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8080/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message);
        fetchStagingData();
      } else {
        setStatus('error');
        setMessage(data.error || 'Upload failed');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Network error occurred');
    }
  };

  const handleApprove = async () => {
    setApproveStatus('loading');
    try {
      const response = await fetch('http://localhost:8080/api/upload/approve', {
        method: 'POST',
      });
      const data = await response.json();
      
      if (response.ok) {
        setApproveStatus('success');
        setApproveMessage(data.message);
        setStagingData([]);
      } else {
        setApproveStatus('error');
        setApproveMessage(data.message || data.error || 'Approval failed');
      }
    } catch (error) {
      setApproveStatus('error');
      setApproveMessage('Network error occurred');
    }
  };

  return (
    <div className="mx-auto max-w-2xl rounded-xl border bg-card p-6 shadow-sm my-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Import Invoices</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a CSV file to stage your invoices for review.
        </p>
      </div>

      {/* Upload Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <input 
            type="file" 
            accept=".csv" 
            onChange={handleFileChange} 
            className="block w-full text-sm text-slate-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-primary file:text-primary-foreground
              hover:file:bg-primary/90 cursor-pointer"
          />
          <button 
            onClick={handleUpload} 
            disabled={!file || status === 'uploading'}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            {status === 'uploading' ? 'Uploading...' : 'Upload'}
          </button>
        </div>

        {status === 'success' && <p className="text-sm font-medium text-green-600 bg-green-50 p-3 rounded-md">{message}</p>}
        {status === 'error' && <p className="text-sm font-medium text-red-600 bg-red-50 p-3 rounded-md">{message}</p>}
      </div>

      {/* Preview Table */}
      {stagingData.length > 0 && (
        <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Review Data ({stagingData.length} rows)</h3>
            <button 
              onClick={handleApprove} 
              disabled={approveStatus === 'loading'}
              className="inline-flex items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-green-700 disabled:pointer-events-none disabled:opacity-50"
            >
              {approveStatus === 'loading' ? 'Approving...' : 'Approve All'}
            </button>
          </div>
          
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Invoice #</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stagingData.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-medium">{row.invoiceNumber}</td>
                    <td className="px-4 py-3">${row.amount.toFixed(2)}</td>
                    <td className="px-4 py-3">{new Date(row.date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {approveStatus === 'success' && <p className="text-sm font-medium text-green-600 mt-4">{approveMessage}</p>}
          {approveStatus === 'error' && <p className="text-sm font-medium text-red-600 mt-4">{approveMessage}</p>}
        </div>
      )}
    </div>
  );
}