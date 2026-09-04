import React, { useState, useMemo } from 'react';
import {
  X,
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  Download,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  RefreshCw,
  FolderTree,
  Check,
  Zap,
} from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Category, Subcategory, Service } from '../../types';
import { useToast } from '../../context/ToastContext';

interface BulkServiceImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  subcategories: Subcategory[];
  services: Service[];
  onImportComplete?: () => void;
}

export interface ParsedRow {
  id: string;
  rawCategory: string;
  rawSubcategory: string;
  name: string;
  price: number;
  minQty: number;
  maxQty: number;
  speed: string;
  description: string;
  isPopular: boolean;

  // Resolved matches
  categoryId: string;
  categoryName: string;
  subcategoryId: string;
  subcategoryName: string;

  // Suggestions
  suggestedCategory?: { id: string; name: string };
  suggestedSubcategory?: { id: string; name: string };

  // Status & Validation
  status: 'ready' | 'warning' | 'error' | 'duplicate';
  errors: string[];
  warnings: string[];
  isDuplicate: boolean;
  selected: boolean;
}

// Helper: Levenshtein distance for fuzzy matching suggestions
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0)
  );
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

function findClosestCandidate(
  target: string,
  candidates: { id: string; name: string }[]
): { id: string; name: string } | undefined {
  if (!target || candidates.length === 0) return undefined;
  const normTarget = target.trim().toLowerCase();

  let bestMatch: { id: string; name: string } | undefined = undefined;
  let minDistance = Infinity;

  for (const candidate of candidates) {
    const normCandidate = candidate.name.trim().toLowerCase();

    // Direct substring match
    if (
      normCandidate.includes(normTarget) ||
      normTarget.includes(normCandidate)
    ) {
      return candidate;
    }

    const dist = levenshteinDistance(normTarget, normCandidate);
    if (dist < minDistance) {
      minDistance = dist;
      bestMatch = candidate;
    }
  }

  if (bestMatch && (minDistance <= 4 || normTarget.length <= 3)) {
    return bestMatch;
  }
  return undefined;
}

// Parse CSV text safely handling quotes
function parseCSVText(text: string): Record<string, string>[] {
  const lines: string[] = [];
  let currentLine = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
      currentLine += char;
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (currentLine.trim().length > 0) {
        lines.push(currentLine);
      }
      currentLine = '';
      if (char === '\r' && text[i + 1] === '\n') {
        i++; // skip \n in \r\n
      }
    } else {
      currentLine += char;
    }
  }
  if (currentLine.trim().length > 0) {
    lines.push(currentLine);
  }

  if (lines.length < 2) return [];

  const splitRow = (row: string): string[] => {
    const result: string[] = [];
    let cell = '';
    let insideQuote = false;

    for (let i = 0; i < row.length; i++) {
      const c = row[i];
      if (c === '"') {
        insideQuote = !insideQuote;
      } else if (c === ',' && !insideQuote) {
        result.push(cell.trim().replace(/^"|"$/g, ''));
        cell = '';
      } else {
        cell += c;
      }
    }
    result.push(cell.trim().replace(/^"|"$/g, ''));
    return result;
  };

  const headers = splitRow(lines[0]).map((h) => h.toLowerCase().trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitRow(lines[i]);
    if (values.every((v) => !v)) continue;

    const rowObj: Record<string, string> = {};
    headers.forEach((header, index) => {
      rowObj[header] = values[index] || '';
    });
    rows.push(rowObj);
  }

  return rows;
}

