import './global.css';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'SkillBridge — Akıllı Test ve Değerlendirme Platformu',
  description: 'AI destekli test oluşturma ve değerlendirme platformu',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className="bg-[#F5F6FA] text-gray-900 antialiased select-text">
        {/* Gömülü önizlemede enjekte edilen koyu tema stillerini ezmek için kök sarmalayıcı */}
        <div
          className="min-h-screen w-full bg-[#F5F6FA] select-text"
          style={{
            backgroundColor: '#f5f6fa',
            userSelect: 'text',
            WebkitUserSelect: 'text',
          }}
        >
          {children}
        </div>
      </body>
    </html>
  );
}
