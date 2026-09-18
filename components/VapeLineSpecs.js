import { getVapeLineSpecs } from '../lib/vapeCatalog';

export default function VapeLineSpecs({ vapeLine, specs, className = '' }) {
  const resolvedSpecs = specs ?? getVapeLineSpecs(vapeLine);
  if (!resolvedSpecs || resolvedSpecs.length === 0) return null;

  return (
    <ul className={['vape-line-specs', className].filter(Boolean).join(' ')}>
      {resolvedSpecs.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
