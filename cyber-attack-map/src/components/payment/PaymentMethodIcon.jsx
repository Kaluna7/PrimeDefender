/** Ikon metode pembayaran — badge warna brand (bukan logo resmi). */
export function PaymentMethodIcon({ icon, brandColor, className = '' }) {
  const base =
    'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[10px] font-black uppercase tracking-tight text-white';

  if (icon === 'shopeepay') {
    return (
      <span className={`${base} ${className}`} style={{ backgroundColor: brandColor || '#EE4D2D' }}>
        SP
      </span>
    );
  }
  if (icon === 'gopay') {
    return (
      <span className={`${base} ${className}`} style={{ backgroundColor: brandColor || '#00AED6' }}>
        GP
      </span>
    );
  }
  if (icon === 'qris') {
    return (
      <span
        className={`${base} bg-gradient-to-br from-red-600 to-red-700 ${className}`}
        aria-hidden
      >
        QR
      </span>
    );
  }
  if (icon === 'bca') {
    return (
      <span className={`${base} ${className}`} style={{ backgroundColor: brandColor || '#00529C' }}>
        BCA
      </span>
    );
  }
  if (icon === 'bni') {
    return (
      <span className={`${base} ${className}`} style={{ backgroundColor: brandColor || '#F15A22' }}>
        BNI
      </span>
    );
  }
  if (icon === 'bri') {
    return (
      <span className={`${base} ${className}`} style={{ backgroundColor: brandColor || '#00529C' }}>
        BRI
      </span>
    );
  }
  if (icon === 'mandiri') {
    return (
      <span className={`${base} ${className}`} style={{ backgroundColor: brandColor || '#003D79' }}>
        MD
      </span>
    );
  }
  if (icon === 'permata') {
    return (
      <span className={`${base} ${className}`} style={{ backgroundColor: brandColor || '#00A651' }}>
        PR
      </span>
    );
  }
  if (icon === 'cimb') {
    return (
      <span className={`${base} ${className}`} style={{ backgroundColor: brandColor || '#790008' }}>
        CIMB
      </span>
    );
  }
  if (icon === 'indomaret') {
    return (
      <span className={`${base} ${className}`} style={{ backgroundColor: brandColor || '#0054A6' }}>
        IDM
      </span>
    );
  }
  if (icon === 'alfamart') {
    return (
      <span className={`${base} ${className}`} style={{ backgroundColor: brandColor || '#ED1C24' }}>
        ALF
      </span>
    );
  }
  if (icon === 'card') {
    return (
      <span
        className={`${base} bg-gradient-to-br from-slate-800 to-slate-900 ${className}`}
        aria-hidden
      >
        💳
      </span>
    );
  }

  return (
    <span className={`${base} bg-slark-primary/80 ${className}`} aria-hidden>
      ••
    </span>
  );
}

export function CardBrandBadges({ badges = [] }) {
  if (!badges.length) return null;
  const styles = {
    visa: 'bg-[#1A1F71] text-white',
    mastercard: 'bg-[#EB001B] text-white',
    jcb: 'bg-[#0B4EA2] text-white',
    amex: 'bg-[#006FCF] text-white',
  };
  const labels = { visa: 'VISA', mastercard: 'MC', jcb: 'JCB', amex: 'AMEX' };

  return (
    <span className="mt-1 flex flex-wrap gap-1">
      {badges.map((b) => (
        <span
          key={b}
          className={`rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide ${styles[b] || 'bg-slark-muted text-white'}`}
        >
          {labels[b] || b}
        </span>
      ))}
    </span>
  );
}
