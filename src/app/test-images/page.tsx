'use client';

export default function TestImagesPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Image Test Page</h1>

      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-2">Pntar AI Icon</h2>
          <img
            src="/Pntar_AI_Icon.png"
            alt="Pntar AI Icon"
            className="w-16 h-16 border border-gray-300"
            onLoad={() => console.log('Pntar_AI_Icon.png loaded successfully')}
            onError={e => console.log('Pntar_AI_Icon.png failed to load:', e)}
          />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Pntar AI Logo</h2>
          <img
            src="/Pntar_AI_Logo.png"
            alt="Pntar AI Logo"
            className="w-32 h-16 border border-gray-300"
            onLoad={() => console.log('Pntar_AI_Logo.png loaded successfully')}
            onError={e => console.log('Pntar_AI_Logo.png failed to load:', e)}
          />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Pntar Mascot</h2>
          <img
            src="/PntarMascot.png"
            alt="Pntar Mascot"
            className="w-16 h-16 border border-gray-300"
            onLoad={() => console.log('PntarMascot.png loaded successfully')}
            onError={e => console.log('PntarMascot.png failed to load:', e)}
          />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Direct File Check</h2>
          <p className="text-sm text-gray-600 mb-2">
            Check these URLs in your browser:
          </p>
          <ul className="text-sm space-y-1">
            <li>
              <a
                href="/Pntar_AI_Icon.png"
                className="text-blue-500 hover:underline"
                target="_blank"
              >
                /Pntar_AI_Icon.png
              </a>
            </li>
            <li>
              <a
                href="/Pntar_AI_Logo.png"
                className="text-blue-500 hover:underline"
                target="_blank"
              >
                /Pntar_AI_Logo.png
              </a>
            </li>
            <li>
              <a
                href="/PntarMascot.png"
                className="text-blue-500 hover:underline"
                target="_blank"
              >
                /PntarMascot.png
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
