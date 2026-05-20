import { useState, useCallback, useRef } from 'react';
import { validateFile } from '../../lib/validators';
import { parseExcelFile } from '../../lib/excelParser';
import { startQuiz } from '../../stores/quizStore';
import { Button } from '../ui/Button';
import styles from './UploadZone.module.css';

type UploadStatus = 'idle' | 'dragging' | 'parsing' | 'error' | 'success';

export function UploadZone() {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setErrors([]);
    setWarnings([]);

    const fileCheck = validateFile(file);
    if (!fileCheck.valid) {
      setStatus('error');
      setErrors(fileCheck.errors);
      return;
    }

    setStatus('parsing');
    const result = await parseExcelFile(file);

    if (!result.success) {
      setStatus('error');
      setErrors(result.errors);
      return;
    }

    if (result.warnings.length) setWarnings(result.warnings);

    setStatus('success');
    setTimeout(() => {
      const title = file.name.replace(/\.(xlsx|xls)$/i, '');
      startQuiz(result.questions, title);
      window.location.href = '/quiz';
    }, 700);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (status !== 'parsing' && status !== 'success') setStatus('dragging');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (status === 'dragging') setStatus('idle');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (status === 'parsing' || status === 'success') return;
    setStatus('idle');
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const openPicker = () => inputRef.current?.click();

  const isClickable = status === 'idle' || status === 'error';

  return (
    <div className={styles.wrapper}>
      <div
        className={`${styles.zone} ${styles[status]}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={isClickable ? openPicker : undefined}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        aria-label="Zona de carga de archivos Excel"
        onKeyDown={isClickable ? (e) => e.key === 'Enter' && openPicker() : undefined}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          className={styles.hiddenInput}
          onChange={handleChange}
          tabIndex={-1}
          aria-hidden="true"
        />

        {status === 'idle' && (
          <div className={styles.content}>
            <div className={styles.iconWrap}>
              <svg className={styles.uploadIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.338-2.32 3.75 3.75 0 0 1 3.072 3.072c.018.175.028.352.028.531A3.75 3.75 0 0 1 17.25 15h-1.5" />
              </svg>
            </div>
            <h3 className={styles.title}>Arrastra tu archivo Excel aquí</h3>
            <p className={styles.subtitle}>o haz clic para seleccionarlo</p>
            <p className={styles.formats}>.xlsx · .xls · máximo 10 MB</p>
          </div>
        )}

        {status === 'dragging' && (
          <div className={styles.content}>
            <div className={`${styles.iconWrap} ${styles.bounce}`}>⬇️</div>
            <h3 className={styles.title}>Suelta el archivo</h3>
          </div>
        )}

        {status === 'parsing' && (
          <div className={styles.content}>
            <div className={styles.spinner} />
            <h3 className={styles.title}>Procesando archivo…</h3>
            <p className={styles.subtitle}>{fileName}</p>
          </div>
        )}

        {status === 'error' && (
          <div className={styles.content}>
            <div className={styles.iconWrap}>
              <svg className={`${styles.uploadIcon} ${styles.errorIcon}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <h3 className={styles.title}>Error en el archivo</h3>
            <p className={styles.subtitle}>{fileName}</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => { e.stopPropagation(); openPicker(); }}
            >
              Elegir otro archivo
            </Button>
          </div>
        )}

        {status === 'success' && (
          <div className={styles.content}>
            <div className={styles.iconWrap}>✅</div>
            <h3 className={styles.title}>¡Archivo cargado!</h3>
            <p className={styles.subtitle}>{fileName}</p>
            <p className={styles.formats}>Iniciando quiz…</p>
          </div>
        )}
      </div>

      {errors.length > 0 && (
        <ul className={styles.errorList} role="alert" aria-live="assertive">
          {errors.map((e, i) => (
            <li key={i} className={styles.errorItem}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {e}
            </li>
          ))}
        </ul>
      )}

      {warnings.length > 0 && (
        <ul className={styles.warningList}>
          {warnings.map((w, i) => (
            <li key={i} className={styles.warningItem}>⚠️ {w}</li>
          ))}
        </ul>
      )}

      <div className={styles.templateRow}>
        <span className={styles.templateText}>¿Primera vez?</span>
        <a href="/api/template" download className={styles.templateLink}>
          Descarga la plantilla de ejemplo
        </a>
      </div>
    </div>
  );
}