export const BulkServiceImportModal: React.FC<BulkServiceImportModalProps> = ({
  isOpen,
  onClose,
  categories,
  subcategories,
  services,
  onImportComplete,
}) => {
  const { success, error: toastError } = useToast();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [importMethod, setImportMethod] = useState<'csv' | 'paste' | 'json'>(
    'csv'
  );
  const [pastedContent, setPastedContent] = useState('');
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  // Parsed and validated rows
  const [rows, setRows] = useState<ParsedRow[]>([]);

  // Import execution state
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importResults, setImportResults] = useState<{
    created: number;
    skipped: number;
    failed: number;
    details: { name: string; status: 'created' | 'skipped' | 'failed'; reason?: string }[];
  }>({ created: 0, skipped: 0, failed: 0, details: [] });

  // Handle template download
  const handleDownloadTemplate = () => {
    const templateHeader =
      'Category,Subcategory,Service Name,Price,Min Qty,Max Qty,Delivery Speed,Description,Most Popular\n';
    const sampleRows = [
      'Instagram,Instagram Views,IG Reel Views 500K,0.41,100,1000000,Fast 50K/Day,Super fast reel views,Yes',
      'Instagram,Instagram Followers,Instagram Followers HQ,42,50,100000,Fast,High quality followers,Yes',
      'Telegram,Telegram Channel Members,Telegram Members Non Drop,32,100,50000,Instant,Non drop members,No',
      'YouTube,YouTube Views,YouTube High Retention Views,95,100,50000,Fast,Lifetime guarantee,Yes',
    ].join('\n');

    const blob = new Blob([templateHeader + sampleRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'INSTAMART_Services_Import_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('Template downloaded!');
  };

  // Process and validate raw row items into ParsedRow structure
  const processRawItems = (rawObjects: Record<string, string>[]) => {
    const processed: ParsedRow[] = rawObjects.map((raw, idx) => {
      const getVal = (keys: string[]) => {
        for (const k of keys) {
          if (raw[k] !== undefined && raw[k] !== null) return raw[k].toString().trim();
        }
        return '';
      };

      const rawCategory = getVal(['category', 'parent category', 'category name', 'platform']);
      const rawSubcategory = getVal(['subcategory', 'parent subcategory', 'subcategory name']);
      const name = getVal(['service name', 'name', 'service', 'title']);
      const priceStr = getVal(['price', 'price (₹/1000)', 'priceper1000', 'rate']);
      const minStr = getVal(['min qty', 'min', 'minimum quantity', 'minimum']);
      const maxStr = getVal(['max qty', 'max', 'maximum quantity', 'maximum']);
      const speed = getVal(['delivery speed', 'speed', 'delivery', 'time']);
      const description = getVal(['description', 'desc', 'notes', 'details']);
      const popularStr = getVal(['most popular', 'popular', 'is popular', 'ispopular']);

      const price = parseFloat(priceStr) || 0;
      const minQty = parseInt(minStr, 10) || 100;
      const maxQty = parseInt(maxStr, 10) || 10000;
      const isPopular = ['yes', 'true', '1', 'y'].includes(popularStr.toLowerCase());

      const rowErrors: string[] = [];
      const rowWarnings: string[] = [];

      // Category matching (case-insensitive & trimmed)
      let foundCategory = categories.find(
        (c) => c.name.trim().toLowerCase() === rawCategory.toLowerCase()
      );
      let suggestedCategory: { id: string; name: string } | undefined = undefined;

      if (!foundCategory && rawCategory) {
        suggestedCategory = findClosestCandidate(
          rawCategory,
          categories.map((c) => ({ id: c.id, name: c.name }))
        );
      }

      if (!foundCategory) {
        if (suggestedCategory) {
          rowWarnings.push(
            `Category "${rawCategory}" not found. Suggested: "${suggestedCategory.name}"`
          );
        } else {
          rowErrors.push(`Category not found: "${rawCategory || 'Empty'}"`);
        }
      }

      // Subcategory matching under detected Category
      let foundSubcategory: Subcategory | undefined = undefined;
      let suggestedSubcategory: { id: string; name: string } | undefined = undefined;

      const activeCatId = foundCategory?.id || suggestedCategory?.id;

      if (activeCatId) {
        const catSubs = subcategories.filter((s) => s.categoryId === activeCatId);
        foundSubcategory = catSubs.find(
          (s) => s.name.trim().toLowerCase() === rawSubcategory.toLowerCase()
        );

        if (!foundSubcategory && rawSubcategory) {
          suggestedSubcategory = findClosestCandidate(
            rawSubcategory,
            catSubs.map((s) => ({ id: s.id, name: s.name }))
          );
        }

        if (!foundSubcategory) {
          if (suggestedSubcategory) {
            rowWarnings.push(
              `Subcategory "${rawSubcategory}" not found under ${
                foundCategory?.name || suggestedCategory?.name
              }. Suggested: "${suggestedSubcategory.name}"`
            );
          } else {
            rowErrors.push(
              `Subcategory not found under ${
                foundCategory?.name || suggestedCategory?.name || 'Category'
              }: "${rawSubcategory || 'Empty'}"`
            );
          }
        }
      } else {
        rowErrors.push(`Subcategory "${rawSubcategory}" requires a valid Category`);
      }

      // Validation checks
      if (!name) {
        rowErrors.push('Service Name is required');
      }

      if (isNaN(price) || price <= 0) {
        rowErrors.push('Price must be a valid positive number');
      }

      if (isNaN(minQty) || minQty <= 0) {
        rowErrors.push('Min Qty must be a valid number > 0');
      }

      if (isNaN(maxQty) || maxQty < minQty) {
        rowErrors.push('Max Qty must be greater than or equal to Min Qty');
      }

      // Duplicate detection against existing database
      const activeSubcatId = foundSubcategory?.id || suggestedSubcategory?.id;
      let isDuplicate = false;

      if (activeSubcatId && name) {
        isDuplicate = services.some(
          (s) =>
            s.subcategoryId === activeSubcatId &&
            s.name.trim().toLowerCase() === name.toLowerCase()
        );
      }

      if (isDuplicate) {
        rowWarnings.push('Duplicate service exists in database');
      }

      // Determine overall status
      let status: ParsedRow['status'] = 'ready';
      if (rowErrors.length > 0) {
        status = 'error';
      } else if (isDuplicate) {
        status = 'duplicate';
      } else if (rowWarnings.length > 0) {
        status = 'warning';
      }

      return {
        id: `row-${idx}-${Date.now()}`,
        rawCategory,
        rawSubcategory,
        name,
        price,
        minQty,
        maxQty,
        speed,
        description,
        isPopular,

        categoryId: foundCategory?.id || '',
        categoryName: foundCategory?.name || '',
        subcategoryId: foundSubcategory?.id || '',
        subcategoryName: foundSubcategory?.name || '',

        suggestedCategory,
        suggestedSubcategory,

        status,
        errors: rowErrors,
        warnings: rowWarnings,
        isDuplicate,
        selected: status !== 'error',
      };
    });

    setRows(processed);
    setStep(2);
  };

  // Handle CSV File Selection
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) {
        toastError('File is empty');
        return;
      }
      const rawObjs = parseCSVText(content);
      if (rawObjs.length === 0) {
        toastError('No valid rows found in CSV');
        return;
      }
      processRawItems(rawObjs);
    };
    reader.readAsText(file);
  };

  // Handle Textarea Paste (CSV or JSON)
  const handlePasteSubmit = () => {
    if (!pastedContent.trim()) {
      toastError('Please paste CSV or JSON data first');
      return;
    }

    const trimmed = pastedContent.trim();

    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      // JSON Mode
      try {
        const parsed = JSON.parse(trimmed);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        processRawItems(arr);
      } catch (err: any) {
        toastError('Invalid JSON format: ' + err.message);
      }
    } else {
      // CSV Mode
      const rawObjs = parseCSVText(trimmed);
      if (rawObjs.length === 0) {
        toastError('No valid CSV rows parsed');
        return;
      }
      processRawItems(rawObjs);
    }
  };

  // Apply auto-suggestion for a row
  const applySuggestion = (rowId: string) => {
    setRows((prevRows) =>
      prevRows.map((r) => {
        if (r.id !== rowId) return r;

        const newCatId = r.suggestedCategory?.id || r.categoryId;
        const newCatName = r.suggestedCategory?.name || r.categoryName;

        const catObj = categories.find((c) => c.id === newCatId);

        let newSubcatId = r.subcategoryId;
        let newSubcatName = r.subcategoryName;

        if (r.suggestedSubcategory) {
          newSubcatId = r.suggestedSubcategory.id;
          newSubcatName = r.suggestedSubcategory.name;
        } else if (newCatId) {
          const catSubs = subcategories.filter((s) => s.categoryId === newCatId);
          const matchedSub = catSubs.find(
            (s) => s.name.trim().toLowerCase() === r.rawSubcategory.trim().toLowerCase()
          );
          if (matchedSub) {
            newSubcatId = matchedSub.id;
            newSubcatName = matchedSub.name;
          }
        }

        // Re-evaluate errors
        const newErrors = r.errors.filter(
          (err) => !err.includes('Category not found') && !err.includes('Subcategory not found')
        );

        if (!newCatId) newErrors.push('Category required');
        if (!newSubcatId) newErrors.push('Subcategory required');

        const isDup = services.some(
          (s) => s.subcategoryId === newSubcatId && s.name.trim().toLowerCase() === r.name.toLowerCase()
        );

        let newStatus: ParsedRow['status'] = 'ready';
        if (newErrors.length > 0) newStatus = 'error';
        else if (isDup) newStatus = 'duplicate';

        return {
          ...r,
          categoryId: newCatId,
          categoryName: newCatName || catObj?.name || '',
          subcategoryId: newSubcatId,
          subcategoryName: newSubcatName,
          suggestedCategory: undefined,
          suggestedSubcategory: undefined,
          errors: newErrors,
          warnings: isDup ? ['Duplicate service exists in database'] : [],
          isDuplicate: isDup,
          status: newStatus,
          selected: newStatus !== 'error',
        };
      })
    );
  };

  // Manual Dropdown selection updates in Preview Table
  const updateRowCategory = (rowId: string, newCatId: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const catObj = categories.find((c) => c.id === newCatId);
        const catSubs = subcategories.filter((s) => s.categoryId === newCatId);
        const subObj = catSubs[0];

        const newErrors = r.errors.filter(
          (err) => !err.includes('Category not found') && !err.includes('Subcategory not found')
        );

        const isDup = subObj
          ? services.some(
              (s) => s.subcategoryId === subObj.id && s.name.trim().toLowerCase() === r.name.toLowerCase()
            )
          : false;

        let status: ParsedRow['status'] = 'ready';
        if (newErrors.length > 0) status = 'error';
        else if (isDup) status = 'duplicate';

        return {
          ...r,
          categoryId: newCatId,
          categoryName: catObj?.name || '',
          subcategoryId: subObj?.id || '',
          subcategoryName: subObj?.name || '',
          suggestedCategory: undefined,
          suggestedSubcategory: undefined,
          errors: newErrors,
          isDuplicate: isDup,
          status,
          selected: status !== 'error',
        };
      })
    );
  };

  const updateRowSubcategory = (rowId: string, newSubcatId: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const subObj = subcategories.find((s) => s.id === newSubcatId);
        const newErrors = r.errors.filter((err) => !err.includes('Subcategory not found'));

        const isDup = subObj
          ? services.some(
              (s) => s.subcategoryId === subObj.id && s.name.trim().toLowerCase() === r.name.toLowerCase()
            )
          : false;

        let status: ParsedRow['status'] = 'ready';
        if (newErrors.length > 0) status = 'error';
        else if (isDup) status = 'duplicate';

        return {
          ...r,
          subcategoryId: newSubcatId,
          subcategoryName: subObj?.name || '',
          suggestedSubcategory: undefined,
          errors: newErrors,
          isDuplicate: isDup,
          status,
          selected: status !== 'error',
        };
      })
    );
  };

  // Compute stats
  const stats = useMemo(() => {
    const total = rows.length;
    const ready = rows.filter((r) => r.status === 'ready').length;
    const warning = rows.filter((r) => r.status === 'warning').length;
    const errorCount = rows.filter((r) => r.status === 'error').length;
    const duplicates = rows.filter((r) => r.status === 'duplicate').length;
    const importable = rows.filter((r) => {
      if (r.status === 'error') return false;
      if (r.status === 'duplicate' && skipDuplicates) return false;
      return r.selected;
    }).length;

    return { total, ready, warning, errorCount, duplicates, importable };
  }, [rows, skipDuplicates]);

  // Execute Bulk Import to Firestore
  const executeImport = async () => {
    const rowsToImport = rows.filter((r) => {
      if (r.status === 'error') return false;
      if (r.status === 'duplicate' && skipDuplicates) return false;
      return r.selected;
    });

    if (rowsToImport.length === 0) {
      toastError('No valid rows selected for import');
      return;
    }

    setStep(3);
    setImporting(true);
    setImportProgress({ current: 0, total: rowsToImport.length });

    let createdCount = 0;
    let skippedCount = rows.length - rowsToImport.length;
    let failedCount = 0;
    const resultDetails: { name: string; status: 'created' | 'skipped' | 'failed'; reason?: string }[] = [];

    for (let i = 0; i < rowsToImport.length; i++) {
      const row = rowsToImport[i];
      setImportProgress({ current: i + 1, total: rowsToImport.length });

      try {
        const catObj = categories.find((c) => c.id === row.categoryId);
        const subcatObj = subcategories.find((s) => s.id === row.subcategoryId);

        // Firestore payload - strictly avoid undefined values
        await addDoc(collection(db, 'services'), {
          name: row.name.trim(),
          categoryId: row.categoryId,
          categoryName: catObj?.name || row.categoryName || '',
          subcategoryId: row.subcategoryId,
          subcategoryName: subcatObj?.name || row.subcategoryName || '',
          pricePer1000: Number(row.price),
          minimumQuantity: Number(row.minQty),
          maximumQuantity: Number(row.maxQty),
          speed: row.speed ? row.speed.trim() : 'Fast',
          description: row.description ? row.description.trim() : '',
          isPopular: !!row.isPopular,
          icon: 'Zap',
          sortOrder: services.length + i + 1,
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        createdCount++;
        resultDetails.push({ name: row.name, status: 'created' });
      } catch (err: any) {
        failedCount++;
        resultDetails.push({ name: row.name, status: 'failed', reason: err.message || 'Write error' });
      }
    }

    setImportResults({
      created: createdCount,
      skipped: skippedCount,
      failed: failedCount,
      details: resultDetails,
    });

    setImporting(false);
    setStep(4);
    if (onImportComplete) onImportComplete();
    success(`Successfully imported ${createdCount} services!`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base sm:text-lg">Bulk Add Services</h3>
              <p className="text-xs text-slate-400">Import 100+ services via CSV or JSON in seconds</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workflow Steps Indicator */}
        <div className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] font-bold text-center shrink-0">
          <div
            className={`py-1.5 rounded-xl transition ${
              step === 1 ? 'bg-purple-600 text-white shadow' : 'text-slate-500'
            }`}
          >
            1. Input Data
          </div>
          <div
            className={`py-1.5 rounded-xl transition ${
              step === 2 ? 'bg-purple-600 text-white shadow' : 'text-slate-500'
            }`}
          >
            2. Preview & Validate
          </div>
          <div
            className={`py-1.5 rounded-xl transition ${
              step === 3 ? 'bg-purple-600 text-white shadow' : 'text-slate-500'
            }`}
          >
            3. Import Progress
          </div>
          <div
            className={`py-1.5 rounded-xl transition ${
              step === 4 ? 'bg-purple-600 text-white shadow' : 'text-slate-500'
            }`}
          >
            4. Results
          </div>
        </div>

        {/* STEP 1: INPUT DATA */}
        {step === 1 && (
          <div className="space-y-4 overflow-y-auto pr-1 flex-1">
            {/* Method Switcher */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setImportMethod('csv')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    importMethod === 'csv'
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  CSV File Upload
                </button>
                <button
                  type="button"
                  onClick={() => setImportMethod('paste')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    importMethod === 'paste'
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Paste CSV / Text
                </button>
                <button
                  type="button"
                  onClick={() => setImportMethod('json')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    importMethod === 'json'
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  JSON Mode
                </button>
              </div>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs transition border border-amber-500/20 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download CSV Template</span>
              </button>
            </div>

            {/* CSV File Upload Option */}
            {importMethod === 'csv' && (
              <div className="p-8 rounded-2xl bg-slate-950 border-2 border-dashed border-slate-800 hover:border-purple-500/50 transition text-center space-y-3 cursor-pointer group">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto group-hover:scale-105 transition">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <label htmlFor="csv-file-input" className="cursor-pointer">
                    <span className="font-extrabold text-sm text-purple-400 hover:underline">
                      Click to browse
                    </span>{' '}
                    <span className="text-slate-400 text-sm">or drag and drop your .csv file here</span>
                    <input
                      id="csv-file-input"
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                  Supports standard column format: Category, Subcategory, Service Name, Price, Min Qty, Max Qty, Delivery Speed, Description, Most Popular
                </p>
              </div>
            )}

            {/* Paste CSV / JSON Textarea */}
            {(importMethod === 'paste' || importMethod === 'json') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-slate-300">
                    {importMethod === 'json' ? 'Paste JSON Array' : 'Paste CSV Content'}
                  </label>
                  <span className="text-[11px] text-slate-500">
                    {importMethod === 'json' ? 'Format: [{ "category": "...", ... }]' : 'First row must contain column headers'}
                  </span>
                </div>
                <textarea
                  rows={10}
                  value={pastedContent}
                  onChange={(e) => setPastedContent(e.target.value)}
                  placeholder={
                    importMethod === 'json'
                      ? `[\n  {\n    "category": "Instagram",\n    "subcategory": "Instagram Views",\n    "name": "IG Reel Views 500K",\n    "price": 0.41,\n    "min": 100,\n    "max": 1000000,\n    "speed": "Fast 50K/Day",\n    "description": "Super fast reel views",\n    "isPopular": true\n  }\n]`
                      : `Category,Subcategory,Service Name,Price,Min Qty,Max Qty,Delivery Speed,Description,Most Popular\nInstagram,Instagram Views,IG Reel Views 500K,0.41,100,1000000,Fast 50K/Day,Super fast reel views,Yes\nInstagram,Instagram Followers,Instagram Followers HQ,42,50,100000,Fast,High quality followers,Yes\nTelegram,Telegram Channel Members,Telegram Members Non Drop,32,100,50000,Instant,Non drop members,No`
                  }
                  className="w-full p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-white font-mono text-xs placeholder-slate-600 focus:outline-none focus:border-purple-500"
                />
                <button
                  type="button"
                  onClick={handlePasteSubmit}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Parse & Preview Data</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Expected Format Documentation Box */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
              <h5 className="font-extrabold text-slate-300 flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" />
                <span>Required CSV Columns Guidance</span>
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400">
                <div>
                  <span className="font-bold text-slate-200">Category:</span> Platform name (e.g. Instagram, Telegram, YouTube)
                </div>
                <div>
                  <span className="font-bold text-slate-200">Subcategory:</span> Subcategory name (e.g. Instagram Views)
                </div>
                <div>
                  <span className="font-bold text-slate-200">Service Name:</span> Service title
                </div>
                <div>
                  <span className="font-bold text-slate-200">Price:</span> Price in INR per 1,000 units (e.g. 0.41, 42)
                </div>
                <div>
                  <span className="font-bold text-slate-200">Min Qty / Max Qty:</span> Numeric limits (e.g. 100, 100000)
                </div>
                <div>
                  <span className="font-bold text-slate-200">Most Popular:</span> Yes / No
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: PREVIEW & VALIDATE */}
        {step === 2 && (
          <div className="space-y-4 overflow-hidden flex flex-col flex-1">
            {/* Stats Summary Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 shrink-0">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="block text-[10px] text-slate-500 uppercase font-extrabold">Total Parsed</span>
                <span className="text-base font-extrabold text-white">{stats.total}</span>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="block text-[10px] text-emerald-400 uppercase font-extrabold">Ready</span>
                <span className="text-base font-extrabold text-emerald-300">{stats.ready}</span>
              </div>
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <span className="block text-[10px] text-amber-400 uppercase font-extrabold">Warnings / Suggestions</span>
                <span className="text-base font-extrabold text-amber-300">{stats.warning}</span>
              </div>
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <span className="block text-[10px] text-rose-400 uppercase font-extrabold">Errors</span>
                <span className="text-base font-extrabold text-rose-300">{stats.errorCount}</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80">
                <span className="block text-[10px] text-slate-400 uppercase font-extrabold">Duplicates</span>
                <span className="text-base font-extrabold text-slate-300">{stats.duplicates}</span>
              </div>
            </div>

            {/* Options Bar */}
            <div className="flex items-center justify-between gap-3 text-xs shrink-0 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <label className="flex items-center gap-2 text-slate-300 font-semibold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                  className="w-4 h-4 rounded accent-purple-600"
                />
                <span>Automatically skip duplicates found in database</span>
              </label>

              <span className="text-[11px] text-purple-400 font-bold">
                {stats.importable} Services Ready to Import
              </span>
            </div>

            {/* Detailed Preview Table */}
            <div className="flex-1 overflow-y-auto border border-slate-800 rounded-2xl bg-slate-950 p-2 space-y-2">
              {rows.length === 0 ? (
                <div className="text-center p-8 text-slate-500">No data parsed</div>
              ) : (
                rows.map((row, idx) => {
                  const activeCat = categories.find((c) => c.id === row.categoryId);
                  const availableSubs = categories.find((c) => c.id === row.categoryId)
                    ? subcategories.filter((s) => s.categoryId === row.categoryId)
                    : subcategories;

                  return (
                    <div
                      key={row.id}
                      className={`p-3 rounded-xl border transition space-y-2 text-xs ${
                        row.status === 'error'
                          ? 'bg-rose-500/5 border-rose-500/30'
                          : row.status === 'duplicate'
                          ? 'bg-slate-900 border-slate-800 opacity-80'
                          : row.status === 'warning'
                          ? 'bg-amber-500/5 border-amber-500/30'
                          : 'bg-slate-900/80 border-slate-800'
                      }`}
                    >
                      {/* Row Top Status Header */}
                      <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-800/60">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-slate-500 font-bold">#{idx + 1}</span>

                          {row.status === 'ready' && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Ready
                            </span>
                          )}

                          {row.status === 'warning' && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[10px] font-bold border border-amber-500/30 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Warning / Suggestion
                            </span>
                          )}

                          {row.status === 'duplicate' && (
                            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold border border-slate-700 flex items-center gap-1">
                              <Copy className="w-3 h-3" /> Duplicate (Existing)
                            </span>
                          )}

                          {row.status === 'error' && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 text-[10px] font-bold border border-rose-500/30 flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> Error
                            </span>
                          )}

                          <h5 className="font-bold text-white text-xs">{row.name || 'Unnamed Service'}</h5>
                        </div>

                        <div className="flex items-center gap-3 font-mono text-[11px] text-emerald-400 font-bold">
                          <span>₹{row.price}/1000</span>
                          <span className="text-slate-500">
                            (Min: {row.minQty} - Max: {row.maxQty})
                          </span>
                        </div>
                      </div>

                      {/* Category & Subcategory Selectors / Info */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {/* Parent Category Field */}
                        <div>
                          <label className="block text-[10px] text-slate-400 font-bold uppercase mb-0.5">
                            Parent Category
                          </label>
                          <select
                            value={row.categoryId}
                            onChange={(e) => updateRowCategory(row.id, e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-medium focus:border-purple-500"
                          >
                            <option value="">-- Select Category --</option>
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                          {row.suggestedCategory && !row.categoryId && (
                            <div className="mt-1 flex items-center justify-between text-[10px] bg-amber-500/10 border border-amber-500/20 p-1.5 rounded-lg text-amber-300">
                              <span>Did you mean: <strong>{row.suggestedCategory.name}</strong>?</span>
                              <button
                                type="button"
                                onClick={() => applySuggestion(row.id)}
                                className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition cursor-pointer"
                              >
                                Use Suggestion
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Parent Subcategory Field */}
                        <div>
                          <label className="block text-[10px] text-slate-400 font-bold uppercase mb-0.5">
                            Parent Subcategory
                          </label>
                          <select
                            value={row.subcategoryId}
                            onChange={(e) => updateRowSubcategory(row.id, e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-medium focus:border-purple-500"
                          >
                            <option value="">-- Select Subcategory --</option>
                            {availableSubs.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                          {row.suggestedSubcategory && !row.subcategoryId && (
                            <div className="mt-1 flex items-center justify-between text-[10px] bg-amber-500/10 border border-amber-500/20 p-1.5 rounded-lg text-amber-300">
                              <span>Did you mean: <strong>{row.suggestedSubcategory.name}</strong>?</span>
                              <button
                                type="button"
                                onClick={() => applySuggestion(row.id)}
                                className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition cursor-pointer"
                              >
                                Use Suggestion
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Validation Messages / Reasons */}
                      {(row.errors.length > 0 || row.warnings.length > 0) && (
                        <div className="space-y-1 text-[11px] pt-1">
                          {row.errors.map((err, i) => (
                            <div key={i} className="text-rose-400 flex items-center gap-1 font-semibold">
                              <span>•</span>
                              <span>{err}</span>
                            </div>
                          ))}
                          {row.warnings.map((warn, i) => (
                            <div key={i} className="text-amber-300 flex items-center gap-1 font-medium">
                              <span>•</span>
                              <span>{warn}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Step Controls */}
            <div className="flex items-center justify-between pt-2 shrink-0">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Edit Data</span>
              </button>

              <button
                type="button"
                disabled={stats.importable === 0}
                onClick={executeImport}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-extrabold text-xs transition shadow-lg shadow-purple-900/30 cursor-pointer disabled:cursor-not-allowed"
              >
                <span>Import {stats.importable} Services</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: IMPORT PROGRESS */}
        {step === 3 && (
          <div className="p-8 text-center space-y-4 my-auto">
            <div className="w-16 h-16 rounded-full bg-purple-600/20 border border-purple-500/30 text-purple-400 flex items-center justify-center mx-auto animate-spin">
              <RefreshCw className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-extrabold text-white text-lg">Importing Services into Database...</h4>
              <p className="text-xs text-slate-400 mt-1">
                Processing {importProgress.current} of {importProgress.total} items
              </p>
            </div>
            <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800 max-w-md mx-auto">
              <div
                className="bg-purple-600 h-full transition-all duration-300 rounded-full"
                style={{
                  width: `${
                    importProgress.total ? (importProgress.current / importProgress.total) * 100 : 0
                  }%`,
                }}
              />
            </div>
          </div>
        )}

        {/* STEP 4: RESULTS */}
        {step === 4 && (
          <div className="space-y-4 overflow-hidden flex flex-col flex-1">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-1">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <h4 className="font-extrabold text-emerald-300 text-base">Bulk Import Complete!</h4>
              <p className="text-xs text-emerald-400/80">
                Created: <strong>{importResults.created}</strong> | Skipped: <strong>{importResults.skipped}</strong> | Failed: <strong>{importResults.failed}</strong>
              </p>
            </div>

            {/* Results Details List */}
            <div className="flex-1 overflow-y-auto border border-slate-800 rounded-2xl bg-slate-950 p-3 space-y-2">
              <h5 className="font-extrabold text-xs text-slate-300">Import Log Details</h5>
              {importResults.details.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs"
                >
                  <span className="font-bold text-white">{item.name}</span>
                  {item.status === 'created' && (
                    <span className="text-emerald-400 font-bold text-[11px]">✓ Created</span>
                  )}
                  {item.status === 'skipped' && (
                    <span className="text-slate-500 font-bold text-[11px]">Skipped</span>
                  )}
                  {item.status === 'failed' && (
                    <span className="text-rose-400 font-bold text-[11px]">Failed: {item.reason}</span>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs transition shadow-lg shadow-purple-900/30 cursor-pointer shrink-0"
            >
              Done & Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
