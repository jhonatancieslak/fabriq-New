// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

export default function ComingSoon({ label }: { label: string }) {
  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      color: '#6B7280', gap: 8,
    }}>
      <h3 style={{ margin: 0, color: '#374151', textTransform: 'none', fontSize: 16 }}>{label}</h3>
      <p style={{ margin: 0, fontSize: 13 }}>Módulo em breve nesta versão do desktop.</p>
    </div>
  );
}
