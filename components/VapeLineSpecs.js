import { getVapeLineSpecs } from '../lib/vapeCatalog';

export default function VapeLineSpecs({ vapeLine, className = '' }) {
  const specs = getVapeLineSpecs(vapeLine);
  if (specs.length === 0) return null;

  return (
    <ul className={['vape-line-specs', className].filter(Boolean).join(' ')}>
      {specs.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
