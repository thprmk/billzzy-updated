'use client';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

export default function TaxSettingsForm() {
  const [name, setName] = useState('GST');
  const [type, setType] = useState<'Percentage' | 'Fixed'>('Percentage');
  const [value, setValue] = useState<number>(0);
  const [autoApply, setAutoApply] = useState<boolean>(false);

  useEffect(() => {
    // Load existing tax settings
    fetch('/api/settings/tax')
      .then(res => res.json())
      .then(data => {
        if (data.tax) {
          setName(data.tax.name);
          setType(data.tax.type);
          setValue(data.tax.value);
          setAutoApply(data.tax.autoApply);
        }
      });
  }, []);

  const handleSave = async () => {
    try {
      const res = await fetch('/api/settings/tax', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, value, autoApply }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');

      toast.success('Tax settings saved successfully');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Tax Settings</h2>

      <label className="block">
        <span className="text-gray-700">Tax Type</span>
        <select
          className="block w-full mt-1"
          value={type}
          onChange={(e) => setType(e.target.value as 'Percentage' | 'Fixed')}
        >
          <option value="Percentage">Percentage</option>
          <option value="Fixed">Fixed</option>
        </select>
      </label>

      <label className="block">
        <span className="text-gray-700">Tax Value</span>
        <input
          type="number"
          step="0.01"
          value={value}
          onChange={(e) => setValue(parseFloat(e.target.value))}
          className="block w-full mt-1 border px-2 py-1"
        />
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={autoApply}
          onChange={(e) => setAutoApply(e.target.checked)}
        />
        <span>Auto Apply Tax</span>
      </label>

      <button
        onClick={handleSave}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Save
      </button>
    </div>
  );
}
